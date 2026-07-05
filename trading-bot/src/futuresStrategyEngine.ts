import { config, getLeverageForSymbol } from "./config.js";
import {
  getFuturesCandles,
  getFuturesPrice,
  getOpenPosition,
  getRecentOrders,
  getUserTrades,
  getFuturesAccountSummary,
} from "./binanceFuturesClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleFuturesBuy, handleFuturesShort, handleFuturesSell, moveStopLoss, log } from "./futuresTradeActions.js";
import { getPositionMeta, setPositionMeta, clearPositionMeta, getAllTrackedSymbols } from "./futuresStopOrderStore.js";
import { appendTradeHistory, getTradeHistory, getLastCloseTime } from "./futuresTradeHistoryStore.js";
import { discoverOpportunityCoins } from "./futuresOpportunityDiscovery.js";
import { addPendingApproval, hasPendingApproval, clearExpiredApprovals } from "./futuresPendingApprovalStore.js";
import { computeSuggestedLeverage } from "./futuresRiskManager.js";
import { calculateAtr } from "./indicators.js";
import { RiskRejection } from "./riskManager.js";
import type { FuturesCloseReason } from "./types.js";

let discoveredSymbols: string[] = [];

interface TickContext {
  dailyLossLimitHit: boolean;
  openPositionCount: number;
}

async function refreshDiscovery(): Promise<void> {
  if (!config.futures.autoDiscoverEnabled) return;
  try {
    const found = await discoverOpportunityCoins(config.futures.allowedSymbols);
    const added = found.filter((s) => !discoveredSymbols.includes(s));
    const removed = discoveredSymbols.filter((s) => !found.includes(s));
    if (added.length > 0) log("Yeni firsat coin(ler) eklendi", added);
    if (removed.length > 0) log("Firsat coin(ler) listeden cikti (pozisyon acikca devam eder)", removed);
    discoveredSymbols = found;
  } catch (err) {
    log("Firsat coin taramasi basarisiz", err);
  }
}

async function isDailyLossLimitReached(): Promise<boolean> {
  if (config.futures.dailyMaxLossPercent <= 0) return false;
  try {
    const todayStr = new Date().toDateString();
    const todaysPnl = getTradeHistory(300)
      .filter((h) => new Date(h.closedAt).toDateString() === todayStr)
      .reduce((sum, h) => sum + h.pnlUsdt, 0);
    if (todaysPnl >= 0) return false;

    const account = await getFuturesAccountSummary();
    if (account.totalWalletBalance <= 0) return false;
    const lossPercent = (Math.abs(todaysPnl) / account.totalWalletBalance) * 100;
    return lossPercent >= config.futures.dailyMaxLossPercent;
  } catch {
    return false;
  }
}

async function countOpenPositions(): Promise<number> {
  const tracked = getAllTrackedSymbols();
  const results = await Promise.all(tracked.map((s) => getOpenPosition(s)));
  return results.filter(Boolean).length;
}

/**
 * Bizim actigimiz bir pozisyon, bizim kodumuz cagirilmadan (stop-loss
 * tetiklenerek ya da likidasyonla) kapanmis olabilir. Boyle bir durumu
 * tespit edip islem gecmisine dogru sekilde (STOP_LOSS ya da LIQUIDATION
 * olarak) kaydeder.
 */
async function reconcileExternalClose(symbol: string): Promise<void> {
  const meta = getPositionMeta(symbol);
  if (!meta) return;

  const position = await getOpenPosition(symbol);
  if (position) return; // hala acik, yapacak bir sey yok

  clearPositionMeta(symbol);

  try {
    const orders = await getRecentOrders(symbol, 5);
    const lastFilled = [...orders].reverse().find((o: any) => o.status === "FILLED");
    let reason: FuturesCloseReason = lastFilled?.origType === "LIQUIDATION" ? "LIQUIDATION" : "STOP_LOSS";
    const orderAvgPrice = Number(lastFilled?.avgPrice);
    const fallbackExitPrice = orderAvgPrice > 0 ? orderAvgPrice : await getFuturesPrice(symbol);

    const trades = await getUserTrades(symbol, 5);
    const relevantTrades = lastFilled ? trades.filter((t: any) => t.orderId === lastFilled.orderId) : trades;
    const totalQty = relevantTrades.reduce((sum: number, t: any) => sum + Number(t.qty), 0);
    const realizedPnl =
      totalQty > 0
        ? relevantTrades.reduce((sum: number, t: any) => sum + Number(t.realizedPnl), 0)
        : (fallbackExitPrice - meta.entryPrice) * meta.quantity * (meta.direction === "LONG" ? 1 : -1);
    const exitPrice =
      totalQty > 0
        ? relevantTrades.reduce((sum: number, t: any) => sum + Number(t.price) * Number(t.qty), 0) / totalQty
        : fallbackExitPrice;

    const pnlPercent = ((exitPrice - meta.entryPrice) / meta.entryPrice) * 100 * (meta.direction === "LONG" ? 1 : -1);

    // Basabas/trailing stop, fiyat lehte hareket ettikten sonra stop-loss'u
    // kara donusturur - bu yuzden "STOP_LOSS" tetiklendiginde sonuc karliysa
    // bu aslinda zarar-durdurma degil kar-kilitleme'dir, ayri etiketleriz.
    if (reason === "STOP_LOSS" && realizedPnl >= 0) {
      reason = "TRAILING_STOP";
    }

    appendTradeHistory({
      symbol,
      direction: meta.direction,
      entryPrice: meta.entryPrice,
      exitPrice,
      quantity: meta.quantity,
      pnlUsdt: Number(realizedPnl.toFixed(4)),
      pnlPercent: Number(pnlPercent.toFixed(2)),
      reason,
      closedAt: new Date().toISOString(),
    });

    if (reason === "LIQUIDATION") {
      log("UYARI: pozisyon LIKIDE OLDU", { symbol, realizedPnl, exitPrice });
    } else {
      log("Stop-loss tetiklendi, pozisyon kendiliginden kapandi", { symbol, realizedPnl, exitPrice });
    }
  } catch (err) {
    log("Dis kapanma tespit edildi ama detay alinamadi", { symbol, err });
  }
}

/** Trailing aktifken sabit kar hedefini devre disi birakir (trailing onun yerini alir). */
async function checkTakeProfit(symbol: string): Promise<boolean> {
  if (config.futures.trailingEnabled) return false;

  const position = await getOpenPosition(symbol);
  if (!position) return false;

  const isLong = position.positionAmt > 0;
  const currentPrice = await getFuturesPrice(symbol);
  const targetPrice = isLong
    ? position.entryPrice * (1 + config.futures.takeProfitPercent / 100)
    : position.entryPrice * (1 - config.futures.takeProfitPercent / 100);
  const hit = isLong ? currentPrice >= targetPrice : currentPrice <= targetPrice;

  if (hit) {
    log("Kar hedefine ulasildi, pozisyon kapatiliyor", {
      symbol,
      direction: isLong ? "LONG" : "SHORT",
      entryPrice: position.entryPrice,
      currentPrice,
      targetPrice,
    });
    await handleFuturesSell(symbol, "TAKE_PROFIT");
    return true;
  }
  return false;
}

/** Basabas'a tasima ve trailing stop guncellemesi - pozisyonu kapatmaz, sadece stop-loss'u iyilestirir. */
async function manageBreakevenAndTrailing(symbol: string): Promise<void> {
  const meta = getPositionMeta(symbol);
  if (!meta) return;

  const position = await getOpenPosition(symbol);
  if (!position) return;

  const currentPrice = await getFuturesPrice(symbol);
  const isLong = meta.direction === "LONG";

  const newPeak = isLong ? Math.max(meta.peakPrice, currentPrice) : Math.min(meta.peakPrice, currentPrice);
  const favorablePercent = ((currentPrice - meta.entryPrice) / meta.entryPrice) * 100 * (isLong ? 1 : -1);

  if (
    config.futures.trailingEnabled &&
    favorablePercent >= config.futures.trailingActivationPercent
  ) {
    const candidate = isLong
      ? newPeak * (1 - config.futures.trailingDistancePercent / 100)
      : newPeak * (1 + config.futures.trailingDistancePercent / 100);
    const improves = isLong ? candidate > meta.currentStopPrice : candidate < meta.currentStopPrice;
    if (improves) {
      await moveStopLoss(symbol, { ...meta, peakPrice: newPeak }, candidate, false);
      return;
    }
  } else if (
    config.futures.breakevenEnabled &&
    !meta.movedToBreakeven &&
    favorablePercent >= config.futures.breakevenTriggerPercent
  ) {
    const improves = isLong ? meta.entryPrice > meta.currentStopPrice : meta.entryPrice < meta.currentStopPrice;
    if (improves) {
      await moveStopLoss(symbol, { ...meta, peakPrice: newPeak }, meta.entryPrice, true);
      return;
    }
  }

  if (newPeak !== meta.peakPrice) {
    setPositionMeta(symbol, { ...meta, peakPrice: newPeak });
  }
}

/**
 * Acik pozisyon varken indikator ters yone donerse (skorun isareti
 * pozisyona aykiri hale gelirse) HEMEN kapatir - kar/zararda olmasi
 * fark etmez. Pozisyon yokken yeni giris icin: ADX zorunlu filtresi,
 * gunluk zarar limiti ve max pozisyon sayisi kontrol edilir.
 */
async function evaluateSymbol(symbol: string, ctx: TickContext): Promise<void> {
  const allCandles = await getFuturesCandles(symbol, config.futures.candleInterval, config.futures.candleLookback + 1);
  const candles = allCandles.slice(0, -1);
  const result = computeConfluenceSignal(candles, config.futures.buyThreshold, config.futures.sellThreshold);

  const existing = await getOpenPosition(symbol);

  if (existing) {
    const isLong = existing.positionAmt > 0;
    const scoreAgainstPosition = isLong ? result.score < 0 : result.score > 0;
    if (scoreAgainstPosition) {
      log("Indikator ters yone dondu, pozisyon erken kapatiliyor", {
        symbol,
        direction: isLong ? "LONG" : "SHORT",
        score: Number(result.score.toFixed(2)),
        unrealizedProfit: existing.unrealizedProfit,
      });
      await handleFuturesSell(symbol, "SIGNAL_FLATTEN");
      ctx.openPositionCount = Math.max(0, ctx.openPositionCount - 1);
    }
    return;
  }

  if (!result.signal) return;

  if (config.futures.reentryCooldownMinutes > 0) {
    const lastCloseTime = getLastCloseTime(symbol);
    if (lastCloseTime !== null) {
      const minutesSinceClose = (Date.now() - lastCloseTime) / 60000;
      if (minutesSinceClose < config.futures.reentryCooldownMinutes) {
        log("Yeniden giris cooldown suresinde, islem acilmiyor", {
          symbol,
          minutesSinceClose: Number(minutesSinceClose.toFixed(1)),
          cooldownMinutes: config.futures.reentryCooldownMinutes,
        });
        return;
      }
    }
  }

  if (result.adxValue === null || result.adxValue < config.futures.minAdxForEntry) {
    log("ADX yetersiz, yatay/kararsiz piyasada islem acilmiyor", {
      symbol,
      adxValue: result.adxValue,
      minRequired: config.futures.minAdxForEntry,
    });
    return;
  }

  if (ctx.dailyLossLimitHit) {
    log("Gunluk zarar limitine ulasildi, yeni islem acilmiyor", { symbol });
    return;
  }

  if (config.futures.maxConcurrentPositions > 0 && ctx.openPositionCount >= config.futures.maxConcurrentPositions) {
    log("Max pozisyon sinirina ulasildi, yeni islem acilmiyor", {
      symbol,
      openPositionCount: ctx.openPositionCount,
      max: config.futures.maxConcurrentPositions,
    });
    return;
  }

  const baseLeverage = getLeverageForSymbol(symbol);
  let leverage = baseLeverage;
  let leverageReason = "sabit kaldirac";

  if (config.futures.autoLeverageEnabled) {
    const highs = candles.map((c) => c.high);
    const lows = candles.map((c) => c.low);
    const closes = candles.map((c) => c.close);
    const atrSeries = calculateAtr(highs, lows, closes, 14);
    const lastAtr = atrSeries[atrSeries.length - 1];
    const currentPrice = closes[closes.length - 1];
    const atrPercent = Number.isNaN(lastAtr) ? 2 : (lastAtr / currentPrice) * 100;

    const recommendation = computeSuggestedLeverage(
      baseLeverage,
      atrPercent,
      result.score,
      result.adxValue,
      config.futures.stopLossPercent
    );
    leverage = recommendation.leverage;
    leverageReason = recommendation.reason;
  }

  log("Confluence sinyali", {
    symbol,
    signal: result.signal,
    score: Number(result.score.toFixed(2)),
    adxValue: result.adxValue,
    suggestedLeverage: leverage,
    leverageReason,
    price: candles[candles.length - 1].close,
    oylar: result.votes.map((v) => `${v.name}=${v.vote}`).join(", "),
  });

  if (config.futures.approvalModeEnabled) {
    if (hasPendingApproval(symbol)) return; // zaten onay bekliyor, tekrar ekleme
    addPendingApproval({
      symbol,
      direction: result.signal === "BUY" ? "LONG" : "SHORT",
      score: Number(result.score.toFixed(2)),
      suggestedLeverage: leverage,
      suggestedPositionSizePercent: config.futures.positionSizePercent,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.futures.approvalExpiryMinutes * 60000).toISOString(),
    });
    log("Onay bekleyen yeni sinyal olusturuldu (dashboard'dan onayla/reddet)", { symbol, suggestedLeverage: leverage });
    return;
  }

  const overrides = { leverage };
  if (result.signal === "BUY") {
    await handleFuturesBuy(symbol, config.futures.stopLossPercent, overrides);
  } else {
    await handleFuturesShort(symbol, config.futures.stopLossPercent, overrides);
  }
  ctx.openPositionCount += 1;
}

async function tick() {
  if (config.futures.approvalModeEnabled) {
    const expired = clearExpiredApprovals();
    for (const p of expired) {
      log("Onay bekleyen sinyalin suresi doldu, iptal edildi", { symbol: p.symbol, direction: p.direction });
    }
  }

  const symbolsToWatch = Array.from(
    new Set([...config.futures.allowedSymbols, ...discoveredSymbols, ...getAllTrackedSymbols()])
  );

  const ctx: TickContext = {
    dailyLossLimitHit: await isDailyLossLimitReached(),
    openPositionCount: await countOpenPositions(),
  };

  for (const symbol of symbolsToWatch) {
    try {
      await reconcileExternalClose(symbol);
      const closedByTakeProfit = await checkTakeProfit(symbol);
      if (closedByTakeProfit) continue;
      await manageBreakevenAndTrailing(symbol);
      await evaluateSymbol(symbol, ctx);
    } catch (err) {
      if (err instanceof RiskRejection) {
        log(`Reddedildi (${symbol}):`, err.message);
      } else {
        log(`Hata (${symbol}):`, err);
      }
    }
  }
}

export function startFuturesStrategyEngine() {
  if (!config.futures.enabled) {
    log("Futures modulu devre disi (BINANCE_FUTURES_ENABLED=false)");
    return;
  }
  if (config.futures.allowedSymbols.length === 0) {
    log("Futures modulu acik ama FUTURES_ALLOWED_SYMBOLS bos, hicbir sey yapilmiyor");
    return;
  }

  log("Futures strateji motoru basladi (LONG+SHORT, hassas cikis)", {
    leverage: config.futures.leverage,
    marginType: config.futures.marginType,
    symbols: config.futures.allowedSymbols,
    autoDiscover: config.futures.autoDiscoverEnabled,
    breakeven: config.futures.breakevenEnabled,
    trailing: config.futures.trailingEnabled,
    minAdxForEntry: config.futures.minAdxForEntry,
    dailyMaxLossPercent: config.futures.dailyMaxLossPercent,
    maxConcurrentPositions: config.futures.maxConcurrentPositions,
    pollSeconds: config.futures.pollIntervalSeconds,
  });

  refreshDiscovery();
  tick();
  setInterval(tick, config.futures.pollIntervalSeconds * 1000);
  setInterval(refreshDiscovery, config.futures.discoverIntervalMinutes * 60 * 1000);
}
