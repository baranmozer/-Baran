import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Ortam degiskeni eksik: ${name} (.env dosyasina bak, .env.example ornektir)`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  webhookSecret: required("WEBHOOK_SECRET"),
  binance: {
    apiKey: required("BINANCE_API_KEY"),
    apiSecret: required("BINANCE_API_SECRET"),
    baseUrl: process.env.BINANCE_BASE_URL ?? "https://testnet.binance.vision",
  },
  allowedSymbols: (process.env.ALLOWED_SYMBOLS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  positionSizePercent: Number(process.env.POSITION_SIZE_PERCENT ?? 2),
  maxStopLossPercent: Number(process.env.MAX_STOP_LOSS_PERCENT ?? 10),
  strategy: {
    enabled: (process.env.STRATEGY_ENABLED ?? "true") === "true",
    // "confluence": tum indikatorlerin agirlikli oyu; "ema": sadece EMA kesisimi
    mode: (process.env.STRATEGY_MODE ?? "confluence") as "confluence" | "ema",
    candleInterval: process.env.STRATEGY_CANDLE_INTERVAL ?? "15m",
    pollIntervalSeconds: Number(process.env.STRATEGY_POLL_SECONDS ?? 60),
    emaFastPeriod: Number(process.env.STRATEGY_EMA_FAST ?? 9),
    emaSlowPeriod: Number(process.env.STRATEGY_EMA_SLOW ?? 21),
    candleLookback: Number(process.env.STRATEGY_CANDLE_LOOKBACK ?? 100),
    buyThreshold: Number(process.env.STRATEGY_BUY_THRESHOLD ?? 0.4),
    sellThreshold: Number(process.env.STRATEGY_SELL_THRESHOLD ?? -0.4),
    stopLossPercent: Number(process.env.STRATEGY_STOP_LOSS_PERCENT ?? 2),
    takeProfitPercent: Number(process.env.STRATEGY_TAKE_PROFIT_PERCENT ?? 2),
  },
};
