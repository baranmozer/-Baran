import fs from "node:fs";
import path from "node:path";
import type { FuturesCloseReason } from "./types.js";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "futures-trade-history.json");
const MAX_ENTRIES = 300;

export interface TradeHistoryEntry {
  symbol: string;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  pnlUsdt: number;
  pnlPercent: number;
  reason: FuturesCloseReason;
  closedAt: string;
}

function load(): TradeHistoryEntry[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(entries: TradeHistoryEntry[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

/** En yeni once olacak sekilde kaydeder, en fazla MAX_ENTRIES tutar. */
export function appendTradeHistory(entry: TradeHistoryEntry) {
  const entries = load();
  entries.unshift(entry);
  save(entries.slice(0, MAX_ENTRIES));
}

export function getTradeHistory(limit = 50): TradeHistoryEntry[] {
  return load().slice(0, limit);
}

/** Bu sembolun en son kapandigi zaman (ms) - yeniden giris cooldown'u icin. Hic kapanmadiysa null. */
export function getLastCloseTime(symbol: string): number | null {
  const entry = load().find((e) => e.symbol === symbol);
  return entry ? new Date(entry.closedAt).getTime() : null;
}

/** Bugun (yerel gun) kapanan islemlerin toplam gerceklesmis kar/zarari. */
export function getTodayRealizedPnl(): number {
  const todayStr = new Date().toDateString();
  return load()
    .filter((e) => new Date(e.closedAt).toDateString() === todayStr)
    .reduce((sum, e) => sum + e.pnlUsdt, 0);
}
