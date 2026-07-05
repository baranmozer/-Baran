import type { Candle } from "./types.js";
import {
  calculateEma,
  calculateSma,
  calculateRsi,
  calculateMacd,
  calculateBollingerBands,
  calculateVwap,
  calculateStochasticRsi,
  calculateAdx,
  calculateParabolicSar,
  calculateSupertrend,
  calculateIchimoku,
  calculateFibonacciRetracement,
  detectFairValueGaps,
} from "./indicators.js";

export interface IndicatorVote {
  name: string;
  vote: number;
  weight: number;
}

export interface ConfluenceResult {
  score: number;
  votes: IndicatorVote[];
  signal: "BUY" | "SELL" | null;
  /** ADX degeri (trend gucu); hesaplanamadiysa null. Giris filtresi icin kullanilir. */
  adxValue: number | null;
}

/**
 * Butun indikatorlerin agirlikli oyuyla tek bir skor uretir (-1..1 civari).
 * Her indikator kendi mantigina gore +1 (yukselis), -1 (dusus) ya da 0
 * (notr/belirsiz) oy verir; net skor buyThreshold/sellThreshold'i asarsa
 * sinyal olusur.
 */
export function computeConfluenceSignal(
  candles: Candle[],
  buyThreshold: number,
  sellThreshold: number
): ConfluenceResult {
  const closes = candles.map((c) => c.close);
  const highs = candles.map((c) => c.high);
  const lows = candles.map((c) => c.low);
  const last = closes.length - 1;
  const price = closes[last];
  const votes: IndicatorVote[] = [];

  const emaFast = calculateEma(closes, 9);
  const emaSlow = calculateEma(closes, 21);
  votes.push({ name: "EMA(9/21)", vote: emaFast[last] > emaSlow[last] ? 1 : -1, weight: 2 });

  const sma50 = calculateSma(closes, 50);
  if (!Number.isNaN(sma50[last])) {
    votes.push({ name: "SMA50", vote: price > sma50[last] ? 1 : -1, weight: 1 });
  }

  const macd = calculateMacd(closes);
  if (!Number.isNaN(macd.histogram[last])) {
    votes.push({ name: "MACD", vote: macd.histogram[last] > 0 ? 1 : -1, weight: 1.5 });
  }

  const rsi = calculateRsi(closes);
  if (!Number.isNaN(rsi[last])) {
    let v = 0;
    if (rsi[last] < 30) v = 1;
    else if (rsi[last] > 70) v = -1;
    votes.push({ name: "RSI", vote: v, weight: 1 });
  }

  const stochRsi = calculateStochasticRsi(closes);
  if (!Number.isNaN(stochRsi.k[last])) {
    let v = 0;
    if (stochRsi.k[last] < 20) v = 1;
    else if (stochRsi.k[last] > 80) v = -1;
    votes.push({ name: "StochRSI", vote: v, weight: 1 });
  }

  const bb = calculateBollingerBands(closes);
  if (!Number.isNaN(bb.upper[last])) {
    let v = 0;
    if (price <= bb.lower[last]) v = 1;
    else if (price >= bb.upper[last]) v = -1;
    votes.push({ name: "Bollinger", vote: v, weight: 1 });
  }

  const adx = calculateAdx(highs, lows, closes);
  const adxValue = Number.isNaN(adx.adx[last]) ? null : adx.adx[last];
  if (adxValue !== null && adxValue > 20) {
    votes.push({ name: "ADX/DI", vote: adx.plusDI[last] > adx.minusDI[last] ? 1 : -1, weight: 2 });
  }

  const psar = calculateParabolicSar(highs, lows);
  if (!Number.isNaN(psar[last])) {
    votes.push({ name: "ParabolicSAR", vote: price > psar[last] ? 1 : -1, weight: 1.5 });
  }

  const supertrend = calculateSupertrend(highs, lows, closes);
  if (supertrend.trend[last]) {
    votes.push({ name: "Supertrend", vote: supertrend.trend[last] === "UP" ? 1 : -1, weight: 2 });
  }

  const ichimoku = calculateIchimoku(highs, lows);
  const spanA = ichimoku.senkouSpanA[last];
  const spanB = ichimoku.senkouSpanB[last];
  if (!Number.isNaN(spanA) && !Number.isNaN(spanB)) {
    const cloudTop = Math.max(spanA, spanB);
    const cloudBottom = Math.min(spanA, spanB);
    let v = 0;
    if (price > cloudTop) v = 1;
    else if (price < cloudBottom) v = -1;
    votes.push({ name: "Ichimoku", vote: v, weight: 1.5 });
  }

  const vwap = calculateVwap(candles);
  votes.push({ name: "VWAP", vote: price > vwap[last] ? 1 : -1, weight: 1 });

  if (closes.length >= 20) {
    const fib = calculateFibonacciRetracement(highs, lows, 20);
    const tolerance = price * 0.005;
    let v = 0;
    if (Math.abs(price - fib.level618) < tolerance || Math.abs(price - fib.level5) < tolerance) v = 0.5;
    else if (Math.abs(price - fib.level236) < tolerance || Math.abs(price - fib.level382) < tolerance) v = -0.5;
    votes.push({ name: "Fibonacci", vote: v, weight: 1 });
  }

  const fvgs = detectFairValueGaps(candles.slice(-30));
  if (fvgs.length > 0) {
    const nearestSupport = [...fvgs].reverse().find((g) => g.type === "BULLISH" && g.top <= price);
    const nearestResistance = [...fvgs].reverse().find((g) => g.type === "BEARISH" && g.bottom >= price);
    let v = 0;
    if (nearestSupport && (price - nearestSupport.top) / price < 0.01) v = 0.5;
    if (nearestResistance && (nearestResistance.bottom - price) / price < 0.01) v = -0.5;
    votes.push({ name: "FVG", vote: v, weight: 1 });
  }

  const totalWeight = votes.reduce((sum, v) => sum + v.weight, 0);
  const weightedSum = votes.reduce((sum, v) => sum + v.vote * v.weight, 0);
  const score = totalWeight === 0 ? 0 : weightedSum / totalWeight;

  let signal: "BUY" | "SELL" | null = null;
  if (score >= buyThreshold) signal = "BUY";
  else if (score <= sellThreshold) signal = "SELL";

  return { score, votes, signal, adxValue };
}
