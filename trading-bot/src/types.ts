export interface TradingViewAlert {
  secret: string;
  symbol: string;
  side: "BUY" | "SELL";
  /** Zorunlu: giris fiyatindan yuzde kac uzakta stop-loss konulsun (BUY icin). */
  stopLossPercent?: number;
}

export interface OpenPosition {
  symbol: string;
  quantity: number;
  entryPrice: number;
  stopOrderId: number;
  createdAt: string;
}

export interface SymbolFilters {
  stepSize: number;
  minQty: number;
  tickSize: number;
}

export interface Candle {
  openTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type FuturesCloseReason =
  | "TAKE_PROFIT"
  | "SIGNAL_FLATTEN"
  | "MANUAL"
  | "STOP_LOSS"
  | "LIQUIDATION"
  | "UNKNOWN";
