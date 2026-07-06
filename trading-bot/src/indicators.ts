import type { Candle } from "./types.js";

/** Verilen kapanis fiyatlari icin EMA serisini hesaplar (girdiyle ayni uzunlukta). */
export function calculateEma(closes: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const result: number[] = [];
  closes.forEach((price, i) => {
    if (i === 0) {
      result.push(price);
    } else {
      result.push(price * k + result[i - 1] * (1 - k));
    }
  });
  return result;
}

export type CrossoverSignal = "BUY" | "SELL" | null;

/** Son iki mumda hizli EMA'nin yavas EMA'yi kesip kesmedigine bakar. */
export function detectCrossover(fast: number[], slow: number[]): CrossoverSignal {
  const n = fast.length;
  if (n < 2 || slow.length < 2) return null;

  const prevFast = fast[n - 2];
  const prevSlow = slow[n - 2];
  const currFast = fast[n - 1];
  const currSlow = slow[n - 1];

  if (prevFast <= prevSlow && currFast > currSlow) return "BUY";
  if (prevFast >= prevSlow && currFast < currSlow) return "SELL";
  return null;
}

/** Basit hareketli ortalama (girdiyle ayni uzunlukta, ilk (period-1) deger NaN). */
export function calculateSma(closes: number[], period: number): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  for (let i = period - 1; i < closes.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    result[i] = sum / period;
  }
  return result;
}

/** RSI (Relative Strength Index), Wilder yontemiyle. 0-100 arasi, 70 uzeri asiri alim, 30 alti asiri satim kabul edilir. */
export function calculateRsi(closes: number[], period = 14): number[] {
  const result: number[] = new Array(closes.length).fill(NaN);
  if (closes.length <= period) return result;

  let avgGain = 0;
  let avgLoss = 0;
  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) avgGain += diff;
    else avgLoss -= diff;
  }
  avgGain /= period;
  avgLoss /= period;
  result[period] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
    result[i] = avgLoss === 0 ? 100 : 100 - 100 / (1 + avgGain / avgLoss);
  }
  return result;
}

export interface MacdResult {
  macdLine: number[];
  signalLine: number[];
  histogram: number[];
}

/** MACD: hizli EMA - yavas EMA, ve bunun sinyal cizgisi (EMA'si). */
export function calculateMacd(
  closes: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MacdResult {
  const fastEma = calculateEma(closes, fastPeriod);
  const slowEma = calculateEma(closes, slowPeriod);
  const macdLine = closes.map((_, i) => fastEma[i] - slowEma[i]);
  const signalLine = calculateEma(macdLine, signalPeriod);
  const histogram = macdLine.map((v, i) => v - signalLine[i]);
  return { macdLine, signalLine, histogram };
}

export interface BollingerBands {
  upper: number[];
  middle: number[];
  lower: number[];
}

/** Bollinger Bantlari: orta = SMA, ust/alt = orta +/- (stdDevMultiplier * standart sapma). */
export function calculateBollingerBands(
  closes: number[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBands {
  const middle = calculateSma(closes, period);
  const upper: number[] = new Array(closes.length).fill(NaN);
  const lower: number[] = new Array(closes.length).fill(NaN);

  for (let i = period - 1; i < closes.length; i++) {
    const window = closes.slice(i - period + 1, i + 1);
    const mean = middle[i];
    const variance = window.reduce((sum, v) => sum + (v - mean) ** 2, 0) / period;
    const stdDev = Math.sqrt(variance);
    upper[i] = mean + stdDevMultiplier * stdDev;
    lower[i] = mean - stdDevMultiplier * stdDev;
  }
  return { upper, middle, lower };
}

/** ATR (Average True Range), Wilder yontemiyle - volatilite/dinamik stop-loss icin kullanilir. */
export function calculateAtr(highs: number[], lows: number[], closes: number[], period = 14): number[] {
  const trueRanges: number[] = closes.map((close, i) => {
    if (i === 0) return highs[i] - lows[i];
    return Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  });

  const result: number[] = new Array(closes.length).fill(NaN);
  if (trueRanges.length < period) return result;

  let atr = trueRanges.slice(0, period).reduce((a, b) => a + b, 0) / period;
  result[period - 1] = atr;
  for (let i = period; i < trueRanges.length; i++) {
    atr = (atr * (period - 1) + trueRanges[i]) / period;
    result[i] = atr;
  }
  return result;
}

export interface FibonacciLevels {
  level0: number;
  level236: number;
  level382: number;
  level5: number;
  level618: number;
  level786: number;
  level100: number;
}

/** Son `lookback` mumun en yuksek/en dusuk noktasina gore Fibonacci duzeltme seviyeleri. */
export function calculateFibonacciRetracement(
  highs: number[],
  lows: number[],
  lookback: number
): FibonacciLevels {
  const recentHighs = highs.slice(-lookback);
  const recentLows = lows.slice(-lookback);
  const swingHigh = Math.max(...recentHighs);
  const swingLow = Math.min(...recentLows);
  const diff = swingHigh - swingLow;

  return {
    level0: swingHigh,
    level236: swingHigh - diff * 0.236,
    level382: swingHigh - diff * 0.382,
    level5: swingHigh - diff * 0.5,
    level618: swingHigh - diff * 0.618,
    level786: swingHigh - diff * 0.786,
    level100: swingLow,
  };
}

/** VWAP (Volume Weighted Average Price) - kumulatif, verilen mum dizisinin basindan itibaren. */
export function calculateVwap(candles: Candle[]): number[] {
  const result: number[] = [];
  let cumulativePV = 0;
  let cumulativeVolume = 0;

  for (const candle of candles) {
    const typicalPrice = (candle.high + candle.low + candle.close) / 3;
    cumulativePV += typicalPrice * candle.volume;
    cumulativeVolume += candle.volume;
    result.push(cumulativeVolume === 0 ? typicalPrice : cumulativePV / cumulativeVolume);
  }
  return result;
}

export interface StochasticRsiResult {
  k: number[];
  d: number[];
}

/** Stochastic RSI: RSI'nin kendi son periyottaki min/max'ina gore normalize edilmis hali (0-100). */
export function calculateStochasticRsi(
  closes: number[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): StochasticRsiResult {
  const rsi = calculateRsi(closes, rsiPeriod);
  const raw: number[] = new Array(closes.length).fill(NaN);

  for (let i = 0; i < rsi.length; i++) {
    const windowStart = i - stochPeriod + 1;
    if (windowStart < 0 || rsi.slice(windowStart, i + 1).some(Number.isNaN)) continue;
    const window = rsi.slice(windowStart, i + 1);
    const minRsi = Math.min(...window);
    const maxRsi = Math.max(...window);
    raw[i] = maxRsi === minRsi ? 0 : ((rsi[i] - minRsi) / (maxRsi - minRsi)) * 100;
  }

  const k = smoothIgnoringNaN(raw, kSmooth);
  const d = smoothIgnoringNaN(k, dSmooth);
  return { k, d };
}

function smoothIgnoringNaN(values: number[], period: number): number[] {
  const result: number[] = new Array(values.length).fill(NaN);
  for (let i = 0; i < values.length; i++) {
    const windowStart = i - period + 1;
    if (windowStart < 0) continue;
    const window = values.slice(windowStart, i + 1);
    if (window.some(Number.isNaN)) continue;
    result[i] = window.reduce((a, b) => a + b, 0) / period;
  }
  return result;
}

export interface AdxResult {
  plusDI: number[];
  minusDI: number[];
  adx: number[];
}

/** ADX + Directional Indicators (Wilder) - trend gucunu olcer (25 uzeri genelde guclu trend kabul edilir). */
export function calculateAdx(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 14
): AdxResult {
  const len = closes.length;
  const plusDM: number[] = new Array(len).fill(0);
  const minusDM: number[] = new Array(len).fill(0);
  const tr: number[] = new Array(len).fill(0);

  for (let i = 1; i < len; i++) {
    const upMove = highs[i] - highs[i - 1];
    const downMove = lows[i - 1] - lows[i];
    plusDM[i] = upMove > downMove && upMove > 0 ? upMove : 0;
    minusDM[i] = downMove > upMove && downMove > 0 ? downMove : 0;
    tr[i] = Math.max(
      highs[i] - lows[i],
      Math.abs(highs[i] - closes[i - 1]),
      Math.abs(lows[i] - closes[i - 1])
    );
  }

  const wilderSmooth = (values: number[]): number[] => {
    const out: number[] = new Array(len).fill(NaN);
    if (len <= period) return out;
    let sum = values.slice(1, period + 1).reduce((a, b) => a + b, 0);
    out[period] = sum;
    for (let i = period + 1; i < len; i++) {
      sum = sum - sum / period + values[i];
      out[i] = sum;
    }
    return out;
  };

  const smoothedTR = wilderSmooth(tr);
  const smoothedPlusDM = wilderSmooth(plusDM);
  const smoothedMinusDM = wilderSmooth(minusDM);

  const plusDI: number[] = new Array(len).fill(NaN);
  const minusDI: number[] = new Array(len).fill(NaN);
  const dx: number[] = new Array(len).fill(NaN);

  for (let i = period; i < len; i++) {
    if (Number.isNaN(smoothedTR[i]) || smoothedTR[i] === 0) continue;
    plusDI[i] = (smoothedPlusDM[i] / smoothedTR[i]) * 100;
    minusDI[i] = (smoothedMinusDM[i] / smoothedTR[i]) * 100;
    const diSum = plusDI[i] + minusDI[i];
    dx[i] = diSum === 0 ? 0 : (Math.abs(plusDI[i] - minusDI[i]) / diSum) * 100;
  }

  const adx: number[] = new Array(len).fill(NaN);
  const firstAdxIndex = period * 2 - 1;
  if (firstAdxIndex < len) {
    const seedWindow = dx.slice(period, firstAdxIndex + 1);
    if (!seedWindow.some(Number.isNaN)) {
      let adxVal = seedWindow.reduce((a, b) => a + b, 0) / period;
      adx[firstAdxIndex] = adxVal;
      for (let i = firstAdxIndex + 1; i < len; i++) {
        adxVal = (adxVal * (period - 1) + dx[i]) / period;
        adx[i] = adxVal;
      }
    }
  }

  return { plusDI, minusDI, adx };
}

/** Parabolic SAR - trend takip eden durdur-ve-cevir noktalari. */
export function calculateParabolicSar(
  highs: number[],
  lows: number[],
  step = 0.02,
  maxStep = 0.2
): number[] {
  const len = highs.length;
  const sar: number[] = new Array(len).fill(NaN);
  if (len < 2) return sar;

  let isUptrend = highs[1] >= highs[0];
  let af = step;
  let ep = isUptrend ? highs[0] : lows[0];
  sar[0] = isUptrend ? lows[0] : highs[0];

  for (let i = 1; i < len; i++) {
    let currentSar = sar[i - 1] + af * (ep - sar[i - 1]);

    if (isUptrend) {
      const priorLow = i >= 2 ? Math.min(lows[i - 1], lows[i - 2]) : lows[i - 1];
      currentSar = Math.min(currentSar, priorLow);
      if (lows[i] < currentSar) {
        isUptrend = false;
        currentSar = ep;
        ep = lows[i];
        af = step;
      } else if (highs[i] > ep) {
        ep = highs[i];
        af = Math.min(af + step, maxStep);
      }
    } else {
      const priorHigh = i >= 2 ? Math.max(highs[i - 1], highs[i - 2]) : highs[i - 1];
      currentSar = Math.max(currentSar, priorHigh);
      if (highs[i] > currentSar) {
        isUptrend = true;
        currentSar = ep;
        ep = highs[i];
        af = step;
      } else if (lows[i] < ep) {
        ep = lows[i];
        af = Math.min(af + step, maxStep);
      }
    }
    sar[i] = currentSar;
  }
  return sar;
}

export interface SupertrendResult {
  value: number[];
  trend: ("UP" | "DOWN")[];
}

/** Supertrend - ATR tabanli trend takip indikatoru, cok sayida "en iyi trader" stratejisinde kullanilir. */
export function calculateSupertrend(
  highs: number[],
  lows: number[],
  closes: number[],
  period = 10,
  multiplier = 3
): SupertrendResult {
  const atr = calculateAtr(highs, lows, closes, period);
  const len = closes.length;
  const finalUpper: number[] = new Array(len).fill(NaN);
  const finalLower: number[] = new Array(len).fill(NaN);
  const value: number[] = new Array(len).fill(NaN);
  const trend: ("UP" | "DOWN")[] = new Array(len).fill("UP");

  for (let i = 0; i < len; i++) {
    if (Number.isNaN(atr[i])) continue;
    const mid = (highs[i] + lows[i]) / 2;
    const basicUpper = mid + multiplier * atr[i];
    const basicLower = mid - multiplier * atr[i];

    if (Number.isNaN(finalUpper[i - 1] ?? NaN)) {
      finalUpper[i] = basicUpper;
      finalLower[i] = basicLower;
      trend[i] = closes[i] > basicUpper ? "UP" : "DOWN";
    } else {
      finalUpper[i] =
        basicUpper < finalUpper[i - 1] || closes[i - 1] > finalUpper[i - 1] ? basicUpper : finalUpper[i - 1];
      finalLower[i] =
        basicLower > finalLower[i - 1] || closes[i - 1] < finalLower[i - 1] ? basicLower : finalLower[i - 1];

      trend[i] =
        trend[i - 1] === "UP"
          ? closes[i] < finalLower[i] ? "DOWN" : "UP"
          : closes[i] > finalUpper[i] ? "UP" : "DOWN";
    }
    value[i] = trend[i] === "UP" ? finalLower[i] : finalUpper[i];
  }

  return { value, trend };
}

export interface IchimokuResult {
  tenkanSen: number[];
  kijunSen: number[];
  senkouSpanA: number[];
  senkouSpanB: number[];
}

function highLowMidpoint(highs: number[], lows: number[], period: number, index: number): number {
  const start = Math.max(0, index - period + 1);
  const highWindow = highs.slice(start, index + 1);
  const lowWindow = lows.slice(start, index + 1);
  return (Math.max(...highWindow) + Math.min(...lowWindow)) / 2;
}

/**
 * Ichimoku Cloud. Not: gelenek olarak senkou span'lar kijunPeriod kadar ileri
 * kaydirilarak cizilir; burada kayma yapilmadan ham degerler donuyor (sinyal
 * hesaplamak icin index bazli kaydirmayi cagiran taraf yapmali).
 */
export function calculateIchimoku(
  highs: number[],
  lows: number[],
  tenkanPeriod = 9,
  kijunPeriod = 26,
  senkouBPeriod = 52
): IchimokuResult {
  const len = highs.length;
  const tenkanSen: number[] = new Array(len).fill(NaN);
  const kijunSen: number[] = new Array(len).fill(NaN);
  const senkouSpanA: number[] = new Array(len).fill(NaN);
  const senkouSpanB: number[] = new Array(len).fill(NaN);

  for (let i = 0; i < len; i++) {
    if (i >= tenkanPeriod - 1) tenkanSen[i] = highLowMidpoint(highs, lows, tenkanPeriod, i);
    if (i >= kijunPeriod - 1) kijunSen[i] = highLowMidpoint(highs, lows, kijunPeriod, i);
    if (i >= senkouBPeriod - 1) senkouSpanB[i] = highLowMidpoint(highs, lows, senkouBPeriod, i);
    if (!Number.isNaN(tenkanSen[i]) && !Number.isNaN(kijunSen[i])) {
      senkouSpanA[i] = (tenkanSen[i] + kijunSen[i]) / 2;
    }
  }

  return { tenkanSen, kijunSen, senkouSpanA, senkouSpanB };
}

export interface CandlestickPatternResult {
  pattern: string;
  vote: number;
}

function candleBody(c: Candle): number {
  return Math.abs(c.close - c.open);
}
function candleRange(c: Candle): number {
  return c.high - c.low;
}
function isBullishCandle(c: Candle): boolean {
  return c.close > c.open;
}
function isBearishCandle(c: Candle): boolean {
  return c.close < c.open;
}

/**
 * Klasik mum formasyonlarini (Japon mum grafigi) tanir. Son kapanan muma
 * (ve gerekirse onceki 1-2 muma) bakar; en guclu/en yeni formasyonu doner.
 * Formasyon yoksa notr (vote: 0) doner.
 */
export function detectCandlestickPattern(candles: Candle[]): CandlestickPatternResult {
  const n = candles.length;
  if (n < 3) return { pattern: "yok", vote: 0 };

  const c0 = candles[n - 3];
  const c1 = candles[n - 2];
  const c2 = candles[n - 1];

  // Morning Star: dusus mumu -> kararsiz kucuk govdeli mum -> guclu yukselis mumu (c0'in ortasinin ustunde kapanir)
  const c0Mid = (c0.open + c0.close) / 2;
  if (
    isBearishCandle(c0) &&
    candleBody(c0) > candleRange(c0) * 0.5 &&
    candleRange(c1) > 0 &&
    candleBody(c1) < candleRange(c1) * 0.35 &&
    isBullishCandle(c2) &&
    candleBody(c2) > candleRange(c2) * 0.5 &&
    c2.close > c0Mid
  ) {
    return { pattern: "Morning Star", vote: 1 };
  }

  // Evening Star: yukselis mumu -> kararsiz kucuk govdeli mum -> guclu dusus mumu (c0'in ortasinin altinda kapanir)
  if (
    isBullishCandle(c0) &&
    candleBody(c0) > candleRange(c0) * 0.5 &&
    candleRange(c1) > 0 &&
    candleBody(c1) < candleRange(c1) * 0.35 &&
    isBearishCandle(c2) &&
    candleBody(c2) > candleRange(c2) * 0.5 &&
    c2.close < c0Mid
  ) {
    return { pattern: "Evening Star", vote: -1 };
  }

  // Bullish/Bearish Engulfing: son mumun govdesi onceki mumun govdesini tamamen icine alir
  if (isBearishCandle(c1) && isBullishCandle(c2) && c2.open <= c1.close && c2.close >= c1.open) {
    return { pattern: "Bullish Engulfing", vote: 1 };
  }
  if (isBullishCandle(c1) && isBearishCandle(c2) && c2.open >= c1.close && c2.close <= c1.open) {
    return { pattern: "Bearish Engulfing", vote: -1 };
  }

  // Hammer / Shooting Star: kucuk govde + tek yonde uzun fitil (govdenin en az 2 kati)
  const lastBody = candleBody(c2);
  const lastRange = candleRange(c2);
  if (lastRange > 0 && lastBody > 0) {
    const upperWick = c2.high - Math.max(c2.open, c2.close);
    const lowerWick = Math.min(c2.open, c2.close) - c2.low;

    if (lowerWick >= lastBody * 2 && upperWick <= lastBody * 0.5) {
      return { pattern: "Hammer", vote: 1 };
    }
    if (upperWick >= lastBody * 2 && lowerWick <= lastBody * 0.5) {
      return { pattern: "Shooting Star", vote: -1 };
    }
  }

  // Doji: govde, gunluk aralinin cok kucuk bir kismi - kararsizlik, yon belirtmez
  if (lastRange > 0 && lastBody <= lastRange * 0.1) {
    return { pattern: "Doji", vote: 0 };
  }

  return { pattern: "yok", vote: 0 };
}

export interface SupportResistanceResult {
  support: number | null;
  resistance: number | null;
  vote: number;
}

/**
 * Basit fraktal (5 mumluk) pivot tespitiyle en yakin destek/direnc
 * seviyelerini bulur. Fiyat bir direnci yukari kirarsa (breakout) ya da
 * bir destegi asagi kirarsa (breakdown) guclu sinyal; seviyeye yakinken
 * tepki veriyorsa (bounce/rejection) daha zayif sinyal doner.
 */
export function calculateSupportResistance(
  highs: number[],
  lows: number[],
  closes: number[],
  lookback = 50
): SupportResistanceResult {
  const len = closes.length;
  const start = Math.max(2, len - lookback);
  const pivotHighs: number[] = [];
  const pivotLows: number[] = [];

  for (let i = start; i < len - 3; i++) {
    if (
      highs[i] > highs[i - 1] &&
      highs[i] > highs[i - 2] &&
      highs[i] > highs[i + 1] &&
      highs[i] > highs[i + 2]
    ) {
      pivotHighs.push(highs[i]);
    }
    if (
      lows[i] < lows[i - 1] &&
      lows[i] < lows[i - 2] &&
      lows[i] < lows[i + 1] &&
      lows[i] < lows[i + 2]
    ) {
      pivotLows.push(lows[i]);
    }
  }

  const price = closes[len - 1];
  const prevClose = closes[len - 2] ?? price;

  const resistanceCandidates = pivotHighs.filter((h) => h > prevClose);
  const supportCandidates = pivotLows.filter((l) => l < prevClose);
  const resistance = resistanceCandidates.length > 0 ? Math.min(...resistanceCandidates) : null;
  const support = supportCandidates.length > 0 ? Math.max(...supportCandidates) : null;

  let vote = 0;
  if (resistance !== null && price > resistance) {
    vote = 1; // direnc yukari kirildi
  } else if (support !== null && price < support) {
    vote = -1; // destek asagi kirildi
  } else if (support !== null && price > 0 && (price - support) / price < 0.01 && price > prevClose) {
    vote = 0.5; // destekten toparlaniyor
  } else if (resistance !== null && price > 0 && (resistance - price) / price < 0.01 && price < prevClose) {
    vote = -0.5; // direncten geri donuyor
  }

  return { support, resistance, vote };
}

export interface FairValueGap {
  index: number;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
}

/**
 * ICT/Smart Money Concepts - Fair Value Gap (FVG) tespiti: 3 mumluk bir
 * ardisik grupta, 1. mumun high/low'u ile 3. mumun low/high'i arasinda
 * doldurulmamis bir bosluk varsa (2. mum guclu bir hareketle bu bosluga
 * neden olur) bu bir FVG'dir. Fiyatin geri gelip bu bosluğu "doldurmasi"
 * beklenir.
 */
export function detectFairValueGaps(candles: Candle[]): FairValueGap[] {
  const gaps: FairValueGap[] = [];
  for (let i = 2; i < candles.length; i++) {
    const first = candles[i - 2];
    const third = candles[i];
    if (first.high < third.low) {
      gaps.push({ index: i, type: "BULLISH", top: third.low, bottom: first.high });
    } else if (first.low > third.high) {
      gaps.push({ index: i, type: "BEARISH", top: first.low, bottom: third.high });
    }
  }
  return gaps;
}
