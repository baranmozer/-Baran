import crypto from "node:crypto";
import { config } from "./config.js";
import type { TradingViewAlert } from "./types.js";

export class RiskRejection extends Error {}

export function safeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Alert'in guvenli ve izinli oldugunu dogrular, sorun varsa RiskRejection firlatir. */
export function validateAlert(alert: Partial<TradingViewAlert>): TradingViewAlert {
  if (!alert.secret || !safeEquals(alert.secret, config.webhookSecret)) {
    throw new RiskRejection("Gecersiz webhook secret");
  }
  if (!alert.symbol || !config.allowedSymbols.includes(alert.symbol.toUpperCase())) {
    throw new RiskRejection(`Sembol izinli listede degil: ${alert.symbol}`);
  }
  if (alert.side !== "BUY" && alert.side !== "SELL") {
    throw new RiskRejection(`Gecersiz yon: ${alert.side}`);
  }
  if (alert.side === "BUY") {
    if (!alert.stopLossPercent || alert.stopLossPercent <= 0) {
      throw new RiskRejection("BUY icin stopLossPercent zorunlu");
    }
    if (alert.stopLossPercent > config.maxStopLossPercent) {
      throw new RiskRejection(
        `stopLossPercent (${alert.stopLossPercent}) izin verilen maksimumu asiyor (${config.maxStopLossPercent})`
      );
    }
  }
  return {
    secret: alert.secret,
    symbol: alert.symbol.toUpperCase(),
    side: alert.side,
    stopLossPercent: alert.stopLossPercent,
  };
}

/** Bakiyenin sabit yuzdesi kadar USDT notional hesaplar. */
export function computeOrderNotional(freeUsdtBalance: number): number {
  return freeUsdtBalance * (config.positionSizePercent / 100);
}
