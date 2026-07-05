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
