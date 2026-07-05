import { config } from "./config.js";
import { getFuturesCandles, getFuturesPrice, getOpenPosition } from "./binanceFuturesClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleFuturesBuy, handleFuturesSell, log } from "./futuresTradeActions.js";
import { RiskRejection } from "./riskManager.js";

async function checkTakeProfit(symbol: string): Promise<boolean> {
  const position = await getOpenPosition(symbol);
  if (!position) return false;

  const currentPrice = await getFuturesPrice(symbol);
  const targetPrice = position.entryPrice * (1 + config.futures.takeProfitPercent / 100);

  if (currentPrice >= targetPrice) {
    log("Kar hedefine ulasildi, pozisyon kapatiliyor", {
      symbol,
      entryPrice: position.entryPrice,
      currentPrice,
      targetPrice,
    });
    await handleFuturesSell(symbol);
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

  if (result.signal === "BUY") {
    const existing = await getOpenPosition(symbol);
    if (existing) {
      log("BUY sinyali var ama zaten acik futures pozisyonu var, atlaniyor", { symbol });
    } else {
      await handleFuturesBuy(symbol, config.futures.stopLossPercent);
    }
  } else {
    const existing = await getOpenPosition(symbol);
    if (!existing) {
      log("SELL sinyali var ama acik futures pozisyonu yok, atlaniyor", { symbol });
    } else {
      await handleFuturesSell(symbol);
    }
  }
}

async function tick() {
  for (const symbol of config.futures.allowedSymbols) {
    try {
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

  log("Futures strateji motoru basladi", {
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
