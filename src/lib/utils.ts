import type { TransferStatus, Position } from "./types";

export const STATUS_LABELS: Record<TransferStatus, string> = {
  rumor: "Söylenti",
  talks: "Görüşmeler",
  agreed: "Anlaşma",
  official: "Resmi",
  collapsed: "İptal",
};

// Her durum için renk + radar derinliği (0 = dış halka/uzak, 1 = merkez/kesin).
export const STATUS_META: Record<
  TransferStatus,
  { color: string; depth: number }
> = {
  rumor: { color: "#64748b", depth: 0.15 },
  talks: { color: "#eab308", depth: 0.4 },
  agreed: { color: "#22d3ee", depth: 0.7 },
  official: { color: "#22c55e", depth: 0.95 },
  collapsed: { color: "#ef4444", depth: 0.1 },
};

export const POSITION_LABELS: Record<Position, string> = {
  GK: "Kaleci",
  DEF: "Defans",
  MID: "Orta Saha",
  FWD: "Forvet",
};

export function formatFee(fee: number | null): string {
  if (fee === null) return "Bilinmiyor";
  if (fee === 0) return "Bedelsiz";
  return `€${fee.toLocaleString("tr-TR")}M`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}
