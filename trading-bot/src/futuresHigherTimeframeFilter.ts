import { getFuturesCandles } from "./binanceFuturesClient.js";
import { calculateEma } from "./indicators.js";

/**
 * 15 dakikalik grafikteki sinyaller kisa vadede gurultulu olabilir - fiyat
 * birkac mum icinde yon degistirip pozisyonu whipsaw'a (sinyal geldi, hemen
 * tersine dondu, zararla kapandi) sokabilir. Bu filtre, bir islem acilmadan
 * once gunluk/haftalik/aylik grafiklerdeki ana trendin de ayni yonde olup
 * olmadigini kontrol eder.
 *
 * Not: Binance'te "yillik" mum araligi yok (en buyuk aralik 1M/aylik) -
 * gunluk + haftalik + aylik kombinasyonu pratikte uzun vadeli trendi
 * yeterince temsil eder.
 */

interface CachedBias {
  bias: number;
  expiresAt: number;
}

const cache = new Map<string, CachedBias>();
// Bu zaman dilimlerinde (gun/hafta/ay) trend hizli degismez - her tick'te
// (60sn) yeniden hesaplamak gereksiz API yukudur, birkac saatte bir yeter.
const CACHE_TTL_MS = 4 * 60 * 60 * 1000;

function trendDirection(closes: number[]): number {
  if (closes.length < 25) return 0;
  const emaFast = calculateEma(closes, 9);
  const emaSlow = calculateEma(closes, 21);
  const last = emaFast.length - 1;
  if (emaFast[last] > emaSlow[last]) return 1;
  if (emaFast[last] < emaSlow[last]) return -1;
  return 0;
}

async function computeBias(symbol: string): Promise<number> {
  const [daily, weekly, monthly] = await Promise.all([
    getFuturesCandles(symbol, "1d", 60),
    getFuturesCandles(symbol, "1w", 60),
    getFuturesCandles(symbol, "1M", 36),
  ]);
  return (
    trendDirection(daily.map((c) => c.close)) +
    trendDirection(weekly.map((c) => c.close)) +
    trendDirection(monthly.map((c) => c.close))
  );
}

/**
 * -3..+3 dondurur (pozitif yukari, negatif asagi ana trend agirligi).
 * Veri alinamazsa `null` doner - bu, gercek bir "notr" (0) okumadan
 * farklidir: cagiran taraf `null` durumunda filtreyi uygulamamali (bir API
 * sorunu yuzunden tum islemleri engellememek icin), ama gercek 0 (ust zaman
 * dilimleri gercekten karisik/yatay) durumunda normal sekilde engellemelidir.
 */
export async function getHigherTimeframeBias(symbol: string): Promise<number | null> {
  const cached = cache.get(symbol);
  if (cached && cached.expiresAt > Date.now()) return cached.bias;

  try {
    const bias = await computeBias(symbol);
    cache.set(symbol, { bias, expiresAt: Date.now() + CACHE_TTL_MS });
    return bias;
  } catch {
    return null;
  }
}

/** LONG icin en az 2/3, SHORT icin en az 2/3 ust zaman dilimi ayni yonde olmali. */
export function isAlignedWithHigherTimeframe(direction: "LONG" | "SHORT", bias: number): boolean {
  return direction === "LONG" ? bias >= 2 : bias <= -2;
}
