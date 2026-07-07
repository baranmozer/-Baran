import { config, getLeverageForSymbol } from "./config.js";
import { RiskRejection } from "./riskManager.js";
import { assertStopLossIsSaferThanLiquidation } from "./futuresRiskManager.js";
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
  getMaxLeverageForSymbol,
  placeTakeProfitMarketClosePosition,
} from "./binanceFuturesClient.js";
import { getPositionMeta, setPositionMeta, clearPositionMeta, type PositionMeta } from "./futuresStopOrderStore.js";
import { appendTradeHistory } from "./futuresTradeHistoryStore.js";
import type { FuturesCloseReason } from "./types.js";

export function log(...args: unknown[]) {
  console.log(new Date().toISOString(), "[futures]", ...args);
}

export interface OpenPositionOverrides {
  leverage?: number;
  positionSizePercent?: number;
}

async function openPosition(
  symbol: string,
  direction: "LONG" | "SHORT",
  stopLossPercent: number,
  overrides: OpenPositionOverrides = {}
) {
  const requestedLeverage = overrides.leverage ?? getLeverageForSymbol(symbol);
  const positionSizePercent = overrides.positionSizePercent ?? config.futures.positionSizePercent;

  // Binance her sembol icin farkli (genelde dusuk hacimli coinlerde daha
  // dusuk) bir maksimum kaldirac izin veriyor - bizim onerimiz bunu
  // asarsa Binance "-4028 Leverage X is not valid" hatasi veriyordu.
  const maxAllowedLeverage = await getMaxLeverageForSymbol(symbol);
  const leverage = Math.min(requestedLeverage, maxAllowedLeverage);
  if (leverage < requestedLeverage) {
    log("Istenen kaldirac bu sembol icin cok yuksek, Binance limitine dusuruldu", {
      symbol,
      requestedLeverage,
      maxAllowedLeverage,
      usedLeverage: leverage,
    });
  }

  assertStopLossIsSaferThanLiquidation(stopLossPercent, leverage);

  const existing = await getOpenPosition(symbol);
  if (existing) {
    throw new RiskRejection(`${symbol} icin zaten acik futures pozisyonu var, once kapat`);
  }

  const freeUsdt = await getAvailableUsdtBalance();
  const margin = freeUsdt * (positionSizePercent / 100);
  if (margin <= 0) {
    throw new RiskRejection("Yetersiz USDT bakiyesi (futures)");
  }

  await setMarginType(symbol, config.futures.marginType);
  await setLeverage(symbol, leverage);

  const price = await getFuturesPrice(symbol);
  const filters = await getFuturesSymbolFilters(symbol);
  const notional = margin * leverage;
  let quantity = roundToStep(notional / price, filters.stepSize);

  // Bazi sembollerde tek emrin miktar sinirini asmayalim (-4005 hatasi) -
  // pozisyon boyutunu Binance'in izin verdigi ust sinira kirpariz.
  if (filters.maxQty && quantity > filters.maxQty) {
    quantity = roundToStep(filters.maxQty, filters.stepSize);
    log("Hesaplanan miktar sembolun izin verdigi ust siniri astigi icin kirpildi", {
      symbol,
      maxQty: filters.maxQty,
      usedQuantity: quantity,
    });
  }

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
      leverage,
      currentStopPrice: triggerPrice,
      peakPrice: position.entryPrice,
      movedToBreakeven: false,
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
    leverage,
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

export async function handleFuturesBuy(
  symbol: string,
  stopLossPercent: number,
  overrides?: OpenPositionOverrides
) {
  return openPosition(symbol, "LONG", stopLossPercent, overrides);
}

export async function handleFuturesShort(
  symbol: string,
  stopLossPercent: number,
  overrides?: OpenPositionOverrides
) {
  return openPosition(symbol, "SHORT", stopLossPercent, overrides);
}

/**
 * Mevcut stop-loss/trailing emrini iptal edip yeni fiyattan yenisini koyar.
 * Basabas veya trailing stop guncellemesi icin kullanilir.
 */
export async function moveStopLoss(
  symbol: string,
  meta: PositionMeta,
  newStopPrice: number,
  markBreakeven: boolean
): Promise<void> {
  const filters = await getFuturesSymbolFilters(symbol);
  const roundedStop = roundToStep(newStopPrice, filters.tickSize);
  const closeSide = meta.direction === "LONG" ? "SELL" : "BUY";

  try {
    await cancelAlgoOrder(meta.algoId);
  } catch (err) {
    log("Eski stop emri iptal edilemedi (muhtemelen zaten tetiklenmis)", { symbol, err });
    return;
  }

  const newStopOrder = await placeStopMarketClosePosition(symbol, closeSide, roundedStop);
  setPositionMeta(symbol, {
    ...meta,
    algoId: newStopOrder.algoId,
    currentStopPrice: roundedStop,
    movedToBreakeven: meta.movedToBreakeven || markBreakeven,
  });

  log(markBreakeven ? "Stop-loss basabasa cekildi" : "Trailing stop guncellendi", {
    symbol,
    newStopPrice: roundedStop,
    direction: meta.direction,
  });
}

/**
 * Kullanicinin kendi belirledigi bir fiyata (ya da kar tutarina karsilik
 * gelen fiyata) pozisyonu kapatan gercek bir Binance emri koyar/gunceller.
 * Bunun amaci: panelden "Kapat" tiklandiginda insan tepki suresi +
 * gecikme yuzunden fiyatin kaymasini (orn. 20 dolar karda gorunup 15
 * dolara dusmesini) onlemek - emir Binance'te bekler, fiyat o seviyeye
 * aninda dokununca (bizim tarama dongumuzu beklemeden) tetiklenir.
 */
export async function setCustomTakeProfit(symbol: string, meta: PositionMeta, targetPrice: number): Promise<void> {
  const filters = await getFuturesSymbolFilters(symbol);
  const roundedTarget = roundToStep(targetPrice, filters.tickSize);
  const closeSide = meta.direction === "LONG" ? "SELL" : "BUY";

  if (meta.takeProfitAlgoId) {
    try {
      await cancelAlgoOrder(meta.takeProfitAlgoId);
    } catch (err) {
      log("Eski kar-al emri iptal edilemedi (muhtemelen zaten tetiklenmis)", { symbol, err });
    }
  }

  const newTakeProfitOrder = await placeTakeProfitMarketClosePosition(symbol, closeSide, roundedTarget);
  setPositionMeta(symbol, { ...meta, takeProfitAlgoId: newTakeProfitOrder.algoId });

  log("Kullanici tarafindan kar-al hedefi belirlendi", {
    symbol,
    targetPrice: roundedTarget,
    direction: meta.direction,
  });
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
  orderIds: number[],
  fallbackExitPrice: number,
  entryPrice: number,
  quantity: number,
  direction: "LONG" | "SHORT"
): Promise<{ realizedPnl: number; exitPrice: number; estimated: boolean }> {
  const orderIdSet = new Set(orderIds);
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const trades = await getUserTrades(symbol, 10);
      const closingTrades = trades.filter((t: any) => orderIdSet.has(t.orderId));
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
  log("UYARI: kapanan islemin gercek kar/zarari bulunamadi, tahmini deger kullaniliyor", { symbol, orderIds });
  const estimatedPnl = (fallbackExitPrice - entryPrice) * quantity * (direction === "LONG" ? 1 : -1);
  return { realizedPnl: estimatedPnl, exitPrice: fallbackExitPrice, estimated: true };
}

/**
 * Bazi sembollerde tek bir MARKET emrinin miktar siniri var (Binance -4005
 * "Quantity greater than max quantity" hatasi). Bu sinir asilirsa, kapatmayi
 * birden fazla kucuk MARKET emrine bolup sirayla gonderir.
 */
async function closePositionMarket(
  symbol: string,
  side: "BUY" | "SELL",
  quantity: number
): Promise<{ orderIds: number[]; avgPrice: number }> {
  const filters = await getFuturesSymbolFilters(symbol);
  const maxQty = filters.maxQty;

  if (!maxQty || quantity <= maxQty) {
    const order = await marketOrder(symbol, side, quantity, true);
    return { orderIds: [order.orderId], avgPrice: Number(order.avgPrice) || 0 };
  }

  log("Miktar tek emir sinirini asiyor, parcali kapatiliyor", { symbol, quantity, maxQty });
  const orderIds: number[] = [];
  let remaining = quantity;
  let weightedPriceSum = 0;
  let filledQty = 0;

  while (remaining > 0.0000001) {
    const chunk = roundToStep(Math.min(remaining, maxQty), filters.stepSize);
    if (chunk <= 0) break;
    const order = await marketOrder(symbol, side, chunk, true);
    orderIds.push(order.orderId);
    const orderQty = Number(order.executedQty) || chunk;
    const orderPrice = Number(order.avgPrice) || 0;
    weightedPriceSum += orderPrice * orderQty;
    filledQty += orderQty;
    remaining -= chunk;
  }

  return { orderIds, avgPrice: filledQty > 0 ? weightedPriceSum / filledQty : 0 };
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
  if (meta?.takeProfitAlgoId) {
    try {
      await cancelAlgoOrder(meta.takeProfitAlgoId);
    } catch (err) {
      log("Kar-al (algo) emri iptal edilemedi (muhtemelen zaten tetiklenmis)", err);
    }
  }
  clearPositionMeta(symbol);

  const direction: "LONG" | "SHORT" = position.positionAmt > 0 ? "LONG" : "SHORT";
  const closeSide = direction === "LONG" ? "SELL" : "BUY";
  const quantity = Math.abs(position.positionAmt);
  const closeResult = await closePositionMarket(symbol, closeSide, quantity);

  const entryPrice = meta?.entryPrice ?? position.entryPrice;
  const fallbackExitPrice = closeResult.avgPrice > 0 ? closeResult.avgPrice : await getFuturesPrice(symbol);
  const { realizedPnl, exitPrice } = await computeCloseResult(
    symbol,
    closeResult.orderIds,
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
