import { config } from "./config.js";
import { getClosePrices, getCandles, getPrice } from "./binanceClient.js";
import { calculateEma, detectCrossover } from "./indicators.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleBuy, handleSell, log } from "./tradeActions.js";
import { RiskRejection } from "./riskManager.js";
import { getPosition } from "./positionStore.js";

/** Acik pozisyon kar hedefine ulastiysa satar. Sattiysa true doner. */
async function checkTakeProfit(symbol: string): Promise<boolean> {
  const position = getPosition(symbol);
  if (!position) return false;

  const currentPrice = await getPrice(symbol);
  const targetPrice = position.entryPrice * (1 + config.strategy.takeProfitPercent / 100);

  if (currentPrice >= targetPrice) {
    log("Kar hedefine ulasildi, pozisyon kapatiliyor", {
      symbol,
      entryPrice: position.entryPrice,
      currentPrice,
      targetPrice,
    });
    await handleSell(symbol);
    return true;
  }
  return false;
}

/** Karar sonrasi ortak islem: pozisyon durumuna gore BUY/SELL uygular veya sebebiyle atlar. */
async function applySignal(symbol: string, signal: "BUY" | "SELL" | null) {
  if (!signal) return;

  if (signal === "BUY") {
    if (getPosition(symbol)) {
      log("BUY sinyali var ama zaten acik pozisyon var, atlaniyor", { symbol });
    } else {
      await handleBuy(symbol, config.strategy.stopLossPercent);
    }
  } else {
    if (!getPosition(symbol)) {
      log("SELL sinyali var ama acik pozisyon yok, atlaniyor", { symbol });
    } else {
      await handleSell(symbol);
    }
  }
}

/** Butun indikatorlerin agirlikli oyuyla karar veren strateji (varsayilan mod). */
async function evaluateConfluence(symbol: string) {
  const allCandles = await getCandles(symbol, config.strategy.candleInterval, config.strategy.candleLookback + 1);
  // Son mum henuz kapanmamis (canli); sadece kapanmis mumlari degerlendiriyoruz.
  const candles = allCandles.slice(0, -1);

  const result = computeConfluenceSignal(candles, config.strategy.buyThreshold, config.strategy.sellThreshold);
  if (!result.signal) return;

  log("Confluence sinyali", {
    symbol,
    signal: result.signal,
    score: Number(result.score.toFixed(2)),
    price: candles[candles.length - 1].close,
    oylar: result.votes.map((v) => `${v.name}=${v.vote}`).join(", "),
  });

  await applySignal(symbol, result.signal);
}

/** Sadece EMA kesisimine bakan basit strateji (STRATEGY_MODE=ema). */
async function evaluateEmaCrossover(symbol: string) {
  const limit = config.strategy.emaSlowPeriod * 3 + 1;
  const allCloses = await getClosePrices(symbol, config.strategy.candleInterval, limit);
  const closes = allCloses.slice(0, -1);

  const fast = calculateEma(closes, config.strategy.emaFastPeriod);
  const slow = calculateEma(closes, config.strategy.emaSlowPeriod);
  const signal = detectCrossover(fast, slow);
  if (!signal) return;

  log("Strateji sinyali", { symbol, signal, price: closes[closes.length - 1] });
  await applySignal(symbol, signal);
}

async function evaluateSymbol(symbol: string) {
  if (config.strategy.mode === "ema") {
    await evaluateEmaCrossover(symbol);
  } else {
    await evaluateConfluence(symbol);
  }
}

async function tick() {
  for (const symbol of config.allowedSymbols) {
    try {
      const closedByTakeProfit = await checkTakeProfit(symbol);
      if (closedByTakeProfit) continue;
      await evaluateSymbol(symbol);
    } catch (err) {
      if (err instanceof RiskRejection) {
        log(`Strateji reddedildi (${symbol}):`, err.message);
      } else {
        log(`Strateji hatasi (${symbol}):`, err);
      }
    }
  }
}

export function startStrategyEngine() {
  if (!config.strategy.enabled) {
    log("Strateji motoru devre disi (STRATEGY_ENABLED=false)");
    return;
  }

  log("Strateji motoru basladi", {
    mode: config.strategy.mode,
    interval: config.strategy.candleInterval,
    pollSeconds: config.strategy.pollIntervalSeconds,
    ...(config.strategy.mode === "ema"
      ? { emaFast: config.strategy.emaFastPeriod, emaSlow: config.strategy.emaSlowPeriod }
      : { buyThreshold: config.strategy.buyThreshold, sellThreshold: config.strategy.sellThreshold }),
  });

  tick();
  setInterval(tick, config.strategy.pollIntervalSeconds * 1000);
}
