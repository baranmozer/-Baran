import { config, getLeverageForSymbol, getSymbolCategory } from "./config.js";
import {
  getFuturesCandles,
  getFuturesPrice,
  getOpenPosition,
  getRecentOrders,
  getUserTrades,
  getFuturesAccountSummary,
  getAllFuturesSymbols,
  cancelAlgoOrder,
} from "./binanceFuturesClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { handleFuturesBuy, handleFuturesShort, handleFuturesSell, moveStopLoss, log } from "./futuresTradeActions.js";
import { getPositionMeta, setPositionMeta, clearPositionMeta, getAllTrackedSymbols } from "./futuresStopOrderStore.js";
import { appendTradeHistory, getTradeHistory, getLastCloseTime } from "./futuresTradeHistoryStore.js";
import { discoverOpportunityCoins, discoverTopVolumeCoins } from "./futuresOpportunityDiscovery.js";
import {
  addPendingApproval,
  hasPendingApproval,
  clearExpiredApprovals,
  getPendingApprovals,
} from "./futuresPendingApprovalStore.js";
import {
  addPendingCloseApproval,
  hasPendingCloseApproval,
  clearExpiredCloseApprovals,
} from "./futuresPendingCloseApprovalStore.js";
import { computeSuggestedLeverage } from "./futuresRiskManager.js";
import { calculateAtr } from "./indicators.js";
import { RiskRejection } from "./riskManager.js";
import type { FuturesCloseReason } from "./types.js";

let discoveredSymbols: string[] = [];
let topVolumeSymbols: string[] = [];
let allFuturesSymbols: string[] = [];

/**
 * Bazi semboller (orn. tokenize hisse senedi bazli "TradFi Perps" urunleri)
 * Binance'in hesap uzerinden ayrica onaylanmasi gereken bir sozlesme
 * gerektiriyor (-4411 hatasi) - bu bizim kodumuzun cozebilecegi bir sey
 * degil. Boyle bir hata alinca sembolu kalici olarak (bot yeniden
 * baslayana kadar) tarama disi birakariz, boylece surekli ayni hataya
 * carpip durmayiz.
 */
const blockedSymbols = new Set<string>();

function isComplianceRejection(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return message.includes("-4411") || message.toLowerCase().includes("tradfi");
}

export function blockSymbolPermanently(symbol: string, reason: string): void {
  if (blockedSymbols.has(symbol)) return;
  blockedSymbols.add(symbol);
  log(`${symbol} kalici olarak tarama disi birakildi (bot yeniden baslayana kadar)`, { reason });
}

interface TickContext {
  dailyLossLimitHit: boolean;
  openPositionCount: number;
  directionCounts: { long: number; short: number };
}

/** FUTURES_ALLOWED_SYMBOLS=ALL modunda, Binance'teki tum USDT-M perpetual sembolleri ceker. */
async function refreshAllSymbols(): Promise<void> {
  if (!config.futures.tradeAllSymbolsEnabled) return;
  try {
    allFuturesSymbols = await getAllFuturesSymbols();
    log(`Tum semboller modu: ${allFuturesSymbols.length} USDT-M perpetual sembol yuklendi`);
  } catch (err) {
    log("Tum sembolleri cekme basarisiz", err);
  }
}

function baseSymbolsToWatch(): string[] {
  return config.futures.tradeAllSymbolsEnabled ? allFuturesSymbols : config.futures.allowedSymbols;
}

async function refreshDiscovery(): Promise<void> {
  if (!config.futures.autoDiscoverEnabled) return;
  try {
    const found = await discoverOpportunityCoins([...baseSymbolsToWatch(), ...topVolumeSymbols]);
    const added = found.filter((s) => !discoveredSymbols.includes(s));
    const removed = discoveredSymbols.filter((s) => !found.includes(s));
    if (added.length > 0) log("Yeni firsat coin(ler) eklendi", added);
    if (removed.length > 0) log("Firsat coin(ler) listeden cikti (pozisyon acikca devam eder)", removed);
    discoveredSymbols = found;
  } catch (err) {
    log("Firsat coin taramasi basarisiz", err);
  }
}

/** En yuksek 24s islem hacmine sahip coinleri tarama havuzuna ekler. */
async function refreshTopVolume(): Promise<void> {
  if (!config.futures.topVolumeEnabled) return;
  try {
    const found = await discoverTopVolumeCoins(baseSymbolsToWatch());
    const added = found.filter((s) => !topVolumeSymbols.includes(s));
    const removed = topVolumeSymbols.filter((s) => !found.includes(s));
    if (added.length > 0) log(`Hacim listesine ${added.length} yeni coin eklendi`, added);
    if (removed.length > 0) log(`Hacim listesinden ${removed.length} coin cikti (pozisyon acikca devam eder)`, removed);
    topVolumeSymbols = found;
  } catch (err) {
    log("Hacim taramasi basarisiz", err);
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

/** Altcoinler BTC ile korele hareket eder - tek bir piyasa hareketinin tum
 *  pozisyonlari ayni anda vurmasini onlemek icin yon bazinda da sayiyoruz. */
async function countOpenPositionsByDirection(): Promise<{ long: number; short: number }> {
  const tracked = getAllTrackedSymbols();
  const results = await Promise.all(tracked.map((s) => getOpenPosition(s)));
  let long = 0;
  let short = 0;
  for (const position of results) {
    if (!position) continue;
    if (position.positionAmt > 0) long++;
    else short++;
  }
  return { long, short };
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

  // Bu await sirasinda ayni pozisyon manuel/otomatik baska bir yoldan
  // (handleFuturesSell) zaten kapatilip meta temizlenmis olabilir - boyle
  // bir yaris durumunda ayni kapanisi iki kez kaydetmemek icin tekrar kontrol ederiz.
  if (!getPositionMeta(symbol)) return;

  clearPositionMeta(symbol);

  // Hangi tetiklendiyse (stop-loss ya da kar-al), digeri hala Binance'te
  // acik kalmis olabilir - pozisyon kapandigi icin artik anlamsiz, iptal edelim.
  if (meta.algoId) {
    try {
      await cancelAlgoOrder(meta.algoId);
    } catch {
      // zaten tetiklenmis/yok - sorun degil
    }
  }
  if (meta.takeProfitAlgoId) {
    try {
      await cancelAlgoOrder(meta.takeProfitAlgoId);
    } catch {
      // zaten tetiklenmis/yok - sorun degil
    }
  }

  try {
    const orders = await getRecentOrders(symbol, 5);
    const lastFilled = [...orders].reverse().find((o: any) => o.status === "FILLED");
    let reason: FuturesCloseReason =
      lastFilled?.origType === "LIQUIDATION"
        ? "LIQUIDATION"
        : lastFilled?.origType === "TAKE_PROFIT_MARKET"
        ? "TAKE_PROFIT"
        : "STOP_LOSS";
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
    // Detay (gercek fill/pnl) alinamadi - yine de kapanisi kaydetmezsek
    // islem gecmisinden tamamen kaybolur. Tahmini bir kayitla en azindan
    // "bu pozisyon su tarihte kapandi, yaklasik pnl su" bilgisini tutariz.
    log("Dis kapanma tespit edildi, detay alinamadi - tahmini deger kullaniliyor", { symbol, err });
    try {
      const fallbackPrice = await getFuturesPrice(symbol);
      const estimatedPnl = (fallbackPrice - meta.entryPrice) * meta.quantity * (meta.direction === "LONG" ? 1 : -1);
      const estimatedPnlPercent =
        ((fallbackPrice - meta.entryPrice) / meta.entryPrice) * 100 * (meta.direction === "LONG" ? 1 : -1);
      appendTradeHistory({
        symbol,
        direction: meta.direction,
        entryPrice: meta.entryPrice,
        exitPrice: fallbackPrice,
        quantity: meta.quantity,
        pnlUsdt: Number(estimatedPnl.toFixed(4)),
        pnlPercent: Number(estimatedPnlPercent.toFixed(2)),
        reason: "UNKNOWN",
        closedAt: new Date().toISOString(),
      });
    } catch (fallbackErr) {
      // Fiyat bile cekilemedi (agirlikli bir API sorunu) - yine de kaydi
      // tamamen kaybetmemek icin giris fiyatiyla (0 pnl, acikca isaretli)
      // bir yer tutucu kayit dusuyoruz. Hicbir kapanis sessizce kaybolmasin.
      log("Fiyat da alinamadi, giris fiyatiyla yer tutucu kayit dusuluyor", { symbol, fallbackErr });
      appendTradeHistory({
        symbol,
        direction: meta.direction,
        entryPrice: meta.entryPrice,
        exitPrice: meta.entryPrice,
        quantity: meta.quantity,
        pnlUsdt: 0,
        pnlPercent: 0,
        reason: "UNKNOWN",
        closedAt: new Date().toISOString(),
      });
    }
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
 * Pozisyon kar yuzdesi esigine (FUTURES_PROFIT_APPROVAL_THRESHOLD_PERCENT)
 * ulasinca, otomatik satmak yerine dashboard'da "satayim mi satmayim mi"
 * diye bir kez onay bekleyen kayit olusturur. Ayni pozisyon icin bir daha
 * sorulmaz (meta.profitApprovalRequested).
 */
async function checkProfitApproval(symbol: string): Promise<void> {
  if (!config.futures.profitApprovalEnabled) return;

  const meta = getPositionMeta(symbol);
  if (!meta || meta.profitApprovalRequested) return;

  const position = await getOpenPosition(symbol);
  if (!position) return;

  const currentPrice = await getFuturesPrice(symbol);
  const pnlPercent =
    ((currentPrice - meta.entryPrice) / meta.entryPrice) * 100 * (meta.direction === "LONG" ? 1 : -1);

  if (pnlPercent < config.futures.profitApprovalThresholdPercent) return;
  if (hasPendingCloseApproval(symbol)) return;

  const pnlUsdt = (currentPrice - meta.entryPrice) * meta.quantity * (meta.direction === "LONG" ? 1 : -1);

  addPendingCloseApproval({
    symbol,
    direction: meta.direction,
    pnlPercent: Number(pnlPercent.toFixed(2)),
    pnlUsdt: Number(pnlUsdt.toFixed(2)),
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + config.futures.profitApprovalExpiryMinutes * 60000).toISOString(),
  });
  setPositionMeta(symbol, { ...meta, profitApprovalRequested: true });
  log("Kar hedefine ulasildi, satis onayi bekleniyor (dashboard'dan sat/tut)", {
    symbol,
    pnlPercent: Number(pnlPercent.toFixed(2)),
  });
}

interface EntryCandidate {
  symbol: string;
  direction: "LONG" | "SHORT";
  score: number;
  adxValue: number;
  leverage: number;
  leverageReason: string;
  price: number;
  votesText: string;
}

/**
 * Acik pozisyon varken indikator guclu sekilde ters yone donerse HEMEN
 * kapatir - kar/zararda olmasi fark etmez. Pozisyon yokken: cooldown ve
 * ADX filtresinden gecen sembolleri "giris adayi" olarak doner (henuz
 * ACMAZ) - tum semboller tarandiktan sonra tick() en guclu adaylari
 * (skor buyuklugune gore) once acar, boylece sinirli slot sayisi
 * (FUTURES_MAX_CONCURRENT_POSITIONS) rastgele/sira ile degil, en iyi
 * sinyallerle dolar.
 */
async function evaluateSymbol(symbol: string, ctx: TickContext): Promise<EntryCandidate | null> {
  if (blockedSymbols.has(symbol)) return null;

  const allCandles = await getFuturesCandles(symbol, config.futures.candleInterval, config.futures.candleLookback + 1);
  const candles = allCandles.slice(0, -1);
  const result = computeConfluenceSignal(candles, config.futures.buyThreshold, config.futures.sellThreshold);

  const existing = await getOpenPosition(symbol);

  if (existing) {
    const isLong = existing.positionAmt > 0;
    const scoreAgainstPosition = isLong ? result.score < 0 : result.score > 0;
    // Sadece skorun isareti degil, ters sinyalin de gercekten guclu olmasi
    // (esigi gecmis VE ADX yeterli) gerekir - zayif/gurultulu bir kipirdama
    // yuzunden pozisyonu erken kapatip whipsaw'a girmeyi onler.
    const reversalIsStrong =
      scoreAgainstPosition &&
      result.signal !== null &&
      result.adxValue !== null &&
      result.adxValue >= config.futures.minAdxForEntry;
    if (reversalIsStrong) {
      log("Indikator guclu sekilde ters yone dondu, pozisyon erken kapatiliyor", {
        symbol,
        direction: isLong ? "LONG" : "SHORT",
        score: Number(result.score.toFixed(2)),
        adxValue: result.adxValue,
        unrealizedProfit: existing.unrealizedProfit,
      });
      await handleFuturesSell(symbol, "SIGNAL_FLATTEN");
      ctx.openPositionCount = Math.max(0, ctx.openPositionCount - 1);
      if (isLong) ctx.directionCounts.long = Math.max(0, ctx.directionCounts.long - 1);
      else ctx.directionCounts.short = Math.max(0, ctx.directionCounts.short - 1);
    }
    return null;
  }

  if (!result.signal) return null;

  if (config.futures.reentryCooldownMinutes > 0) {
    const lastCloseTime = getLastCloseTime(symbol);
    if (lastCloseTime !== null) {
      const minutesSinceClose = (Date.now() - lastCloseTime) / 60000;
      if (minutesSinceClose < config.futures.reentryCooldownMinutes) {
        return null;
      }
    }
  }

  if (result.adxValue === null || result.adxValue < config.futures.minAdxForEntry) {
    return null;
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

  return {
    symbol,
    direction: result.signal === "BUY" ? "LONG" : "SHORT",
    score: result.score,
    adxValue: result.adxValue,
    leverage,
    leverageReason,
    price: candles[candles.length - 1].close,
    votesText: result.votes.map((v) => `${v.name}=${v.vote}`).join(", "),
  };
}

/** Siralanmis adaylar listesinden, portfoy limitlerini (gunluk zarar, max
 *  pozisyon, yon cesitliligi) gecebilenleri sirayla acar (ya da onay
 *  bekleyen mod actiksa onay kuyrugu olusturur). */
async function tryOpenCandidate(candidate: EntryCandidate, ctx: TickContext): Promise<void> {
  const { symbol, direction, score, adxValue, leverage, leverageReason, price, votesText } = candidate;

  log("Confluence sinyali", {
    symbol,
    signal: direction === "LONG" ? "BUY" : "SELL",
    score: Number(score.toFixed(2)),
    adxValue,
    suggestedLeverage: leverage,
    leverageReason,
    price,
    oylar: votesText,
  });

  if (ctx.dailyLossLimitHit) {
    log("Gunluk zarar limitine ulasildi, yeni islem acilmiyor", { symbol });
    return;
  }

  if (config.futures.maxConcurrentPositions > 0 && ctx.openPositionCount >= config.futures.maxConcurrentPositions) {
    log("Max pozisyon sinirina ulasildi, yeni islem acilmiyor (daha guclu adaylar slotlari doldurdu)", {
      symbol,
      openPositionCount: ctx.openPositionCount,
      max: config.futures.maxConcurrentPositions,
    });
    return;
  }

  if (config.futures.maxConcurrentPositions > 0 && config.futures.maxSameDirectionPercent < 100) {
    const maxSameDirection = Math.max(
      1,
      Math.floor((config.futures.maxConcurrentPositions * config.futures.maxSameDirectionPercent) / 100)
    );
    const currentSameDirection = direction === "LONG" ? ctx.directionCounts.long : ctx.directionCounts.short;
    if (currentSameDirection + 1 > maxSameDirection) {
      log("Yon cesitliligi sinirina ulasildi (korelasyon riski), yeni islem acilmiyor", {
        symbol,
        direction,
        currentSameDirection,
        maxSameDirection,
      });
      return;
    }
  }

  if (config.futures.approvalModeEnabled) {
    if (hasPendingApproval(symbol)) return; // zaten onay bekliyor, tekrar ekleme
    if (config.futures.maxPendingApprovals > 0 && getPendingApprovals().length >= config.futures.maxPendingApprovals) {
      log("Onay kuyrugu dolu, bu aday atlaniyor (kuyruktakiler cevaplaninca yer acilir)", {
        symbol,
        score: Number(score.toFixed(2)),
        kuyrukSinir: config.futures.maxPendingApprovals,
      });
      return;
    }
    addPendingApproval({
      symbol,
      direction,
      score: Number(score.toFixed(2)),
      suggestedLeverage: leverage,
      suggestedPositionSizePercent: config.futures.positionSizePercent,
      category: getSymbolCategory(symbol),
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + config.futures.approvalExpiryMinutes * 60000).toISOString(),
    });
    log("Onay bekleyen yeni sinyal olusturuldu (dashboard'dan onayla/reddet)", { symbol, suggestedLeverage: leverage });
    return;
  }

  const overrides = { leverage };
  try {
    if (direction === "LONG") {
      await handleFuturesBuy(symbol, config.futures.stopLossPercent, overrides);
    } else {
      await handleFuturesShort(symbol, config.futures.stopLossPercent, overrides);
    }
  } catch (err) {
    if (isComplianceRejection(err)) {
      blockSymbolPermanently(symbol, "Binance TradFi-Perps sozlesme onayi gerekiyor (-4411)");
      return;
    }
    throw err;
  }
  ctx.openPositionCount += 1;
  if (direction === "LONG") ctx.directionCounts.long += 1;
  else ctx.directionCounts.short += 1;
}

async function tick() {
  if (config.futures.approvalModeEnabled) {
    const expired = clearExpiredApprovals();
    for (const p of expired) {
      log("Onay bekleyen sinyalin suresi doldu, iptal edildi", { symbol: p.symbol, direction: p.direction });
    }
  }

  if (config.futures.profitApprovalEnabled) {
    const expiredCloseApprovals = clearExpiredCloseApprovals();
    for (const p of expiredCloseApprovals) {
      log("Kar onayi suresi doldu, pozisyon normal yonetime devam ediyor", { symbol: p.symbol, pnlPercent: p.pnlPercent });
    }
  }

  const symbolsToWatch = Array.from(
    new Set([...baseSymbolsToWatch(), ...discoveredSymbols, ...topVolumeSymbols, ...getAllTrackedSymbols()])
  );

  const ctx: TickContext = {
    dailyLossLimitHit: await isDailyLossLimitReached(),
    openPositionCount: await countOpenPositions(),
    directionCounts: await countOpenPositionsByDirection(),
  };

  const candidates: EntryCandidate[] = [];

  // Semboller tek tek (sirayla) degil, kucuk gruplar halinde paralel
  // islenir - onceden ~57 coin'i sirayla taramak (her biri birkac Binance
  // istegi yapiyor) tick basina cok uzun surebiliyordu, tek bir sembolde
  // yasanan gecikme/timeout butun taramayi kilitliyordu. Ayni anda cok
  // fazla istek atip Binance rate-limit'ine takilmamak icin grup boyutu
  // sinirli tutulur.
  const TICK_CONCURRENCY = 8;
  for (let i = 0; i < symbolsToWatch.length; i += TICK_CONCURRENCY) {
    const batch = symbolsToWatch.slice(i, i + TICK_CONCURRENCY);
    const batchResults = await Promise.all(
      batch.map(async (symbol): Promise<EntryCandidate | null> => {
        try {
          await reconcileExternalClose(symbol);
          const closedByTakeProfit = await checkTakeProfit(symbol);
          if (closedByTakeProfit) return null;
          await manageBreakevenAndTrailing(symbol);
          await checkProfitApproval(symbol);
          return await evaluateSymbol(symbol, ctx);
        } catch (err) {
          if (err instanceof RiskRejection) {
            log(`Reddedildi (${symbol}):`, err.message);
          } else {
            log(`Hata (${symbol}):`, err);
          }
          return null;
        }
      })
    );
    for (const candidate of batchResults) {
      if (candidate) candidates.push(candidate);
    }
  }

  // En guclu sinyalden zayifa dogru sirala - sinirli slot sayisi
  // (FUTURES_MAX_CONCURRENT_POSITIONS) rastgele degil, en iyi adaylarla dolsun.
  candidates.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
  if (candidates.length > 0) {
    log(`${candidates.length} giris adayi bulundu, en guclulerden baslanacak`, {
      siralama: candidates.map((c) => `${c.symbol}(${c.score.toFixed(2)})`).join(", "),
    });
  }

  for (const candidate of candidates) {
    try {
      await tryOpenCandidate(candidate, ctx);
    } catch (err) {
      if (err instanceof RiskRejection) {
        log(`Reddedildi (${candidate.symbol}):`, err.message);
      } else {
        log(`Hata (${candidate.symbol}):`, err);
      }
    }
  }
}

export async function startFuturesStrategyEngine() {
  if (!config.futures.enabled) {
    log("Futures modulu devre disi (BINANCE_FUTURES_ENABLED=false)");
    return;
  }
  if (!config.futures.tradeAllSymbolsEnabled && config.futures.allowedSymbols.length === 0) {
    log("Futures modulu acik ama FUTURES_ALLOWED_SYMBOLS bos, hicbir sey yapilmiyor");
    return;
  }

  if (config.futures.tradeAllSymbolsEnabled) {
    await refreshAllSymbols();
    // Yuzlerce sembol her tick'te taranacagi icin API agirlik/rate-limit
    // riskini azaltmak amaciyla liste saatte bir yenilenir (sik degismez).
    setInterval(refreshAllSymbols, 60 * 60 * 1000);
  }

  log("Futures strateji motoru basladi (LONG+SHORT, hassas cikis)", {
    leverage: config.futures.leverage,
    marginType: config.futures.marginType,
    symbols: config.futures.tradeAllSymbolsEnabled ? `ALL (${allFuturesSymbols.length} sembol)` : config.futures.allowedSymbols,
    autoDiscover: config.futures.autoDiscoverEnabled,
    topVolumeEnabled: config.futures.topVolumeEnabled,
    topVolumeCount: config.futures.topVolumeCount,
    breakeven: config.futures.breakevenEnabled,
    trailing: config.futures.trailingEnabled,
    minAdxForEntry: config.futures.minAdxForEntry,
    dailyMaxLossPercent: config.futures.dailyMaxLossPercent,
    maxConcurrentPositions: config.futures.maxConcurrentPositions,
    pollSeconds: config.futures.pollIntervalSeconds,
  });

  refreshTopVolume();
  refreshDiscovery();
  tick();
  setInterval(tick, config.futures.pollIntervalSeconds * 1000);
  setInterval(refreshDiscovery, config.futures.discoverIntervalMinutes * 60 * 1000);
  setInterval(refreshTopVolume, config.futures.discoverIntervalMinutes * 60 * 1000);
}
