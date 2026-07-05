import { config } from "./config.js";
import { RiskRejection, safeEquals } from "./riskManager.js";
import type { TradingViewAlert } from "./types.js";

/** Manuel/webhook futures alert'inin secret'i ve sembolu dogru mu kontrol eder. */
export function validateFuturesAlert(alert: Partial<TradingViewAlert>): TradingViewAlert {
  if (!alert.secret || !safeEquals(alert.secret, config.webhookSecret)) {
    throw new RiskRejection("Gecersiz webhook secret");
  }
  if (!alert.symbol || !config.futures.allowedSymbols.includes(alert.symbol.toUpperCase())) {
    throw new RiskRejection(
      `Futures sembolu izinli listede degil: ${alert.symbol}. FUTURES_ALLOWED_SYMBOLS'e ekle.`
    );
  }
  if (alert.side !== "BUY" && alert.side !== "SELL") {
    throw new RiskRejection(`Gecersiz yon: ${alert.side}`);
  }
  return {
    secret: alert.secret,
    symbol: alert.symbol.toUpperCase(),
    side: alert.side,
    stopLossPercent: alert.stopLossPercent ?? config.futures.stopLossPercent,
  };
}

/**
 * Kaldiracli pozisyonda yaklasik likidasyon mesafesi ~ 100/kaldirac yuzdedir
 * (bakim marjini vb. goz ardi edilerek, muhafazakar bir tahmin). Stop-loss
 * bu mesafenin guvenli bir payla (yuzde 60'i) altinda kalmali, yoksa piyasa
 * stop-loss'u tetiklemeden once pozisyon likide olabilir.
 */
export function assertStopLossIsSaferThanLiquidation(stopLossPercent: number, leverage: number) {
  const estimatedLiquidationPercent = 100 / leverage;
  const maxSafeStopLoss = estimatedLiquidationPercent * 0.6;

  if (stopLossPercent > maxSafeStopLoss) {
    throw new RiskRejection(
      `${leverage}x kaldiracta stop-loss (%${stopLossPercent}) likidasyon mesafesine (~%${estimatedLiquidationPercent.toFixed(
        1
      )}) cok yakin/uzerinde. Guvenli ust sinir: %${maxSafeStopLoss.toFixed(2)}`
    );
  }
}

export function computeFuturesMarginAmount(freeUsdtBalance: number): number {
  return freeUsdtBalance * (config.futures.positionSizePercent / 100);
}
