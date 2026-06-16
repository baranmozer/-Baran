"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import { RumorCard, EmptyState, MiniCalendar } from "@/components/cards";

type Filter = "all" | "GS" | "FB";

export default function Dashboard() {
  const { hydrated, getStats, getRumors, sources } = useStudio();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("all");

  if (!hydrated) {
    return (
      <div className="page-header">
        <h1 className="page-title">🎬 İçerik Merkezi</h1>
        <div className="page-subtitle">Yükleniyor…</div>
      </div>
    );
  }

  const stats = getStats();
  const allRumors = getRumors();
  const rumors = getRumors(filter).slice(0, 10);
  const contentDates = Array.from(
    new Set(allRumors.map((r) => new Date(r.createdAt).getDate()))
  );
  const srcOf = (id: string) => sources.find((s) => s.id === id);

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🎬 İçerik Merkezi</h1>
        <div className="page-subtitle">
          Bugün hangi videoyu çekeceğiz? Transfer gündemindeki son gelişmeler.
        </div>
      </div>

      <div className="stats-grid animate-scale-in">
        <div className="stat-card accent">
          <div className="stat-icon">🔥</div>
          <div className="stat-value">{stats.hotRumors}</div>
          <div className="stat-label">Sıcak Haber (Video Bekleyen)</div>
        </div>
        <div className="stat-card success">
          <div className="stat-icon">📹</div>
          <div className="stat-value">{stats.completedVideos}</div>
          <div className="stat-label">Tamamlanan Video</div>
        </div>
        <div className="stat-card gs">
          <div className="stat-icon">🟡🔴</div>
          <div className="stat-value">{stats.gsRumors}</div>
          <div className="stat-label">GS Gündemi</div>
        </div>
        <div className="stat-card fb">
          <div className="stat-icon">🟡🔵</div>
          <div className="stat-value">{stats.fbRumors}</div>
          <div className="stat-label">FB Gündemi</div>
        </div>
      </div>

      <div className="two-col mt-32">
        <div>
          <div className="flex items-center justify-between mb-16">
            <h2 className="card-title" style={{ margin: 0 }}>📰 Son Transfer Haberleri</h2>
            <div className="filter-tabs" style={{ margin: 0 }}>
              <button className={`filter-tab ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>Tümü</button>
              <button className={`filter-tab gs ${filter === "GS" ? "active" : ""}`} onClick={() => setFilter("GS")}>GS</button>
              <button className={`filter-tab fb ${filter === "FB" ? "active" : ""}`} onClick={() => setFilter("FB")}>FB</button>
            </div>
          </div>
          <div id="dashboard-feed">
            {rumors.length === 0 ? (
              <EmptyState icon="📭" title="Haber Yok" text="Bu filtreye uygun transfer haberi bulunamadı." />
            ) : (
              rumors.map((r) => <RumorCard key={r.id} rumor={r} source={srcOf(r.sourceId)} />)
            )}
          </div>
        </div>

        <div>
          <div className="card mb-24">
            <h3 className="card-title mb-16">⚡ Hızlı İçerik Üret</h3>
            <div className="flex-col gap-8">
              <button className="btn btn-primary w-full" onClick={() => router.push("/script")}>📝 Günlük Transfer Özeti Videosu Yap</button>
              <button className="btn btn-secondary w-full" onClick={() => router.push("/add-rumor")}>➕ Yeni Transfer Haberi Ekle</button>
              <button className="btn btn-secondary w-full" onClick={() => router.push("/thumbnail")}>🎨 Sadece Thumbnail Yap</button>
            </div>
          </div>

          <div className="card">
            <h3 className="card-title mb-16">📅 İçerik Takvimi</h3>
            <MiniCalendar contentDates={contentDates} />
          </div>
        </div>
      </div>
    </>
  );
}
