import { config } from "./config.js";
import { RiskRejection } from "./riskManager.js";

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
