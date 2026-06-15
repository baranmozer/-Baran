"use client";

import type { League, TransferStatus } from "@/lib/types";
import { STATUS_LABELS } from "@/lib/utils";

export type SortKey = "updatedAt" | "fee" | "reliability";

export interface Filters {
  query: string;
  league: League | "Tümü";
  status: TransferStatus | "Tümü";
  sort: SortKey;
  onlyWatched: boolean;
}

const LEAGUES: (League | "Tümü")[] = [
  "Tümü",
  "Süper Lig",
  "Premier League",
  "LaLiga",
  "Serie A",
  "Bundesliga",
  "Ligue 1",
];

const SORT_LABELS: Record<SortKey, string> = {
  updatedAt: "En yeni",
  fee: "Bonservis",
  reliability: "Güvenilirlik",
};

interface Props {
  filters: Filters;
  onChange: (next: Filters) => void;
  watchCount: number;
}

export function FilterBar({ filters, onChange, watchCount }: Props) {
  const set = <K extends keyof Filters>(key: K, value: Filters[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Oyuncu veya kulüp ara…"
          className="flex-1 min-w-[180px] rounded-lg border border-radar-line bg-radar-panel px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:border-radar-glow focus:outline-none"
        />
        <select
          value={filters.sort}
          onChange={(e) => set("sort", e.target.value as SortKey)}
          className="rounded-lg border border-radar-line bg-radar-panel px-3 py-2 text-sm text-slate-100 focus:border-radar-glow focus:outline-none"
        >
          {(Object.keys(SORT_LABELS) as SortKey[]).map((k) => (
            <option key={k} value={k}>
              Sırala: {SORT_LABELS[k]}
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) =>
            set("status", e.target.value as TransferStatus | "Tümü")
          }
          className="rounded-lg border border-radar-line bg-radar-panel px-3 py-2 text-sm text-slate-100 focus:border-radar-glow focus:outline-none"
        >
          <option value="Tümü">Durum: Tümü</option>
          {(Object.keys(STATUS_LABELS) as TransferStatus[]).map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
        <button
          onClick={() => set("onlyWatched", !filters.onlyWatched)}
          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
            filters.onlyWatched
              ? "border-yellow-500/60 bg-yellow-500/10 text-yellow-400"
              : "border-radar-line bg-radar-panel text-slate-300 hover:border-radar-glow/50"
          }`}
        >
          ★ Takipte ({watchCount})
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {LEAGUES.map((lg) => (
          <button
            key={lg}
            onClick={() => set("league", lg)}
            className={`rounded-full px-3 py-1 text-xs transition-colors ${
              filters.league === lg
                ? "bg-radar-glow text-radar-bg font-semibold"
                : "border border-radar-line text-slate-400 hover:text-slate-200"
            }`}
          >
            {lg}
          </button>
        ))}
      </div>
    </div>
  );
}
