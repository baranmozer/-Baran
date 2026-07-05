import { config } from "./config.js";
import { getClosePrices } from "./binanceClient.js";
import { calculateEma, detectCrossover } from "./indicators.js";
import { handleBuy, handleSell, log } from "./tradeActions.js";
import { RiskRejection } from "./riskManager.js";
import { getPosition } from "./positionStore.js";

async function evaluateSymbol(symbol: string) {
  const limit = config.strategy.emaSlowPeriod * 3;
  const closes = await getClosePrices(symbol, config.strategy.candleInterval, limit);

  const fast = calculateEma(closes, config.strategy.emaFastPeriod);
  const slow = calculateEma(closes, config.strategy.emaSlowPeriod);
  const signal = detectCrossover(fast, slow);

  if (!signal) return;

  log("Strateji sinyali", { symbol, signal, price: closes[closes.length - 1] });

  if (signal === "BUY" && !getPosition(symbol)) {
    await handleBuy(symbol, config.strategy.stopLossPercent);
  } else if (signal === "SELL" && getPosition(symbol)) {
    await handleSell(symbol);
  }
}

async function tick() {
  for (const symbol of config.allowedSymbols) {
    try {
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
