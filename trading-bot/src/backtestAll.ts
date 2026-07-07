import { config } from "./config.js";
import { fetchHistoricalCandles, runSimulation, computeStats } from "./backtest.js";

/**
 * FUTURES_ALLOWED_SYMBOLS listesindeki tum coinleri tek tek backtest edip
 * profit factor'e gore siralanmis bir ozet tablo cikarir - "hangi coinler
 * gercekten kar ediyor, hangileri yapisal olarak zararli" sorusuna tek
 * calistirmada cevap vermek icindir.
 */
async function main() {
  const interval = process.argv[2] ?? config.strategy.candleInterval;
  const totalCandles = Number(process.argv[3] ?? 5000);
  const minAdxForEntry = Number(process.argv[4] ?? config.futures.minAdxForEntry);

  const candleLookback = config.strategy.candleLookback;
  const buyThreshold = config.strategy.buyThreshold;
  const sellThreshold = config.strategy.sellThreshold;
  const stopLossPercent = config.strategy.stopLossPercent;

  const symbols = config.futures.tradeAllSymbolsEnabled ? [] : config.futures.allowedSymbols;
  if (symbols.length === 0) {
    console.log("FUTURES_ALLOWED_SYMBOLS bos ya da ALL modunda - test edilecek sabit bir liste yok.");
    return;
  }

  console.log(
    `${symbols.length} coin icin ${totalCandles} mumluk (${interval}) toplu backtest basliyor ` +
      `(buy>=${buyThreshold}, sell<=${sellThreshold}, stopLoss=%${stopLossPercent}, minAdxForEntry=${minAdxForEntry})...\n`
  );

  const rows: Array<{ symbol: string; tradeCount: number } & ReturnType<typeof computeStats>> = [];

  for (const symbol of symbols) {
    try {
      const candles = await fetchHistoricalCandles(symbol, interval, totalCandles + candleLookback);
      const { trades } = runSimulation(candles, candleLookback, buyThreshold, sellThreshold, stopLossPercent, minAdxForEntry);
      const stats = computeStats(trades);
      rows.push({ symbol, tradeCount: trades.length, ...stats });
      console.log(
        `${symbol}: ${trades.length} islem, kazanma %${stats.winRate.toFixed(1)}, ` +
          `PF ${stats.profitFactor === Infinity ? "sonsuz" : stats.profitFactor.toFixed(2)}, PnL %${stats.totalPnlPercent.toFixed(2)}`
      );
    } catch (err) {
      console.log(`${symbol}: HATA - ${err instanceof Error ? err.message : err}`);
    }
    // Binance rate-limit'ine takilmamak icin coinler arasi kucuk bir bekleme.
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  rows.sort((a, b) => b.profitFactor - a.profitFactor);

  console.log("\n=== OZET (profit factor'e gore, en iyiden en kotuye) ===\n");
  console.log(
    "Sembol".padEnd(12) + "Islem".padEnd(8) + "Kazanma%".padEnd(10) + "ProfitFactor".padEnd(14) + "ToplamPnL%".padEnd(12) + "MaxDD%"
  );
  for (const r of rows) {
    console.log(
      r.symbol.padEnd(12) +
        String(r.tradeCount).padEnd(8) +
        r.winRate.toFixed(1).padEnd(10) +
        (r.profitFactor === Infinity ? "sonsuz" : r.profitFactor.toFixed(2)).padEnd(14) +
        r.totalPnlPercent.toFixed(2).padEnd(12) +
        r.maxDrawdown.toFixed(2)
    );
  }
  console.log(
    "\nNot: Profit factor < 1 olan coinler bu donemde yapisal olarak zararli - " +
      "FUTURES_ALLOWED_SYMBOLS listesinden cikarmayi dusunebilirsin."
  );
}

main().catch((err) => {
  console.error("Toplu backtest hatasi:", err);
  process.exit(1);
});
