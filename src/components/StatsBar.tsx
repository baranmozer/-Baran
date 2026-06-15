import type { Transfer } from "@/lib/types";
import { formatFee } from "@/lib/utils";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-radar-line bg-radar-panel px-4 py-3">
      <div className="text-xl font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
    </div>
  );
}

export function StatsBar({ transfers }: { transfers: Transfer[] }) {
  const total = transfers.length;
  const official = transfers.filter((t) => t.status === "official").length;
  const totalSpend = transfers
    .filter((t) => t.status === "official" || t.status === "agreed")
    .reduce((sum, t) => sum + (t.fee ?? 0), 0);
  const avgReliability =
    total === 0
      ? 0
      : Math.round(transfers.reduce((s, t) => s + t.reliability, 0) / total);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Takipteki transfer" value={String(total)} />
      <Stat label="Resmi açıklanan" value={String(official)} />
      <Stat label="Tahmini hacim" value={formatFee(totalSpend)} />
      <Stat label="Ort. güvenilirlik" value={`%${avgReliability}`} />
    </div>
  );
}
