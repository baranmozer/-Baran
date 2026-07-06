import crypto from "node:crypto";
import { config } from "./config.js";
import type { Candle, SymbolFilters } from "./types.js";

function sign(query: string): string {
  return crypto.createHmac("sha256", config.binance.apiSecret).update(query).digest("hex");
}

// Windows'un sistem saati Binance sunucusuna gore kayabiliyor (-1021 hatasi).
// Sunucu saatiyle farki periyodik olceriz ve timestamp'e bu farki ekleriz.
let serverTimeOffsetMs = 0;
let lastTimeSyncAt = 0;
const TIME_SYNC_INTERVAL_MS = 30 * 60 * 1000;

async function syncServerTime(): Promise<void> {
  try {
    const res = await fetch(`${config.binance.baseUrl}/api/v3/time`);
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
  params: Record<string, string | number> = {}
): Promise<any> {
  if (lastTimeSyncAt === 0 || Date.now() - lastTimeSyncAt > TIME_SYNC_INTERVAL_MS) {
    await syncServerTime();
  }
  const query = new URLSearchParams({
    ...Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])),
    timestamp: String(Date.now() + serverTimeOffsetMs),
    recvWindow: "10000",
  }).toString();
  const signature = sign(query);
  const url = `${config.binance.baseUrl}${path}?${query}&signature=${signature}`;

  const res = await fetch(url, {
    method,
    headers: { "X-MBX-APIKEY": config.binance.apiKey },
  });
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Binance API hatasi (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

async function publicRequest(path: string, params: Record<string, string> = {}): Promise<any> {
  const query = new URLSearchParams(params).toString();
  const url = `${config.binance.baseUrl}${path}${query ? `?${query}` : ""}`;
  const res = await fetch(url);
  const body = await res.json();
  if (!res.ok) {
    throw new Error(`Binance API hatasi (${res.status}): ${JSON.stringify(body)}`);
  }
  return body;
}

export function roundToStep(value: number, step: number): number {
  const precision = Math.max(0, Math.round(-Math.log10(step)));
  return Number((Math.floor(value / step) * step).toFixed(precision));
}

export async function getSymbolFilters(symbol: string): Promise<SymbolFilters> {
  const info = await publicRequest("/api/v3/exchangeInfo", { symbol });
  const symbolInfo = info.symbols?.[0];
  if (!symbolInfo) throw new Error(`Sembol bulunamadi: ${symbol}`);

  const lotSize = symbolInfo.filters.find((f: any) => f.filterType === "LOT_SIZE");
  const priceFilter = symbolInfo.filters.find((f: any) => f.filterType === "PRICE_FILTER");

  return {
    stepSize: Number(lotSize?.stepSize ?? 0.00001),
    minQty: Number(lotSize?.minQty ?? 0),
    tickSize: Number(priceFilter?.tickSize ?? 0.01),
  };
}

export async function getPrice(symbol: string): Promise<number> {
  const data = await publicRequest("/api/v3/ticker/price", { symbol });
  return Number(data.price);
}

/** Mum verilerini (OHLCV) eskiden yeniye siralanmis sekilde dondurur. `endTime` verilirse o zamana kadarki mumlari getirir (backtest icin sayfalama). */
export async function getCandles(symbol: string, interval: string, limit: number, endTime?: number): Promise<Candle[]> {
  const params: Record<string, string> = { symbol, interval, limit: String(limit) };
  if (endTime !== undefined) params.endTime = String(endTime);
  const klines = await publicRequest("/api/v3/klines", params);
  return klines.map((k: any[]) => ({
    openTime: Number(k[0]),
    open: Number(k[1]),
    high: Number(k[2]),
    low: Number(k[3]),
    close: Number(k[4]),
    volume: Number(k[5]),
  }));
}

/** Kapanis fiyatlarini eskiden yeniye siralanmis sekilde dondurur. */
export async function getClosePrices(symbol: string, interval: string, limit: number): Promise<number[]> {
  const candles = await getCandles(symbol, interval, limit);
  return candles.map((c) => c.close);
}

export async function getFreeBalance(asset: string): Promise<number> {
  const account = await signedRequest("GET", "/api/v3/account");
  const balance = account.balances?.find((b: any) => b.asset === asset);
  return balance ? Number(balance.free) : 0;
}

export async function marketBuyByQuote(symbol: string, quoteOrderQty: number) {
  return signedRequest("POST", "/api/v3/order", {
    symbol,
    side: "BUY",
    type: "MARKET",
    quoteOrderQty: quoteOrderQty.toFixed(2),
  });
}

export async function marketSell(symbol: string, quantity: number) {
  return signedRequest("POST", "/api/v3/order", {
    symbol,
    side: "SELL",
    type: "MARKET",
    quantity: quantity.toString(),
  });
}

export async function placeStopLossSell(symbol: string, quantity: number, stopPrice: number) {
  return signedRequest("POST", "/api/v3/order", {
    symbol,
    side: "SELL",
    type: "STOP_LOSS",
    quantity: quantity.toString(),
    stopPrice: stopPrice.toString(),
  });
}

export async function cancelOrder(symbol: string, orderId: number) {
  return signedRequest("DELETE", "/api/v3/order", { symbol, orderId });
}
