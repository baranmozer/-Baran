import type { RumorType, Priority, Team } from "./types";

export function timeAgo(dateStr: string, now: Date = new Date()): string {
  const date = new Date(dateStr);
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 60) return "Az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} saat önce`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} gün önce`;
  return date.toLocaleDateString("tr-TR");
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function getRumorTypeLabel(type: RumorType) {
  const map: Record<RumorType, { text: string; class: string; icon: string }> = {
    confirmed: { text: "Kesin", class: "badge-confirmed", icon: "✅" },
    strong: { text: "Güçlü İddia", class: "badge-hot", icon: "🔥" },
    rumor: { text: "Söylenti", class: "badge-rumor", icon: "💬" },
    denied: { text: "Yalanlandı", class: "badge-denied", icon: "❌" },
  };
  return map[type] || map.rumor;
}

export function getPriorityLabel(priority: Priority) {
  const map: Record<Priority, { text: string; class: string; icon: string }> = {
    hot: { text: "Acil", class: "badge-hot", icon: "🔥" },
    normal: { text: "Normal", class: "badge-info", icon: "📌" },
    low: { text: "Düşük", class: "badge-denied", icon: "💤" },
  };
  return map[priority] || map.normal;
}

export function getTeamBadgeClass(team: Team): string {
  if (team === "GS") return "badge-gs";
  if (team === "FB") return "badge-fb";
  return "badge-info";
}

export function uid(prefix = ""): string {
  return prefix + Date.now() + Math.random().toString(36).substring(2, 7);
}
