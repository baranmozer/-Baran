/**
 * Ev interneti/WiFi coklayici gibi kaynaklardan gelen kisa sureli
 * kesintilerde (DNS cozulememesi, baglanti zaman asimi) tek bir istegin
 * basarisiz olup butun tur/islemin atlanmasini onlemek icin - sadece
 * baglanti hic kurulamadan patlayan (network-level) hatalarda otomatik
 * tekrar dener. Binance'in donduğü gercek API hatalari (orn. gecersiz
 * sembol, yetersiz bakiye - fetch basariyla cevap alip res.ok=false
 * oldugu durumlar) burada retry edilmez, cunku tekrar denemek sonucu
 * degistirmez ve emir gonderiminde istenmeyen tekrar riski yaratabilir.
 */

const RETRYABLE_CODES = new Set([
  "UND_ERR_CONNECT_TIMEOUT",
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "EAI_AGAIN",
  "UND_ERR_SOCKET",
]);

function isRetryableNetworkError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const cause = (err as { cause?: { code?: string } }).cause;
  const code = cause?.code ?? (err as { code?: string }).code;
  if (code && RETRYABLE_CODES.has(code)) return true;
  return err.message.includes("fetch failed");
}

/** fetch() sarmalayici - sadece baglanti kurulamayan (DNS/timeout) hatalarda, kucuk bir bekleme ile tekrar dener. */
export async function fetchWithRetry(url: string, options?: RequestInit, maxRetries = 2): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      if (attempt === maxRetries || !isRetryableNetworkError(err)) throw err;
      const delayMs = 1000 * 2 ** attempt; // 1s, 2s, 4s...
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastErr;
}
