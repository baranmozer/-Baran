import { getCandles } from "./binanceClient.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { config } from "./config.js";
import type { Candle } from "./types.js";

/**
 * Confluence stratejisini gecmis mum verisiyle simule eder - gercek emir
 * gondermez, sadece "bu sinyal o an gelseydi ne olurdu" hesabini yapar.
 * NOT: Kaldirac, trailing stop, basabas, ADX filtresi gibi canli motordaki
 * ekstra kurallari modellemez - sadece cig confluence sinyalinin (giris +
 * stop-loss + ters sinyalde cikis) fiyat bazinda ne kadar kazandirdigini/
 * kaybettirdigini gosterir. Amac: strateji canliya alinmadan once genel
 * yonunun (kazanma orani, risk/odul) saglikli olup olmadigini gormek.
 */

interface BacktestTrade {
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  entryTime: string;
  exitTime: string;
  pnlPercent: number;
  reason: "STOP_LOSS" | "SIGNAL_FLATTEN" | "END_OF_DATA";
}

async function fetchHistoricalCandles(symbol: string, interval: string, totalCandles: number): Promise<Candle[]> {
  const pages: Candle[][] = [];
  let endTime: number | undefined;
  let remaining = totalCandles;

  while (remaining > 0) {
    const pageSize = Math.min(1000, remaining);
    const page = await getCandles(symbol, interval, pageSize, endTime);
    if (page.length === 0) break;
    pages.unshift(page);
    remaining -= page.length;
    endTime = page[0].openTime - 1;
    if (page.length < pageSize) break; // Binance'te daha eski veri kalmadi
  }

  return pages.flat();
}

function runSimulation(
  candles: Candle[],
  candleLookback: number,
  buyThreshold: number,
  sellThreshold: number,
  stopLossPercent: number,
  minAdxForEntry: number
) {
  const trades: BacktestTrade[] = [];
  let position: { direction: "LONG" | "SHORT"; entryPrice: number; entryTime: string } | null = null;
  let adxFilteredCount = 0;

  for (let i = candleLookback; i < candles.length; i++) {
    const window = candles.slice(i - candleLookback, i + 1);
    const result = computeConfluenceSignal(window, buyThreshold, sellThreshold);
    const candle = candles[i];
    const price = candle.close;
    const time = new Date(candle.openTime).toISOString();

    if (position) {
      const isLong = position.direction === "LONG";
      const pnlPercent = ((price - position.entryPrice) / position.entryPrice) * 100 * (isLong ? 1 : -1);
      const scoreAgainstPosition = isLong ? result.score < 0 : result.score > 0;
      const hitStopLoss = pnlPercent <= -stopLossPercent;

      if (hitStopLoss) {
        trades.push({
          ...position,
          exitPrice: price,
          exitTime: time,
          pnlPercent: -stopLossPercent,
          reason: "STOP_LOSS",
        });
        position = null;
      } else if (scoreAgainstPosition) {
        trades.push({ ...position, exitPrice: price, exitTime: time, pnlPercent, reason: "SIGNAL_FLATTEN" });
        position = null;
      }
      continue;
    }

    if (!result.signal) continue;

    // Canli futures motoruyla ayni kural: ADX yetersizse (yatay/kararsiz piyasa) giris yapilmaz.
    if (minAdxForEntry > 0 && (result.adxValue === null || result.adxValue < minAdxForEntry)) {
      adxFilteredCount++;
      continue;
    }

    if (result.signal === "BUY") {
      position = { direction: "LONG", entryPrice: price, entryTime: time };
    } else if (result.signal === "SELL") {
      position = { direction: "SHORT", entryPrice: price, entryTime: time };
    }
  }

  if (position) {
    const last = candles[candles.length - 1];
    const isLong = position.direction === "LONG";
    const pnlPercent = ((last.close - position.entryPrice) / position.entryPrice) * 100 * (isLong ? 1 : -1);
    trades.push({
      ...position,
      exitPrice: last.close,
      exitTime: new Date(last.openTime).toISOString(),
      pnlPercent,
      reason: "END_OF_DATA",
    });
  }

  return { trades, adxFilteredCount };
}

function printReport(symbol: string, interval: string, candleCount: number, trades: BacktestTrade[]) {
  console.log(`\n=== Backtest Raporu: ${symbol} (${interval}, ${candleCount} mum) ===\n`);

  if (trades.length === 0) {
    console.log("Hic islem olusmadi (esikler gecilmedi). Buy/sell threshold degerlerini gevsetmeyi dene.");
    return;
  }

  const wins = trades.filter((t) => t.pnlPercent > 0);
  const losses = trades.filter((t) => t.pnlPercent <= 0);
  const totalPnlPercent = trades.reduce((sum, t) => sum + t.pnlPercent, 0);
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + t.pnlPercent, 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? losses.reduce((s, t) => s + t.pnlPercent, 0) / losses.length : 0;
  const grossWin = wins.reduce((s, t) => s + t.pnlPercent, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.pnlPercent, 0));
  const profitFactor = grossLoss === 0 ? (grossWin > 0 ? Infinity : 0) : grossWin / grossLoss;

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  for (const t of trades) {
    cumulative += t.pnlPercent;
    peak = Math.max(peak, cumulative);
    maxDrawdown = Math.min(maxDrawdown, cumulative - peak);
  }

  const reasonCounts: Record<string, number> = {};
  for (const t of trades) reasonCounts[t.reason] = (reasonCounts[t.reason] ?? 0) + 1;

  console.log(`Toplam islem:        ${trades.length}`);
  console.log(`Kazanan / Kaybeden:  ${wins.length} / ${losses.length} (kazanma orani %${((wins.length / trades.length) * 100).toFixed(1)})`);
  console.log(`Toplam PnL:          %${totalPnlPercent.toFixed(2)} (kaldiracsiz, additive)`);
  console.log(`Ortalama kazanc:     %${avgWin.toFixed(2)}`);
  console.log(`Ortalama kayip:      %${avgLoss.toFixed(2)}`);
  console.log(`Profit factor:       ${profitFactor === Infinity ? "sonsuz (hic kayip yok)" : profitFactor.toFixed(2)} (>1 iyi, >1.5 saglikli kabul edilir)`);
  console.log(`Max drawdown:        %${maxDrawdown.toFixed(2)} (kumulatif egrinin en kotu geri cekilmesi)`);
  console.log(`Kapanma nedenleri:   ${Object.entries(reasonCounts).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log("");
}

async function main() {
  const symbol = (process.argv[2] ?? "BTCUSDT").toUpperCase();
  const interval = process.argv[3] ?? config.strategy.candleInterval;
  const totalCandles = Number(process.argv[4] ?? 1500);
  // 5. argumanla ADX filtresini kapatabilirsin (0 = kapali), varsayilan futures motoruyla ayni deger.
  const minAdxForEntry = Number(process.argv[5] ?? config.futures.minAdxForEntry);

  const candleLookback = config.strategy.candleLookback;
  const buyThreshold = config.strategy.buyThreshold;
  const sellThreshold = config.strategy.sellThreshold;
  const stopLossPercent = config.strategy.stopLossPercent;

  console.log(`${symbol} icin ${totalCandles} mumluk (${interval}) gecmis veri cekiliyor...`);
  const candles = await fetchHistoricalCandles(symbol, interval, totalCandles + candleLookback);
  console.log(
    `${candles.length} mum alindi, simulasyon basliyor (lookback=${candleLookback}, buy>=${buyThreshold}, sell<=${sellThreshold}, stopLoss=%${stopLossPercent}, minAdxForEntry=${minAdxForEntry})...`
  );

  const { trades, adxFilteredCount } = runSimulation(
    candles,
    candleLookback,
    buyThreshold,
    sellThreshold,
    stopLossPercent,
    minAdxForEntry
  );
  console.log(`ADX yetersiz oldugu icin atlanan sinyal sayisi: ${adxFilteredCount}`);
  printReport(symbol, interval, candles.length, trades);
}

main().catch((err) => {
  console.error("Backtest hatasi:", err);
  process.exit(1);
});
