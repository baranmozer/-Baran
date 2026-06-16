"use client";

import Link from "next/link";
import { useStudio } from "@/store/StudioContext";
import { RadarView } from "@/components/RadarView";
import { StatusBadge } from "@/components/StatusBadge";
import { PageHeader, Card } from "@/components/ui";
import { STAGE_COLOR, STAGE_LABELS, formatFee, timeAgo } from "@/lib/utils";

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="!p-4">
      <div className="text-2xl font-bold text-slate-100">{value}</div>
      <div className="text-xs text-slate-400">{label}</div>
      {hint && <div className="mt-1 text-[11px] text-slate-600">{hint}</div>}
    </Card>
  );
}

export default function Dashboard() {
  const { rumors, scripts, hydrated } = useStudio();

  const ideas = rumors.filter((r) => r.stage === "idea").length;
  const published = rumors.filter((r) => r.stage === "published").length;
  const avgRel = rumors.length
    ? Math.round(rumors.reduce((s, r) => s + r.reliability, 0) / rumors.length)
    : 0;

  return (
    <>
      <PageHeader
        icon="🎬"
        title="İçerik Merkezi"
        subtitle="Transfer haberlerini içeriğe dönüştür: haber → senaryo → thumbnail → yayın."
        action={
          <Link
            href="/add-rumor"
            className="rounded-lg bg-radar-glow px-4 py-2 text-sm font-semibold text-radar-bg hover:opacity-90"
          >
            + Haber Ekle
          </Link>
        }
      />

      <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Toplam haber" value={String(rumors.length)} />
        <Stat label="Yazılacak senaryo" value={String(ideas)} hint="aşaması: fikir" />
        <Stat label="Üretilen senaryo" value={String(scripts.length)} />
        <Stat label="Ort. güvenilirlik" value={`%${avgRel}`} />
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <section className="order-2 lg:order-1">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">
            İçerik kuyruğu
          </h2>
          {!hydrated ? (
            <Card className="text-slate-500">Yükleniyor…</Card>
          ) : rumors.length === 0 ? (
            <Card className="text-slate-500">
              Henüz haber yok.{" "}
              <Link href="/add-rumor" className="text-radar-glow">
                İlk haberi ekle →
              </Link>
            </Card>
          ) : (
            <div className="space-y-3">
              {rumors.map((r) => (
                <Card key={r.id} className="!p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-slate-100">
                        {r.player}
                      </h3>
                      <p className="truncate text-sm text-slate-400">
                        {r.fromClub} <span className="text-radar-glow">→</span>{" "}
                        {r.toClub} · {formatFee(r.fee)}
                      </p>
                    </div>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-radar-line pt-3 text-xs">
                    <span
                      className="rounded-full px-2 py-0.5 font-medium"
                      style={{
                        backgroundColor: `${STAGE_COLOR[r.stage]}22`,
                        color: STAGE_COLOR[r.stage],
                      }}
                    >
                      {STAGE_LABELS[r.stage]}
                    </span>
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>%{r.reliability} güven</span>
                      <span>{timeAgo(r.createdAt)}</span>
                      <Link
                        href={`/script?rumor=${r.id}`}
                        className="text-radar-glow hover:underline"
                      >
                        Senaryo yaz →
                      </Link>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <aside className="order-1 lg:order-2 lg:sticky lg:top-8 lg:self-start">
          <RadarView rumors={rumors} />
        </aside>
      </div>
    </>
  );
}
