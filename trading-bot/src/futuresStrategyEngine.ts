import { config } from "./config.js";
import { getFuturesCandles, getFuturesPrice, getOpenPosition, getRecentOrders, getUserTrades } from "./binanceFuturesClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleFuturesBuy, handleFuturesShort, handleFuturesSell, log } from "./futuresTradeActions.js";
import { getPositionMeta, clearPositionMeta } from "./futuresStopOrderStore.js";
import { appendTradeHistory } from "./futuresTradeHistoryStore.js";
import { RiskRejection } from "./riskManager.js";
import type { FuturesCloseReason } from "./types.js";

/**
 * Bizim actigimiz bir pozisyon, bizim kodumuz cagirilmadan (stop-loss
 * tetiklenerek ya da likidasyonla) kapanmis olabilir. Boyle bir durumu
 * tespit edip islem gecmisine dogru sekilde (STOP_LOSS ya da LIQUIDATION
 * olarak) kaydeder.
 */
async function reconcileExternalClose(symbol: string): Promise<void> {
  const meta = getPositionMeta(symbol);
  if (!meta) return;

  const position = await getOpenPosition(symbol);
  if (position) return; // hala acik, yapacak bir sey yok

  clearPositionMeta(symbol);

  try {
    const orders = await getRecentOrders(symbol, 5);
    const lastFilled = [...orders].reverse().find((o: any) => o.status === "FILLED");
    const reason: FuturesCloseReason = lastFilled?.origType === "LIQUIDATION" ? "LIQUIDATION" : "STOP_LOSS";

    const trades = await getUserTrades(symbol, 5);
    const relevantTrades = lastFilled ? trades.filter((t: any) => t.orderId === lastFilled.orderId) : trades;
    const realizedPnl = relevantTrades.reduce((sum: number, t: any) => sum + Number(t.realizedPnl), 0);
    const totalQty = relevantTrades.reduce((sum: number, t: any) => sum + Number(t.qty), 0);
    const exitPrice =
      totalQty > 0
        ? relevantTrades.reduce((sum: number, t: any) => sum + Number(t.price) * Number(t.qty), 0) / totalQty
        : meta.entryPrice;

    const pnlPercent = ((exitPrice - meta.entryPrice) / meta.entryPrice) * 100 * (meta.direction === "LONG" ? 1 : -1);

    appendTradeHistory({
      symbol,
      direction: meta.direction,
      entryPrice: meta.entryPrice,
      exitPrice,
      quantity: meta.quantity,
      pnlUsdt: Number(realizedPnl.toFixed(4)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      reason,
      closedAt: new Date().toISOString(),
    });

    if (reason === "LIQUIDATION") {
      log("UYARI: pozisyon LIKIDE OLDU", { symbol, realizedPnl, exitPrice });
    } else {
      log("Stop-loss tetiklendi, pozisyon kendiliginden kapandi", { symbol, realizedPnl, exitPrice });
    }
  } catch (err) {
    log("Dis kapanma tespit edildi ama detay alinamadi", { symbol, err });
  }
}

async function checkTakeProfit(symbol: string): Promise<boolean> {
  const position = await getOpenPosition(symbol);
  if (!position) return false;

  const isLong = position.positionAmt > 0;
  const currentPrice = await getFuturesPrice(symbol);
  const targetPrice = isLong
    ? position.entryPrice * (1 + config.futures.takeProfitPercent / 100)
    : position.entryPrice * (1 - config.futures.takeProfitPercent / 100);
  const hit = isLong ? currentPrice >= targetPrice : currentPrice <= targetPrice;

  if (hit) {
    log("Kar hedefine ulasildi, pozisyon kapatiliyor", {
      symbol,
      direction: isLong ? "LONG" : "SHORT",
      entryPrice: position.entryPrice,
      currentPrice,
      targetPrice,
    });
    await handleFuturesSell(symbol, "TAKE_PROFIT");
    return true;
  }
  return false;
}

async function evaluateSymbol(symbol: string) {
  const allCandles = await getFuturesCandles(symbol, config.futures.candleInterval, config.futures.candleLookback + 1);
  const candles = allCandles.slice(0, -1);

  const result = computeConfluenceSignal(candles, config.futures.buyThreshold, config.futures.sellThreshold);
  if (!result.signal) return;

  log("Confluence sinyali", {
    symbol,
    signal: result.signal,
    score: Number(result.score.toFixed(2)),
    price: candles[candles.length - 1].close,
    oylar: result.votes.map((v) => `${v.name}=${v.vote}`).join(", "),
  });

  const existing = await getOpenPosition(symbol);

  if (result.signal === "BUY") {
    if (!existing) {
      await handleFuturesBuy(symbol, config.futures.stopLossPercent);
    } else if (existing.positionAmt < 0) {
      log("BUY sinyali geldi, acik SHORT kapatiliyor (flat)", { symbol });
      await handleFuturesSell(symbol, "SIGNAL_FLATTEN");
    } else {
      log("BUY sinyali var ama zaten LONG acik, atlaniyor", { symbol });
    }
  } else {
    if (!existing) {
      await handleFuturesShort(symbol, config.futures.stopLossPercent);
    } else if (existing.positionAmt > 0) {
      log("SELL sinyali geldi, acik LONG kapatiliyor (flat)", { symbol });
      await handleFuturesSell(symbol, "SIGNAL_FLATTEN");
    } else {
      log("SELL sinyali var ama zaten SHORT acik, atlaniyor", { symbol });
    }
  }
}

async function tick() {
  for (const symbol of config.futures.allowedSymbols) {
    try {
      await reconcileExternalClose(symbol);
      const closedByTakeProfit = await checkTakeProfit(symbol);
      if (closedByTakeProfit) continue;
      await evaluateSymbol(symbol);
    } catch (err) {
      if (err instanceof RiskRejection) {
        log(`Reddedildi (${symbol}):`, err.message);
      } else {
        log(`Hata (${symbol}):`, err);
      }
    }
  }
}

export function startFuturesStrategyEngine() {
  if (!config.futures.enabled) {
    log("Futures modulu devre disi (BINANCE_FUTURES_ENABLED=false)");
    return;
  }
  if (config.futures.allowedSymbols.length === 0) {
    log("Futures modulu acik ama FUTURES_ALLOWED_SYMBOLS bos, hicbir sey yapilmiyor");
    return;
  }

  log("Futures strateji motoru basladi (LONG+SHORT)", {
    leverage: config.futures.leverage,
    marginType: config.futures.marginType,
    symbols: config.futures.allowedSymbols,
    pollSeconds: config.futures.pollIntervalSeconds,
    buyThreshold: config.futures.buyThreshold,
    sellThreshold: config.futures.sellThreshold,
  });

  tick();
  setInterval(tick, config.futures.pollIntervalSeconds * 1000);
}
