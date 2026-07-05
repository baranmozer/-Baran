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
  getOpenOrders,
  cancelOrder,
  roundToStep,
} from "./binanceFuturesClient.js";

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
  const stopPrice = roundToStep(
    direction === "LONG"
      ? position.entryPrice * (1 - stopLossPercent / 100)
      : position.entryPrice * (1 + stopLossPercent / 100),
    filters.tickSize
  );
  await placeStopMarketClosePosition(symbol, closeSide, stopPrice);

  log(`${direction} acildi`, {
    symbol,
    quantity,
    entryPrice: position.entryPrice,
    liquidationPrice: position.liquidationPrice,
    stopPrice,
    leverage: config.futures.leverage,
  });

  return {
    symbol,
    direction,
    quantity,
    entryPrice: position.entryPrice,
    liquidationPrice: position.liquidationPrice,
    stopPrice,
  };
}

export async function handleFuturesBuy(symbol: string, stopLossPercent: number) {
  return openPosition(symbol, "LONG", stopLossPercent);
}

export async function handleFuturesShort(symbol: string, stopLossPercent: number) {
  return openPosition(symbol, "SHORT", stopLossPercent);
}

/** Pozisyon long da olsa short da olsa dogru yonde kapatir (Binance pozisyon yonunden anlar). */
export async function handleFuturesSell(symbol: string) {
  const position = await getOpenPosition(symbol);
  if (!position) {
    log("Kapatma sinyali geldi ama acik futures pozisyonu yok, atlaniyor", { symbol });
    return { symbol, skipped: true };
  }

  const openOrders = await getOpenOrders(symbol);
  for (const order of openOrders) {
    if (order.type === "STOP_MARKET" || order.type === "TAKE_PROFIT_MARKET") {
      try {
        await cancelOrder(symbol, order.orderId);
      } catch (err) {
        log("Emir iptal edilemedi (muhtemelen zaten tetiklenmis)", err);
      }
    }
  }

  const closeSide = position.positionAmt > 0 ? "SELL" : "BUY";
  const quantity = Math.abs(position.positionAmt);
  await marketOrder(symbol, closeSide, quantity, true);

  log("Pozisyon kapatildi", { symbol, quantity, direction: position.positionAmt > 0 ? "LONG" : "SHORT" });
  return { symbol, quantity };
}
