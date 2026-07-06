import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "futures-pending-close-approvals.json");

export interface PendingCloseApproval {
  id: string;
  symbol: string;
  direction: "LONG" | "SHORT";
  pnlPercent: number;
  pnlUsdt: number;
  createdAt: string;
  expiresAt: string;
}

function load(): PendingCloseApproval[] {
  if (!fs.existsSync(FILE_PATH)) return [];
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(entries: PendingCloseApproval[]) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

export function getPendingCloseApprovals(): PendingCloseApproval[] {
  return load();
}

export function getPendingCloseApproval(id: string): PendingCloseApproval | undefined {
  return load().find((p) => p.id === id);
}

export function addPendingCloseApproval(entry: Omit<PendingCloseApproval, "id">): PendingCloseApproval {
  const full: PendingCloseApproval = { ...entry, id: crypto.randomUUID() };
  const entries = load();
  entries.push(full);
  save(entries);
  return full;
}

export function removePendingCloseApproval(id: string) {
  save(load().filter((p) => p.id !== id));
}

export function removePendingCloseApprovalBySymbol(symbol: string) {
  save(load().filter((p) => p.symbol !== symbol));
}

/** Suresi gecmis kar-onayi bekleyenleri temizler (cevapsiz kalirsa pozisyon otomatik yonetime devam eder). */
export function clearExpiredCloseApprovals(): PendingCloseApproval[] {
  const entries = load();
  const now = Date.now();
  const expired = entries.filter((p) => new Date(p.expiresAt).getTime() <= now);
  if (expired.length > 0) {
    save(entries.filter((p) => new Date(p.expiresAt).getTime() > now));
  }
  return expired;
}

export function hasPendingCloseApproval(symbol: string): boolean {
  return load().some((p) => p.symbol === symbol);
}
