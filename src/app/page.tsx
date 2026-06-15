"use client";

import { useMemo, useState } from "react";
import { TRANSFERS } from "@/lib/data";
import { useWatchlist } from "@/hooks/useWatchlist";
import { FilterBar, type Filters } from "@/components/FilterBar";
import { TransferCard } from "@/components/TransferCard";
import { StatsBar } from "@/components/StatsBar";
import { RadarView } from "@/components/RadarView";

const DEFAULT_FILTERS: Filters = {
  query: "",
  league: "Tümü",
  status: "Tümü",
  sort: "updatedAt",
  onlyWatched: false,
};

export default function Home() {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const { has, toggle, count, hydrated } = useWatchlist();

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLocaleLowerCase("tr");
    let list = TRANSFERS.filter((t) => {
      if (filters.league !== "Tümü") {
        if (t.from.league !== filters.league && t.to.league !== filters.league)
          return false;
      }
      if (filters.status !== "Tümü" && t.status !== filters.status) return false;
      if (filters.onlyWatched && !has(t.id)) return false;
      if (q) {
        const hay = `${t.player} ${t.from.name} ${t.to.name}`.toLocaleLowerCase(
          "tr"
        );
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    list = [...list].sort((a, b) => {
      switch (filters.sort) {
        case "fee":
          return (b.fee ?? -1) - (a.fee ?? -1);
        case "reliability":
          return b.reliability - a.reliability;
        default:
          return (
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          );
      }
    });
    return list;
  }, [filters, has]);

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-100">
          <span className="text-radar-glow">📡</span> Transfer Radarı
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Futbol transfer söylentilerini ve resmi açıklamaları tek ekranda takip
          et.
        </p>
      </header>

      <section className="mb-6">
        <StatsBar transfers={TRANSFERS} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="order-2 lg:order-1">
          <div className="mb-4">
            <FilterBar
              filters={filters}
              onChange={setFilters}
              watchCount={hydrated ? count : 0}
            />
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-radar-line p-10 text-center text-slate-500">
              Bu filtrelere uyan transfer yok.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {filtered.map((t) => (
                <TransferCard
                  key={t.id}
                  transfer={t}
                  watched={has(t.id)}
                  onToggleWatch={toggle}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
          <RadarView transfers={filtered} />
        </aside>
      </div>

      <footer className="mt-10 border-t border-radar-line pt-4 text-center text-xs text-slate-600">
        Transfer Radarı · demo verisiyle · Next.js + Tailwind
      </footer>
    </main>
  );
}
