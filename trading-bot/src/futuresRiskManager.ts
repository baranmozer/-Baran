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

export interface LeverageRecommendation {
  leverage: number;
  reason: string;
}

/**
 * Oynaklik (ATR%) ve sinyal gucune (skor + ADX) gore onerilen kaldiraci
 * hesaplar. Dusuk oynaklik ve guclu sinyal kaldiraci artirir, yuksek
 * oynaklik (riskli) dusurur. Sonuc her zaman, verilen stopLossPercent ile
 * likidasyon-guvenlik kuralini (assertStopLossIsSaferThanLiquidation) hala
 * gecebilecek sekilde ust sinirlanir.
 */
export function computeSuggestedLeverage(
  baseLeverage: number,
  atrPercent: number,
  score: number,
  adxValue: number | null,
  stopLossPercent: number
): LeverageRecommendation {
  let multiplier = 1;
  const reasons: string[] = [];

  if (atrPercent >= 3) {
    multiplier *= 0.5;
    reasons.push(`yuksek oynaklik (ATR ~%${atrPercent.toFixed(1)}) -> kaldirac dusuruldu`);
  } else if (atrPercent <= 1) {
    multiplier *= 1.25;
    reasons.push(`dusuk oynaklik (ATR ~%${atrPercent.toFixed(1)}) -> kaldirac artirildi`);
  } else {
    reasons.push(`orta oynaklik (ATR ~%${atrPercent.toFixed(1)}) -> kaldirac degistirilmedi`);
  }

  const strongSignal = Math.abs(score) >= 0.7 && (adxValue ?? 0) >= 30;
  if (strongSignal) {
    multiplier *= 1.15;
    reasons.push("guclu sinyal (yuksek skor + ADX) -> kaldirac biraz daha artirildi");
  }

  // Stop-loss'un likidasyon-guvenlik kuralini gecebilmesi icin kesin ust sinir:
  // maxSafeStopLoss = (100/leverage)*0.6 >= stopLossPercent  =>  leverage <= 60/stopLossPercent
  const maxLeverageFromStopLoss = stopLossPercent > 0 ? 60 / stopLossPercent : config.futures.maxAutoLeverage;

  const rawLeverage = baseLeverage * multiplier;
  const capped = Math.min(rawLeverage, config.futures.maxAutoLeverage, maxLeverageFromStopLoss);
  const leverage = Math.max(config.futures.minAutoLeverage, Math.round(capped));

  return { leverage, reason: reasons.join("; ") };
}
