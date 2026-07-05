import { config } from "./config.js";
import { get24hrTickers } from "./binanceFuturesClient.js";

/**
 * Sabit listenin disinda, 24 saatte en cok hareket eden (mutlak yuzde
 * degisim) ve yeterli hacme sahip USDT paritelerini bulur. Dusuk hacimli
 * riskli/manipule edilebilir coinleri elemek icin minimum hacim filtresi
 * uygulanir.
 */
export async function discoverOpportunityCoins(excludeSymbols: string[]): Promise<string[]> {
  const tickers = await get24hrTickers();
  const excludeSet = new Set(excludeSymbols);

  return tickers
    .filter((t) => t.symbol.endsWith("USDT"))
    .filter((t) => !excludeSet.has(t.symbol))
    .filter((t) => t.quoteVolume >= config.futures.discoverMinQuoteVolume)
    .sort((a, b) => Math.abs(b.priceChangePercent) - Math.abs(a.priceChangePercent))
    .slice(0, config.futures.discoverTopN)
    .map((t) => t.symbol);
}
