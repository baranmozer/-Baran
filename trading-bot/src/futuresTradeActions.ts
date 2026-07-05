import { config } from "./config.js";
import { RiskRejection } from "./riskManager.js";
import { assertStopLossIsSaferThanLiquidation, computeFuturesMarginAmount } from "./futuresRiskManager.js";
import {
  getFuturesSymbolFilters,
  getFuturesPrice,
  getAvailableUsdtBalance,
  getOpenPosition,
  setLeverage,
  setMarginType,
  marketOrder,
  placeStopMarketClosePosition,
  cancelAlgoOrder,
  getUserTrades,
  roundToStep,
} from "./binanceFuturesClient.js";
import { getPositionMeta, setPositionMeta, clearPositionMeta } from "./futuresStopOrderStore.js";
import { appendTradeHistory } from "./futuresTradeHistoryStore.js";
import type { FuturesCloseReason } from "./types.js";

export function log(...args: unknown[]) {
  console.log(new Date().toISOString(), "[futures]", ...args);
}

async function openPosition(symbol: string, direction: "LONG" | "SHORT", stopLossPercent: number) {
  assertStopLossIsSaferThanLiquidation(stopLossPercent, config.futures.leverage);

  const existing = await getOpenPosition(symbol);
  if (existing) {
    throw new RiskRejection(`${symbol} icin zaten acik futures pozisyonu var, once kapat`);
  }

  const freeUsdt = await getAvailableUsdtBalance();
  const margin = computeFuturesMarginAmount(freeUsdt);
  if (margin <= 0) {
    throw new RiskRejection("Yetersiz USDT bakiyesi (futures)");
  }

  await setMarginType(symbol, config.futures.marginType);
  await setLeverage(symbol, config.futures.leverage);

  const price = await getFuturesPrice(symbol);
  const filters = await getFuturesSymbolFilters(symbol);
  const notional = margin * config.futures.leverage;
  const quantity = roundToStep(notional / price, filters.stepSize);

  if (quantity <= 0) {
    throw new RiskRejection("Hesaplanan miktar sifir/negatif, marjin veya kaldiraci artir");
  }

  const openSide = direction === "LONG" ? "BUY" : "SELL";
  const closeSide = direction === "LONG" ? "SELL" : "BUY";
  await marketOrder(symbol, openSide, quantity);

  const position = await getOpenPosition(symbol);
  if (!position) {
    throw new Error(`${openSide} emri gonderildi ama pozisyon Binance'te gorunmuyor (gecikme olabilir)`);
  }

  // LONG: fiyat dusunce zarar -> stop asagida. SHORT: fiyat yukselince zarar -> stop yukarida.
  const triggerPrice = roundToStep(
    direction === "LONG"
      ? position.entryPrice * (1 - stopLossPercent / 100)
      : position.entryPrice * (1 + stopLossPercent / 100),
    filters.tickSize
  );

  try {
    const stopOrder = await placeStopMarketClosePosition(symbol, closeSide, triggerPrice);
    setPositionMeta(symbol, {
      algoId: stopOrder.algoId,
      direction,
      entryPrice: position.entryPrice,
      quantity,
    });
  } catch (err) {
    // Stop-loss konulamadiysa pozisyonu korumasiz birakmamak icin hemen kapat.
    log("KRITIK: stop-loss konulamadi, pozisyon guvenlik icin hemen kapatiliyor", { symbol, err });
    await marketOrder(symbol, closeSide, quantity, true);
    throw new Error(`Stop-loss konulamadi, ${symbol} pozisyonu guvenlik nedeniyle geri kapatildi: ${err}`);
  }

  log(`${direction} acildi`, {
    symbol,
    quantity,
    entryPrice: position.entryPrice,
    liquidationPrice: position.liquidationPrice,
    triggerPrice,
    leverage: config.futures.leverage,
  });

  return {
    symbol,
    direction,
    quantity,
    entryPrice: position.entryPrice,
    liquidationPrice: position.liquidationPrice,
    triggerPrice,
  };
}

export async function handleFuturesBuy(symbol: string, stopLossPercent: number) {
  return openPosition(symbol, "LONG", stopLossPercent);
}

export async function handleFuturesShort(symbol: string, stopLossPercent: number) {
  return openPosition(symbol, "SHORT", stopLossPercent);
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Kapanan emrin gercek islemlerinden (fill) realizedPnl ve ortalama fiyati
 * hesaplar. Binance, emir gerceklestikten hemen sonra userTrades sorgusunda
 * o fill'i her zaman aninda dondurmuyor (kisa bir gecikme olabiliyor) - bu
 * yuzden birkac kez kisa aralikla tekrar deniyoruz. `fallbackExitPrice`
 * (kapatma emrinin kendi yanitindaki avgPrice'i) islemler hic bulunamazsa
 * guvenilir bir yedek olarak kullanilir.
 */
async function computeCloseResult(
  symbol: string,
  orderId: number,
  fallbackExitPrice: number,
  entryPrice: number,
  quantity: number,
  direction: "LONG" | "SHORT"
): Promise<{ realizedPnl: number; exitPrice: number; estimated: boolean }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const trades = await getUserTrades(symbol, 10);
      const closingTrades = trades.filter((t: any) => t.orderId === orderId);
      if (closingTrades.length > 0) {
        const realizedPnl = closingTrades.reduce((sum: number, t: any) => sum + Number(t.realizedPnl), 0);
        const totalQty = closingTrades.reduce((sum: number, t: any) => sum + Number(t.qty), 0);
        const exitPrice =
          totalQty > 0
            ? closingTrades.reduce((sum: number, t: any) => sum + Number(t.price) * Number(t.qty), 0) / totalQty
            : fallbackExitPrice;
        return { realizedPnl, exitPrice, estimated: false };
      }
    } catch {
      // yut, tekrar denenecek
    }
    await sleep(400);
  }

  // Gercek fill verisi bulunamadi - fiyat farkindan tahmini kar/zarar hesapla
  // (sessizce 0 gostermek yaniltici olur).
  log("UYARI: kapanan islemin gercek kar/zarari bulunamadi, tahmini deger kullaniliyor", { symbol, orderId });
  const estimatedPnl = (fallbackExitPrice - entryPrice) * quantity * (direction === "LONG" ? 1 : -1);
  return { realizedPnl: estimatedPnl, exitPrice: fallbackExitPrice, estimated: true };
}

/** Pozisyon long da olsa short da olsa dogru yonde kapatir (Binance pozisyon yonunden anlar). */
export async function handleFuturesSell(symbol: string, reason: FuturesCloseReason = "MANUAL") {
  const position = await getOpenPosition(symbol);
  if (!position) {
    log("Kapatma sinyali geldi ama acik futures pozisyonu yok, atlaniyor", { symbol });
    clearPositionMeta(symbol);
    return { symbol, skipped: true };
  }

  const meta = getPositionMeta(symbol);
  if (meta?.algoId) {
    try {
      await cancelAlgoOrder(meta.algoId);
    } catch (err) {
      log("Stop-loss (algo) emri iptal edilemedi (muhtemelen zaten tetiklenmis)", err);
    }
  }
  clearPositionMeta(symbol);

  const direction: "LONG" | "SHORT" = position.positionAmt > 0 ? "LONG" : "SHORT";
  const closeSide = direction === "LONG" ? "SELL" : "BUY";
  const quantity = Math.abs(position.positionAmt);
  const closeOrder = await marketOrder(symbol, closeSide, quantity, true);

  const entryPrice = meta?.entryPrice ?? position.entryPrice;
  const orderAvgPrice = Number(closeOrder.avgPrice);
  const fallbackExitPrice = orderAvgPrice > 0 ? orderAvgPrice : await getFuturesPrice(symbol);
  const { realizedPnl, exitPrice } = await computeCloseResult(
    symbol,
    closeOrder.orderId,
    fallbackExitPrice,
    entryPrice,
    quantity,
    direction
  );
  const pnlPercent = ((exitPrice - entryPrice) / entryPrice) * 100 * (direction === "LONG" ? 1 : -1);

  appendTradeHistory({
    symbol,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    pnlUsdt: Number(realizedPnl.toFixed(4)),
    pnlPercent: Number(pnlPercent.toFixed(2)),
    reason,
    closedAt: new Date().toISOString(),
  });

  log("Pozisyon kapatildi", { symbol, quantity, direction, reason, realizedPnl });
  return { symbol, quantity };
}
