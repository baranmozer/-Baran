"use client";

import { use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import { StatBar, EmptyState } from "@/components/cards";

export default function PlayerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { hydrated, getPlayer, toast } = useStudio();

  if (!hydrated) {
    return <div className="page-subtitle">Yükleniyor…</div>;
  }

  const player = getPlayer(id);
  if (!player) {
    return (
      <EmptyState
        icon="❌"
        title="Hata"
        text="Futbolcu bulunamadı."
        action={<button className="btn btn-primary" onClick={() => router.push("/players")}>Geri Dön</button>}
      />
    );
  }

  const trend = player.marketValueTrend === "up" ? "📈" : player.marketValueTrend === "down" ? "📉" : "➡️";

  const copyStats = () => {
    const text = `📊 ${player.name} (${player.currentTeam})
Yaş: ${player.age} | Pozisyon: ${player.position}
Değer: ${player.marketValue}
-- Bu Sezon --
Maç: ${player.stats.matches}
Gol: ${player.stats.goals}
Asist: ${player.stats.assists}`.trim();
    navigator.clipboard.writeText(text).then(() => toast("İstatistikler panoya kopyalandı.", "success"));
  };

  return (
    <div className="animate-fade-in">
      <button className="btn btn-ghost mb-24" onClick={() => router.push("/players")}>← Geri Dön</button>

      <div className="two-col">
        {/* Sol: Profil */}
        <div>
          <div className="player-card" style={{ cursor: "default" }}>
            <div className="player-card-header">
              <span className="badge badge-info player-position-badge">{player.positionShort} • {player.position}</span>
              <div className="player-info">
                <div className="player-avatar" style={{ width: 80, height: 80, fontSize: 36 }}>⚽</div>
                <div className="player-details">
                  <h3 style={{ fontSize: 26 }}>{player.name}</h3>
                  <div className="player-team-age">
                    <span>{player.currentTeam}</span><span>•</span>
                    <span>{player.age} yaş</span><span>•</span>
                    <span>{player.nationality}</span>
                  </div>
                  <div className="player-value" style={{ fontSize: 18, marginTop: 8 }}>{trend} {player.marketValue}</div>
                  <div className="text-muted" style={{ fontSize: 12, marginTop: 2 }}>Sözleşme: {player.contractEnd}</div>
                </div>
              </div>
            </div>
            <div className="player-card-stats">
              <div className="player-stat"><div className="stat-num">{player.stats.goals}</div><div className="stat-lbl">Gol</div></div>
              <div className="player-stat"><div className="stat-num">{player.stats.assists}</div><div className="stat-lbl">Asist</div></div>
              <div className="player-stat"><div className="stat-num">{player.stats.matches}</div><div className="stat-lbl">Maç</div></div>
              <div className="player-stat"><div className="stat-num">{player.stats.rating}</div><div className="stat-lbl">Puan</div></div>
            </div>
            <div className="player-card-footer">
              <Link className="btn btn-primary btn-sm" href={`/script?player=${player.id}`}>📝 Senaryoya Aktar</Link>
              <Link className="btn btn-secondary btn-sm" href={`/thumbnail?player=${player.id}`}>🎨 Thumbnail Yap</Link>
            </div>
          </div>

          <div className="card mt-24">
            <div className="card-title">📊 Performans Detay</div>
            <div style={{ marginTop: 16 }}>
              <StatBar label="Gol" value={player.stats.goals} max={30} colorClass="accent" />
              <StatBar label="Asist" value={player.stats.assists} max={20} colorClass="accent" />
              <StatBar label="Maç" value={player.stats.matches} max={40} colorClass="success" />
              <StatBar label="Puan" value={player.stats.rating} max={10} colorClass="gs" />
              <StatBar label="Sarı Kart" value={player.stats.yellowCards} max={15} colorClass="warning" />
              <StatBar label="Kırmızı Kart" value={player.stats.redCards} max={5} colorClass="error" />
            </div>
          </div>
        </div>

        {/* Sağ: Son 5 + Kariyer */}
        <div>
          <div className="card">
            <div className="card-title">📅 Son 5 Maç</div>
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Tarih</th><th>Rakip</th><th>⚽</th><th>🅰️</th><th>⭐</th></tr>
              </thead>
              <tbody>
                {player.last5.map((m, i) => (
                  <tr key={i}>
                    <td className="text-muted">{m.date}</td>
                    <td>{m.opponent}</td>
                    <td style={{ fontWeight: 700, color: m.goals > 0 ? "var(--success)" : undefined }}>{m.goals}</td>
                    <td style={{ fontWeight: 700, color: m.assists > 0 ? "var(--info)" : undefined }}>{m.assists}</td>
                    <td><span style={{ fontWeight: 700, color: m.rating >= 8 ? "var(--success)" : m.rating >= 7 ? "var(--warning)" : "var(--error)" }}>{m.rating}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt-24">
            <div className="card-title">🏆 Kariyer</div>
            <table className="data-table" style={{ marginTop: 12 }}>
              <thead>
                <tr><th>Takım</th><th>Yıllar</th><th>⚽ Gol</th><th>📋 Maç</th></tr>
              </thead>
              <tbody>
                {player.career.map((c, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 600 }}>{c.team}</td>
                    <td className="text-muted">{c.years}</td>
                    <td style={{ fontWeight: 700 }}>{c.goals}</td>
                    <td>{c.matches}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card mt-24">
            <div className="card-title">⚡ Hızlı Aksiyonlar</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
              <Link className="btn btn-primary w-full" href={`/script?player=${player.id}`}>📝 Video Senaryosu Oluştur</Link>
              <Link className="btn btn-secondary w-full" href={`/thumbnail?player=${player.id}`}>🎨 YouTube Thumbnail Yap</Link>
              <button className="btn btn-secondary w-full" onClick={copyStats}>📋 İstatistikleri Kopyala</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
