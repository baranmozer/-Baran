import { config } from "./config.js";
import { getCandles } from "./binanceClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";

export interface ScreenerResult {
  symbol: string;
  score: number;
  signal: "BUY" | "SELL" | "HOLD";
  price: number;
  votes: { name: string; vote: number; weight: number }[];
  error?: string;
}

/**
 * Izleme listesindeki her sembol icin - hicbir emir acmadan, sadece
 * herkese acik mum verisiyle - anlik confluence skorunu hesaplar.
 * API key gerektirmez (public endpoint).
 */
export async function getWatchlistSignals(): Promise<ScreenerResult[]> {
  const results = await Promise.all(
    config.watchlistSymbols.map(async (symbol): Promise<ScreenerResult> => {
      try {
        const allCandles = await getCandles(symbol, config.strategy.candleInterval, config.strategy.candleLookback + 1);
        const candles = allCandles.slice(0, -1);
        const result = computeConfluenceSignal(candles, config.strategy.buyThreshold, config.strategy.sellThreshold);
        const signal = result.signal ?? "HOLD";
        return {
          symbol,
          score: Number(result.score.toFixed(2)),
          signal,
          price: candles[candles.length - 1]?.close ?? 0,
          votes: result.votes,
        };
      } catch (err) {
        return {
          symbol,
          score: 0,
          signal: "HOLD",
          price: 0,
          votes: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }
    })
  );

  return results.sort((a, b) => Math.abs(b.score) - Math.abs(a.score));
}
