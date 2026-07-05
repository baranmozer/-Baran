import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "futures-pending-approvals.json");

export interface PendingApproval {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  score: number;
  suggestedLeverage: number;
  suggestedPositionSizePercent: number;
  createdAt: string;
  expiresAt: string;
}

function load(): PendingApproval[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(entries: PendingApproval[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

export function getPendingApprovals(): PendingApproval[] {
  return load();
}

export function getPendingApproval(id: string): PendingApproval | undefined {
  return load().find((p) => p.id === id);
}

export function addPendingApproval(entry: Omit<PendingApproval, "id">): PendingApproval {
  const full: PendingApproval = { ...entry, id: crypto.randomUUID() };
  const entries = load();
  entries.push(full);
  save(entries);
  return full;
}

export function removePendingApproval(id: string) {
  save(load().filter((p) => p.id !== id));
}

/** Suresi gecmis onay bekleyenleri temizler, kac tane silindigini doner. */
export function clearExpiredApprovals(): PendingApproval[] {
  const entries = load();
  const now = Date.now();
  const expired = entries.filter((p) => new Date(p.expiresAt).getTime() <= now);
  if (expired.length > 0) {
    save(entries.filter((p) => new Date(p.expiresAt).getTime() > now));
  }
  return expired;
}

/** Bu sembol icin zaten bekleyen bir onay var mi. */
export function hasPendingApproval(symbol: string): boolean {
  return load().some((p) => p.symbol === symbol);
}
