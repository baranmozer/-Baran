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
