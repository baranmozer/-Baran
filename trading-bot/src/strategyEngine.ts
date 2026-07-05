import { config } from "./config.js";
import { getClosePrices, getPrice } from "./binanceClient.js";
import { calculateEma, detectCrossover } from "./indicators.js";
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

async function evaluateSymbol(symbol: string) {
  const limit = config.strategy.emaSlowPeriod * 3 + 1;
  const allCloses = await getClosePrices(symbol, config.strategy.candleInterval, limit);
  // Binance'in dondurdugu son mum henuz kapanmamis (canli) oluyor; fiyat
  // sürekli degistigi icin onu disarida birakmazsak ayni kesisim defalarca
  // (titreyerek) algilanir. Sadece kapanmis mumlari degerlendiriyoruz.
  const closes = allCloses.slice(0, -1);

  const fast = calculateEma(closes, config.strategy.emaFastPeriod);
  const slow = calculateEma(closes, config.strategy.emaSlowPeriod);
  const signal = detectCrossover(fast, slow);

  if (!signal) return;

  log("Strateji sinyali", { symbol, signal, price: closes[closes.length - 1] });

  if (signal === "BUY") {
    if (getPosition(symbol)) {
      log("BUY sinyali var ama zaten acik pozisyon var, atlaniyor", { symbol });
    } else {
      await handleBuy(symbol, config.strategy.stopLossPercent);
    }
  } else if (signal === "SELL") {
    if (!getPosition(symbol)) {
      log("SELL sinyali var ama acik pozisyon yok, atlaniyor", { symbol });
    } else {
      await handleSell(symbol);
    }
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
    interval: config.strategy.candleInterval,
    pollSeconds: config.strategy.pollIntervalSeconds,
    emaFast: config.strategy.emaFastPeriod,
    emaSlow: config.strategy.emaSlowPeriod,
  });

  tick();
  setInterval(tick, config.strategy.pollIntervalSeconds * 1000);
}
