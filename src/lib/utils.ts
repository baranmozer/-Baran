import type { RumorStatus, Position, ContentStage } from "./types";

export const STATUS_LABELS: Record<RumorStatus, string> = {
  rumor: "Söylenti",
  talks: "Görüşmeler",
  agreed: "Anlaşma",
  official: "Resmi",
  collapsed: "İptal",
};

// Her durum için renk + radar derinliği (0 = dış halka/uzak, 1 = merkez/kesin).
export const STATUS_META: Record<
  RumorStatus,
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

export const STAGE_LABELS: Record<ContentStage, string> = {
  idea: "Fikir",
  scripted: "Senaryo hazır",
  thumbnail: "Thumbnail hazır",
  published: "Yayınlandı",
};

export const STAGE_COLOR: Record<ContentStage, string> = {
  idea: "#64748b",
  scripted: "#eab308",
  thumbnail: "#a855f7",
  published: "#22c55e",
};

export function formatFee(fee: number | null): string {
  if (fee === null) return "Bilinmiyor";
  if (fee === 0) return "Bedelsiz";
  return `€${fee.toLocaleString("tr-TR")}M`;
}

export function timeAgo(iso: string, now: Date = new Date()): string {
  const diff = now.getTime() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} sa önce`;
  const days = Math.round(hours / 24);
  return `${days} gün önce`;
}

export function uid(prefix = "id"): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
