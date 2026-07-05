import { config } from "./config.js";
import { getFuturesCandles, getFuturesPrice, getOpenPosition, getRecentOrders, getUserTrades } from "./binanceFuturesClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleFuturesBuy, handleFuturesShort, handleFuturesSell, log } from "./futuresTradeActions.js";
import { getPositionMeta, clearPositionMeta, getAllTrackedSymbols } from "./futuresStopOrderStore.js";
import { appendTradeHistory } from "./futuresTradeHistoryStore.js";
import { discoverOpportunityCoins } from "./futuresOpportunityDiscovery.js";
import { RiskRejection } from "./riskManager.js";
import type { FuturesCloseReason } from "./types.js";

let discoveredSymbols: string[] = [];

async function refreshDiscovery(): Promise<void> {
  if (!config.futures.autoDiscoverEnabled) return;
  try {
    const found = await discoverOpportunityCoins(config.futures.allowedSymbols);
    const added = found.filter((s) => !discoveredSymbols.includes(s));
    const removed = discoveredSymbols.filter((s) => !found.includes(s));
    if (added.length > 0) log("Yeni firsat coin(ler) eklendi", added);
    if (removed.length > 0) log("Firsat coin(ler) listeden cikti (pozisyon acikca devam eder)", removed);
    discoveredSymbols = found;
  } catch (err) {
    log("Firsat coin taramasi basarisiz", err);
  }
}

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
    const orderAvgPrice = Number(lastFilled?.avgPrice);
    const fallbackExitPrice = orderAvgPrice > 0 ? orderAvgPrice : await getFuturesPrice(symbol);

    const trades = await getUserTrades(symbol, 5);
    const relevantTrades = lastFilled ? trades.filter((t: any) => t.orderId === lastFilled.orderId) : trades;
    const totalQty = relevantTrades.reduce((sum: number, t: any) => sum + Number(t.qty), 0);
    const realizedPnl =
      totalQty > 0
        ? relevantTrades.reduce((sum: number, t: any) => sum + Number(t.realizedPnl), 0)
        : (fallbackExitPrice - meta.entryPrice) * meta.quantity * (meta.direction === "LONG" ? 1 : -1);
    const exitPrice =
      totalQty > 0
        ? relevantTrades.reduce((sum: number, t: any) => sum + Number(t.price) * Number(t.qty), 0) / totalQty
        : fallbackExitPrice;

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

/**
 * Acik pozisyon varken indikator ters yone donerse (skorun isareti
 * pozisyona aykiri hale gelirse) HEMEN kapatir - kar/zararda olmasi
 * fark etmez, stop-loss'un (%2) tetiklenmesini beklemez. Giris icin
 * hala tam esik (buyThreshold/sellThreshold) gerekiyor; sadece cikis
 * cok daha hassas.
 */
async function evaluateSymbol(symbol: string): Promise<void> {
  const allCandles = await getFuturesCandles(symbol, config.futures.candleInterval, config.futures.candleLookback + 1);
  const candles = allCandles.slice(0, -1);
  const result = computeConfluenceSignal(candles, config.futures.buyThreshold, config.futures.sellThreshold);

  const existing = await getOpenPosition(symbol);

  if (existing) {
    const isLong = existing.positionAmt > 0;
    const scoreAgainstPosition = isLong ? result.score < 0 : result.score > 0;
    if (scoreAgainstPosition) {
      log("Indikator ters yone dondu, pozisyon erken kapatiliyor", {
        symbol,
        direction: isLong ? "LONG" : "SHORT",
        score: Number(result.score.toFixed(2)),
        unrealizedProfit: existing.unrealizedProfit,
      });
      await handleFuturesSell(symbol, "SIGNAL_FLATTEN");
    }
    return;
  }

  if (!result.signal) return;

  log("Confluence sinyali", {
    symbol,
    signal: result.signal,
    score: Number(result.score.toFixed(2)),
    price: candles[candles.length - 1].close,
    oylar: result.votes.map((v) => `${v.name}=${v.vote}`).join(", "),
  });

  if (result.signal === "BUY") {
    await handleFuturesBuy(symbol, config.futures.stopLossPercent);
  } else {
    await handleFuturesShort(symbol, config.futures.stopLossPercent);
  }
}

async function tick() {
  // Acik pozisyonu olan (bizim actigimiz) semboller, firsat listesinden
  // dusmuslerse bile kapanana kadar takip edilmeye devam eder.
  const symbolsToWatch = Array.from(
    new Set([...config.futures.allowedSymbols, ...discoveredSymbols, ...getAllTrackedSymbols()])
  );

  for (const symbol of symbolsToWatch) {
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

  log("Futures strateji motoru basladi (LONG+SHORT, hassas cikis)", {
    leverage: config.futures.leverage,
    marginType: config.futures.marginType,
    symbols: config.futures.allowedSymbols,
    autoDiscover: config.futures.autoDiscoverEnabled,
    pollSeconds: config.futures.pollIntervalSeconds,
    buyThreshold: config.futures.buyThreshold,
    sellThreshold: config.futures.sellThreshold,
  });

  refreshDiscovery();
  tick();
  setInterval(tick, config.futures.pollIntervalSeconds * 1000);
  setInterval(refreshDiscovery, config.futures.discoverIntervalMinutes * 60 * 1000);
}
