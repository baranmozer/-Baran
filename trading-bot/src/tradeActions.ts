import { RiskRejection, computeOrderNotional } from "./riskManager.js";
import {
  getSymbolFilters,
  getFreeBalance,
  marketBuyByQuote,
  marketSell,
  placeStopLossSell,
  cancelOrder,
  roundToStep,
} from "./binanceClient.js";
import { getPosition, setPosition, clearPosition } from "./positionStore.js";

const QUOTE_ASSET = "USDT";

export function log(...args: unknown[]) {
  console.log(new Date().toISOString(), ...args);
}

export function baseAsset(symbol: string): string {
  if (!symbol.endsWith(QUOTE_ASSET)) {
    throw new RiskRejection(`Sadece ${QUOTE_ASSET} paritesi destekleniyor: ${symbol}`);
  }
  return symbol.slice(0, -QUOTE_ASSET.length);
}

export async function handleBuy(symbol: string, stopLossPercent: number) {
  if (getPosition(symbol)) {
    throw new RiskRejection(`${symbol} icin zaten acik pozisyon var, once kapat`);
  }

  const freeUsdt = await getFreeBalance(QUOTE_ASSET);
  const notional = computeOrderNotional(freeUsdt);
  if (notional <= 0) {
    throw new RiskRejection(`Yetersiz ${QUOTE_ASSET} bakiyesi`);
  }

  const buyOrder = await marketBuyByQuote(symbol, notional);
  const filledQty = Number(buyOrder.executedQty);
  const quoteSpent = Number(buyOrder.cummulativeQuoteQty);
  const avgPrice = quoteSpent / filledQty;

  const filters = await getSymbolFilters(symbol);
  const stopPrice = roundToStep(avgPrice * (1 - stopLossPercent / 100), filters.tickSize);
  const stopQty = roundToStep(filledQty, filters.stepSize);

  const stopOrder = await placeStopLossSell(symbol, stopQty, stopPrice);

  setPosition({
    symbol,
    quantity: stopQty,
    entryPrice: avgPrice,
    stopOrderId: stopOrder.orderId,
    createdAt: new Date().toISOString(),
  });

  log("BUY tamamlandi", { symbol, filledQty, avgPrice, stopPrice });
  return { symbol, filledQty, avgPrice, stopPrice };
}

export async function handleSell(symbol: string) {
  const position = getPosition(symbol);
  if (!position) {
    log("SELL sinyali geldi ama takip edilen acik pozisyon yok, atlaniyor", { symbol });
    return { symbol, skipped: true };
  }

  try {
    await cancelOrder(symbol, position.stopOrderId);
  } catch (err) {
    log("Stop emri iptal edilemedi (muhtemelen zaten tetiklenmis)", err);
  }

  const base = baseAsset(symbol);
  const filters = await getSymbolFilters(symbol);
  const freeQty = await getFreeBalance(base);
  const sellQty = roundToStep(Math.min(freeQty, position.quantity), filters.stepSize);

  if (sellQty <= 0) {
    clearPosition(symbol);
    log("Satilacak miktar yok (stop zaten tetiklenmis olabilir), pozisyon temizlendi", { symbol });
    return { symbol, skipped: true };
  }

  const sellOrder = await marketSell(symbol, sellQty);
  clearPosition(symbol);

  log("SELL tamamlandi", { symbol, sellQty });
  return { symbol, sellQty, orderId: sellOrder.orderId };
}
