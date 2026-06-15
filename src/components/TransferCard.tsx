import type { Transfer } from "@/lib/types";
import { POSITION_LABELS, formatFee, timeAgo } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface Props {
  transfer: Transfer;
  watched: boolean;
  onToggleWatch: (id: string) => void;
}

function ReliabilityBar({ value }: { value: number }) {
  const color = value >= 70 ? "#22c55e" : value >= 45 ? "#eab308" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-radar-line">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        %{value}
      </span>
    </div>
  );
}

export function TransferCard({ transfer, watched, onToggleWatch }: Props) {
  const t = transfer;
  return (
    <article className="group rounded-xl border border-radar-line bg-radar-panel p-4 transition-colors hover:border-radar-glow/50">
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-semibold text-slate-100">{t.player}</h3>
          <p className="text-xs text-slate-400">
            {t.age} yaş · {POSITION_LABELS[t.position]}
          </p>
        </div>
        <button
          onClick={() => onToggleWatch(t.id)}
          aria-label={watched ? "Takipten çıkar" : "Takibe al"}
          className="text-lg leading-none transition-transform hover:scale-110"
          title={watched ? "Takipten çıkar" : "Takibe al"}
        >
          <span style={{ color: watched ? "#eab308" : "#475569" }}>
            {watched ? "★" : "☆"}
          </span>
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2 text-sm">
        <span className="truncate text-slate-300">{t.from.name}</span>
        <span className="text-radar-glow">→</span>
        <span className="truncate font-medium text-slate-100">{t.to.name}</span>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-bold text-slate-100">
          {formatFee(t.fee)}
        </span>
        <StatusBadge status={t.status} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-radar-line pt-3">
        <ReliabilityBar value={t.reliability} />
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
        <span>{t.source}</span>
        <span>{timeAgo(t.updatedAt)}</span>
      </div>
    </article>
  );
}
