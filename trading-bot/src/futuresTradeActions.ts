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

/** Kapanan emrin gercek islemlerinden (fill) realizedPnl ve ortalama fiyati hesaplar. */
async function computeCloseResult(symbol: string, orderId: number, fallbackEntryPrice: number) {
  try {
    const trades = await getUserTrades(symbol, 10);
    const closingTrades = trades.filter((t: any) => t.orderId === orderId);
    const realizedPnl = closingTrades.reduce((sum: number, t: any) => sum + Number(t.realizedPnl), 0);
    const totalQty = closingTrades.reduce((sum: number, t: any) => sum + Number(t.qty), 0);
    const exitPrice =
      totalQty > 0
        ? closingTrades.reduce((sum: number, t: any) => sum + Number(t.price) * Number(t.qty), 0) / totalQty
        : await getFuturesPrice(symbol);
    return { realizedPnl, exitPrice };
  } catch {
    return { realizedPnl: 0, exitPrice: fallbackEntryPrice };
  }
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
  const { realizedPnl, exitPrice } = await computeCloseResult(symbol, closeOrder.orderId, entryPrice);
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
