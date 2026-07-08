import crypto from "node:crypto";
import { config } from "./config.js";
import { fetchWithRetry } from "./httpRetry.js";
import type { Candle, SymbolFilters } from "./types.js";

function sign(query: string): string {
  return crypto.createHmac("sha256", config.futures.apiSecret).update(query).digest("hex");
}

// Windows'un sistem saati Binance sunucusuna gore kayabiliyor (-1021 hatasi) -
// ozellikle uyku/uyanma dongulerinde saat sicramasi sik oluyor. Sunucu
// saatiyle farki periyodik olceriz ve timestamp'e bu farki ekleriz.
let serverTimeOffsetMs = 0;
let lastTimeSyncAt = 0;
const TIME_SYNC_INTERVAL_MS = 5 * 60 * 1000;

async function syncServerTime(): Promise<void> {
  try {
    const res = await fetchWithRetry(`${config.futures.baseUrl}/fapi/v1/time`);
    const body = await res.json();
    if (typeof body?.serverTime === "number") {
      serverTimeOffsetMs = body.serverTime - Date.now();
    }
  } catch {
    // Senkronizasyon basarisiz olursa bilinen son farki kullanmaya devam et.
  } finally {
    lastTimeSyncAt = Date.now();
  }
}

async function signedRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<any> {
  if (lastTimeSyncAt === 0 || Date.now() - lastTimeSyncAt > TIME_SYNC_INTERVAL_MS) {
    await syncServerTime();
  }
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now() + serverTimeOffsetMs),
    // Binance'in izin verdigi ust sinir (60000ms) - kucuk saat kaymalarinda/
    // ag gecikmelerinde -1021 hatasi almamak icin genis tutuldu.
    recvWindow: "60000",
  }).toString();
  const signature = sign(query);
  const url = `${config.futures.baseUrl}${path}?${query}&signature=${signature}`;

  const res = await fetchWithRetry(url, {
    method,
    headers: { "X-MBX-APIKEY": config.futures.apiKey },
  });
  const body = await res.json();
  if (!res.ok) {
    // -1021: saat kaymasi - bir sonraki istekte hemen yeniden senkronize
    // olsun diye onbellegi gecersiz kiliyoruz, 5 dakikalik periyodu beklemeden.
    if (body?.code === -1021) {
      lastTimeSyncAt = 0;
    }
    throw new Error(`Binance Futures API hatasi (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function publicRequest(path: string, params: Record<string, string> = {}): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${config.futures.baseUrl}${path}${query ? `?${query}` : ""}`;
  const res = await fetchWithRetry(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Binance Futures API hatasi (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export function roundToStep(value: number, step: number): number {
  const precision = Math.max(0, Math.round(-Math.log10(step)));
  return Number((Math.floor(value / step) * step).toFixed(precision));
}

export async function getFuturesSymbolFilters(symbol: string): Promise<SymbolFilters> {
  const info = await publicRequest("/fapi/v1/exchangeInfo");
  const symbolInfo = info.symbols?.find((s: any) => s.symbol === symbol);
  if (!symbolInfo) throw new Error(`Futures sembolu bulunamadi: ${symbol}`);

  const lotSize = symbolInfo.filters.find((f: any) => f.filterType === "LOT_SIZE");
  const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === "PRICE_FILTER");
  // MARKET_LOT_SIZE, MARKET emirlerine ozel (genelde LOT_SIZE'dan daha dusuk)
  // bir maksimum miktar sinirlar - yoksa LOT_SIZE'in maxQty'sine duseriz.
  const marketLotSize = symbolInfo.filters.find((f: any) => f.filterType === "MARKET_LOT_SIZE");
  const maxQty = Number(marketLotSize?.maxQty ?? lotSize?.maxQty);

  return {
    stepSize: Number(lotSize?.stepSize ?? 0.001),
    minQty: Number(lotSize?.minQty ?? 0),
    tickSize: Number(priceFilter?.tickSize ?? 0.01),
    maxQty: Number.isFinite(maxQty) && maxQty > 0 ? maxQty : undefined,
  };
}

/** Binance Futures'ta islem gorebilen tum USDT-M perpetual sembolleri doner. */
export async function getAllFuturesSymbols(): Promise<string[]> {
  const info = await publicRequest("/fapi/v1/exchangeInfo");
  return (info.symbols ?? [])
    .filter((s: any) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT")
    .map((s: any) => s.symbol as string);
}

export async function getFuturesPrice(symbol: string): Promise<number> {
  const data = await publicRequest("/fapi/v1/ticker/price", { symbol });
  return Number(data.price);
}

export async function getFuturesCandles(symbol: string, interval: string, limit: number): Promise<Candle[]> {
  const klines = await publicRequest("/fapi/v1/klines", { symbol, interval, limit: String(limit) });
  return klines.map((k: any[]) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

export interface Ticker24hr {
  symbol: string;
  priceChangePercent: number;
  quoteVolume: number;
  lastPrice: number;
}

/** Tek bir sembolun 24 saatlik istatistiklerini doner (fiyat yuzde degisimi vb.) - dashboard fiyat kutucuklari icin. */
export async function getFutures24hrTicker(symbol: string): Promise<Ticker24hr> {
  const t = await publicRequest("/fapi/v1/ticker/24hr", { symbol });
  return {
    symbol: t.symbol,
    priceChangePercent: Number(t.priceChangePercent),
    quoteVolume: Number(t.quoteVolume),
    lastPrice: Number(t.lastPrice),
  };
}

/** Tum sembollerin 24 saatlik istatistiklerini doner - "firsat coin" taramasi icin. */
export async function get24hrTickers(): Promise<Ticker24hr[]> {
  const data = await publicRequest("/fapi/v1/ticker/24hr");
  return data.map((t: any) => ({
    symbol: t.symbol,
    priceChangePercent: Number(t.priceChangePercent),
    quoteVolume: Number(t.quoteVolume),
    lastPrice: Number(t.lastPrice),
  }));
}

export async function getAvailableUsdtBalance(): Promise<number> {
  const balances = await signedRequest("GET", "/fapi/v2/balance");
  const usdt = balances.find((b: any) => b.asset === "USDT");
  return usdt ? Number(usdt.availableBalance) : 0;
}

export interface FuturesAccountSummary {
  totalWalletBalance: number;
  availableBalance: number;
  totalMarginUsed: number;
  totalUnrealizedProfit: number;
}

/** Toplam bakiye, kullanilabilir bakiye, pozisyonlara kilitli marjin ve toplam kar/zarar. */
export async function getFuturesAccountSummary(): Promise<FuturesAccountSummary> {
  const account = await signedRequest("GET", "/fapi/v3/account");
  return {
    totalWalletBalance: Number(account.totalWalletBalance),
    availableBalance: Number(account.availableBalance),
    totalMarginUsed: Number(account.totalInitialMargin),
    totalUnrealizedProfit: Number(account.totalUnrealizedProfit),
  };
}

export interface FuturesPosition {
  symbol: string;
  positionAmt: number;
  entryPrice: number;
  liquidationPrice: number;
  leverage: number;
  unrealizedProfit: number;
}

/** Binance'te gercekten acik olan pozisyonu doner (kaynak: canli API, kendi dosyamiz degil). */
export async function getOpenPosition(symbol: string): Promise<FuturesPosition | null> {
  const positions = await signedRequest("GET", "/fapi/v3/positionRisk", { symbol });
  const position = Array.isArray(positions) ? positions[0] : positions;
  const positionAmt = Number(position?.positionAmt ?? 0);
  if (!position || positionAmt === 0) return null;

  const leverage = Number(position.leverage);

  return {
    symbol,
    positionAmt,
    entryPrice: Number(position.entryPrice),
    liquidationPrice: Number(position.liquidationPrice),
    leverage: Number.isNaN(leverage) ? config.futures.leverage : leverage,
    unrealizedProfit: Number(position.unRealizedProfit),
  };
}

export async function setLeverage(symbol: string, leverage: number) {
  return signedRequest("POST", "/fapi/v1/leverage", { symbol, leverage });
}

/**
 * Binance her sembol icin farkli bir maksimum kaldirac izin veriyor (dusuk
 * hacimli/exotic coinlerde genelde cok daha dusuk, orn. 125x yerine 20x ya
 * da daha az). Bizim hesapladigimiz "onerilen kaldirac" sadece kendi
 * config sinirlarimizi (FUTURES_MAX_AUTO_LEVERAGE vb.) biliyor, Binance'in
 * o sembole ozel gercek ust sinirini bilmiyor - bu da "Leverage X is not
 * valid" (-4028) hatasina yol aciyordu. Bu fonksiyon gercek ust siniri
 * ceker, alinamazsa guvenli bir varsayilana (config.futures.leverage) duser.
 */
export async function getMaxLeverageForSymbol(symbol: string): Promise<number> {
  try {
    const brackets = await signedRequest("GET", "/fapi/v1/leverageBracket", { symbol });
    const entry = Array.isArray(brackets) ? brackets[0] : brackets;
    const maxLeverage = Number(entry?.brackets?.[0]?.initialLeverage);
    return Number.isFinite(maxLeverage) && maxLeverage > 0 ? maxLeverage : config.futures.leverage;
  } catch {
    return config.futures.leverage;
  }
}

export async function setMarginType(symbol: string, marginType: "ISOLATED" | "CROSSED") {
  try {
    return await signedRequest("POST", "/fapi/v1/marginType", { symbol, marginType });
  } catch (err) {
    // -4046: "No need to change margin type" - zaten istenen tipte, hata sayilmaz.
    if (err instanceof Error && err.message.includes("-4046")) return;
    throw err;
  }
}

export async function marketOrder(
  symbol: string,
  side: "BUY" | "SELL",
  quantity: number,
  reduceOnly = false
) {
  return signedRequest("POST", "/fapi/v1/order", {
    symbol,
    side,
    type: "MARKET",
    quantity: quantity.toString(),
    reduceOnly,
  });
}

/**
 * Pozisyonu tamamen kapatan STOP_MARKET emri (miktar belirtmeye gerek yok).
 * Binance 2025-12-09'dan itibaren kosullu emirleri (STOP_MARKET,
 * TAKE_PROFIT_MARKET vb.) eski /fapi/v1/order'dan ayri bir "Algo Order"
 * endpoint'ine tasidi. Parametre adi da stopPrice -> triggerPrice oldu.
 * Yanit orderId degil algoId iceriyor - iptal etmek icin bunu saklamak lazim.
 */
export async function placeStopMarketClosePosition(
  symbol: string,
  side: "BUY" | "SELL",
  triggerPrice: number
): Promise<{ algoId: number }> {
  return signedRequest("POST", "/fapi/v1/algoOrder", {
    algoType: "CONDITIONAL",
    symbol,
    side,
    type: "STOP_MARKET",
    triggerPrice: triggerPrice.toString(),
    closePosition: true,
  });
}

/**
 * Kullanicinin kendi belirledigi bir fiyata ulasinca pozisyonu kapatan
 * gercek bir Binance emri - bizim tarama dongumuzu (60sn'lik gecikme,
 * insan tepki suresi) beklemeden, fiyat o seviyeye aninda dokununca tetiklenir.
 * NOT: closePosition:true yerine acik miktar + reduceOnly kullanir - ayni
 * yonde zaten bir stop-loss (closePosition:true) varsa, ikisi ayni anda
 * closePosition modunda olamaz (Binance -4130 hatasi verir); reduceOnly ile
 * ikisi celismeden yan yana durabilir.
 */
export async function placeTakeProfitMarketClosePosition(
  symbol: string,
  side: "BUY" | "SELL",
  quantity: number,
  triggerPrice: number
): Promise<{ algoId: number }> {
  return signedRequest("POST", "/fapi/v1/algoOrder", {
    algoType: "CONDITIONAL",
    symbol,
    side,
    type: "TAKE_PROFIT_MARKET",
    triggerPrice: triggerPrice.toString(),
    quantity: quantity.toString(),
    reduceOnly: true,
  });
}

export async function cancelAlgoOrder(algoId: number) {
  return signedRequest("DELETE", "/fapi/v1/algoOrder", { algoId });
}

/**
 * Bir sembolde unutulmus/yetim acik emir (orn. onceki bir pozisyondan kalma
 * stop-loss/algo emri temizlenmemisse) kalirsa, Binance yeni pozisyon
 * acilirken bazen "-4067 Position side cannot be changed if there exists
 * open orders" gibi ilgisiz gorunen ama aslinda tam bu yuzden olan bir hata
 * donduruyor. Yeni pozisyon acmadan once temiz bir sayfa icin cagrilir.
 */
export async function cancelAllOpenOrders(symbol: string) {
  return signedRequest("DELETE", "/fapi/v1/allOpenOrders", { symbol });
}

/** Son emirleri doner - kapanmanin stop-loss mi likidasyon mu oldugunu anlamak icin (origType alani). */
export async function getRecentOrders(symbol: string, limit = 5): Promise<any[]> {
  return signedRequest("GET", "/fapi/v1/allOrders", { symbol, limit });
}

/** Gerceklesen islemleri (fill'leri) doner - realizedPnl ve ortalama fiyat icin. */
export async function getUserTrades(symbol: string, limit = 10): Promise<any[]> {
  return signedRequest("GET", "/fapi/v1/userTrades", { symbol, limit });
}
