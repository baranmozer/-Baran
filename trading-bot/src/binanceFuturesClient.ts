import crypto from "node:crypto";
import { config } from "./config.js";
import type { Candle, SymbolFilters } from "./types.js";

function sign(query: string): string {
  return crypto.createHmac("sha256", config.futures.apiSecret).update(query).digest("hex");
}

async function signedRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  params: Record<string, string | number | boolean> = {}
): Promise<any> {
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now()),
    recvWindow: "5000",
  }).toString();
  const signature = sign(query);
  const url = `${config.futures.baseUrl}${path}?${query}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": config.futures.apiKey },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Binance Futures API hatasi (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function publicRequest(path: string, params: Record<string, string> = {}): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${config.futures.baseUrl}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url);
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

  return {
    stepSize: Number(lotSize?.stepSize ?? 0.001),
    minQty: Number(lotSize?.minQty ?? 0),
    tickSize: Number(priceFilter?.tickSize ?? 0.01),
  };
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

export async function cancelAlgoOrder(algoId: number) {
  return signedRequest("DELETE", "/fapi/v1/algoOrder", { algoId });
}

/** Son emirleri doner - kapanmanin stop-loss mi likidasyon mu oldugunu anlamak icin (origType alani). */
export async function getRecentOrders(symbol: string, limit = 5): Promise<any[]> {
  return signedRequest("GET", "/fapi/v1/allOrders", { symbol, limit });
}

/** Gerceklesen islemleri (fill'leri) doner - realizedPnl ve ortalama fiyat icin. */
export async function getUserTrades(symbol: string, limit = 10): Promise<any[]> {
  return signedRequest("GET", "/fapi/v1/userTrades", { symbol, limit });
}
