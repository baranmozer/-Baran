"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Player, Rumor, Source } from "@/lib/types";
import {
  getPriorityLabel,
  getRumorTypeLabel,
  getTeamBadgeClass,
  timeAgo,
} from "@/lib/utils";
import { useStudio } from "@/store/StudioContext";

// ── Transfer Haber Kartı ──
export function RumorCard({ rumor, source }: { rumor: Rumor; source?: Source }) {
  const router = useRouter();
  const { toggleStar, deleteRumor, toast } = useStudio();
  const typeLabel = getRumorTypeLabel(rumor.type);
  const priorityLabel = getPriorityLabel(rumor.priority);
  const teamClass = rumor.team === "GS" ? "team-gs" : rumor.team === "FB" ? "team-fb" : "";
  const teamEmoji = rumor.team === "GS" ? "🟡🔴" : rumor.team === "FB" ? "🟡🔵" : "⚪";

  return (
    <div className={`rumor-card ${teamClass}`} data-rumor-id={rumor.id}>
      <div className="rumor-header">
        <div className="rumor-source">
          <div className="source-avatar">{source ? source.avatar : "??"}</div>
          <div>
            <span className="source-name">{source ? source.name : "Bilinmeyen"}</span>
            {source && (
              <span className="text-muted" style={{ fontSize: 12 }}> {source.handle}</span>
            )}
          </div>
        </div>
        <span className="rumor-time">{timeAgo(rumor.createdAt)}</span>
      </div>

      <div className="rumor-content">{rumor.content}</div>

      <div className="rumor-meta">
        <span className={`badge ${getTeamBadgeClass(rumor.team)}`}>{teamEmoji} {rumor.team}</span>
        <span className={`badge ${typeLabel.class}`}>{typeLabel.icon} {typeLabel.text}</span>
        <span className={`badge ${priorityLabel.class}`}>{priorityLabel.icon} {priorityLabel.text}</span>
        {rumor.videoCreated && <span className="badge badge-confirmed">📹 Video Hazır</span>}
        <span style={{ fontSize: 13, color: "var(--text-muted)", marginLeft: "auto" }}>⚽ {rumor.playerName}</span>
      </div>

      <div className="rumor-actions">
        <button
          className="btn btn-primary btn-sm"
          disabled={rumor.videoCreated}
          style={rumor.videoCreated ? { opacity: 0.5 } : undefined}
          onClick={() => router.push(`/script?rumor=${rumor.id}&player=${rumor.playerId}`)}
        >
          🎬 Video Oluştur
        </button>
        <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/player/${rumor.playerId}`)}>
          📊 Futbolcu Detay
        </button>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => {
            const starred = toggleStar(rumor.id);
            toast(starred ? "Favorilere eklendi." : "Favorilerden çıkarıldı.");
          }}
        >
          {rumor.starred ? "⭐ Favoride" : "☆ Favori"}
        </button>
        <button
          className="btn btn-ghost btn-sm"
          style={{ marginLeft: "auto", color: "var(--error)" }}
          onClick={() => {
            if (confirm("Bu haberi silmek istediğinize emin misiniz?")) {
              deleteRumor(rumor.id);
              toast("Haber silindi.");
            }
          }}
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

// ── Futbolcu Kartı (grid) ──
export function PlayerCard({ player }: { player: Player }) {
  const trend = player.marketValueTrend === "up" ? "📈" : player.marketValueTrend === "down" ? "📉" : "➡️";
  return (
    <Link href={`/player/${player.id}`} className="player-card" style={{ cursor: "pointer", display: "block" }}>
      <div className="player-card-header">
        <span className="badge badge-info player-position-badge">{player.positionShort}</span>
        <div className="player-info">
          <div className="player-avatar">⚽</div>
          <div className="player-details">
            <h3>{player.name}</h3>
            <div className="player-team-age">
              <span>{player.currentTeam}</span><span>•</span>
              <span>{player.age} yaş</span><span>•</span>
              <span>{player.nationality}</span>
            </div>
            <div className="player-value">{trend} {player.marketValue}</div>
          </div>
        </div>
      </div>
      <div className="player-card-stats">
        <Stat n={player.stats.goals} l="Gol" />
        <Stat n={player.stats.assists} l="Asist" />
        <Stat n={player.stats.matches} l="Maç" />
        <Stat n={player.stats.rating} l="Puan" />
      </div>
    </Link>
  );
}

function Stat({ n, l }: { n: number; l: string }) {
  return (
    <div className="player-stat">
      <div className="stat-num">{n}</div>
      <div className="stat-lbl">{l}</div>
    </div>
  );
}

// ── Performans Barı ──
export function StatBar({ label, value, max, colorClass = "accent" }: { label: string; value: number; max: number; colorClass?: string }) {
  const pct = Math.min((value / max) * 100, 100);
  const colorMap: Record<string, string> = {
    accent: "var(--accent)", success: "var(--success)", warning: "var(--warning)",
    error: "var(--error)", gs: "var(--gs-gold)", fb: "var(--fb-navy)",
  };
  return (
    <div className="stat-bar-group">
      <div className="stat-bar-label">
        <span>{label}</span>
        <span className="stat-bar-value">{value}</span>
      </div>
      <div className="stat-bar">
        <div className="stat-bar-fill" style={{ width: `${pct}%`, background: colorMap[colorClass] || colorMap.accent }} />
      </div>
    </div>
  );
}

// ── Kaynak Kartı ──
export function SourceCard({ source }: { source: Source }) {
  const { deleteSource, toast } = useStudio();
  const teamClass = source.team === "GS" ? "gs" : source.team === "FB" ? "fb" : "general";
  const relColor = source.reliability >= 85 ? "var(--success)" : source.reliability >= 70 ? "var(--warning)" : "var(--error)";
  return (
    <div className="source-card" data-source-id={source.id}>
      <div className={`source-avatar ${teamClass}`}>{source.avatar}</div>
      <div className="source-info">
        <div className="source-name">{source.name}</div>
        <div className="source-handle">
          {source.handle} • <span className={`badge badge-${teamClass === "general" ? "info" : teamClass}`} style={{ fontSize: 10 }}>{source.team}</span>
        </div>
        <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
          {source.newsCount || 0} haber {source.lastDate ? `• Son: ${timeAgo(source.lastDate)}` : ""}
        </div>
      </div>
      <div className="source-reliability">
        <div className="reliability-value" style={{ color: relColor }}>%{source.reliability}</div>
        <div className="reliability-label">Güvenilirlik</div>
      </div>
      <button
        className="btn btn-ghost btn-sm"
        title="Sil"
        style={{ color: "var(--error)", marginLeft: 8 }}
        onClick={() => {
          if (confirm("Bu kaynağı silmek istediğinize emin misiniz?")) {
            deleteSource(source.id);
            toast("Kaynak silindi.");
          }
        }}
      >
        🗑️
      </button>
    </div>
  );
}

// ── Boş Durum ──
export function EmptyState({ icon, title, text, action }: { icon: string; title: string; text: string; action?: React.ReactNode }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <div className="empty-title">{title}</div>
      <div className="empty-text">{text}</div>
      {action}
    </div>
  );
}

// ── Mini Takvim ──
export function MiniCalendar({ contentDates = [] }: { contentDates?: number[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();
  const dayNames = ["Pz", "Pt", "Sa", "Ça", "Pe", "Cu", "Ct"];
  const monthNames = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
  const startDay = firstDay === 0 ? 6 : firstDay - 1;

  return (
    <div>
      <div style={{ textAlign: "center", fontWeight: 700, marginBottom: 12, fontSize: 14 }}>
        {monthNames[month]} {year}
      </div>
      <div className="calendar-mini">
        {dayNames.map((d) => (
          <div key={d} className="calendar-day-header">{d}</div>
        ))}
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`e${i}`} className="calendar-day" />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const d = i + 1;
          const cls = `calendar-day ${d === today ? "today" : ""} ${contentDates.includes(d) ? "has-content" : ""}`;
          return (
            <div key={d} className={cls}>{d}</div>
          );
        })}
      </div>
    </div>
  );
}
