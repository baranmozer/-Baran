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
};
