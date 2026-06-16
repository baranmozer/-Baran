// Transfer Radar — veri modeli (orijinal data.js ile birebir).

export type Team = "GS" | "FB" | "BJK" | "TS" | "Genel";
export type RumorType = "rumor" | "strong" | "confirmed" | "denied";
export type Priority = "hot" | "normal" | "low";
export type Trend = "up" | "down" | "stable";

export interface Source {
  id: string;
  name: string;
  handle: string;
  team: "GS" | "FB" | "Genel";
  reliability: number; // 0-100
  newsCount: number;
  lastDate: string | null;
  avatar: string; // baş harfler
}

export interface MatchPerf {
  date: string;
  opponent: string;
  goals: number;
  assists: number;
  rating: number;
}

export interface CareerEntry {
  team: string;
  years: string;
  goals: number;
  matches: number;
}

export interface PlayerStats {
  goals: number;
  assists: number;
  matches: number;
  rating: number;
  yellowCards: number;
  redCards: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  nationality: string;
  position: string;
  positionShort: string;
  currentTeam: string;
  marketValue: string; // "€75M"
  marketValueTrend: Trend;
  contractEnd: string;
  stats: PlayerStats;
  last5: MatchPerf[];
  career: CareerEntry[];
}

export interface Rumor {
  id: string;
  playerName: string;
  playerId: string;
  team: Team;
  sourceId: string;
  type: RumorType;
  priority: Priority;
  content: string;
  tweetUrl?: string;
  createdAt: string;
  starred: boolean;
  videoCreated: boolean;
}

export interface Settings {
  channelName: string;
  apiKey: string;
  defaultTemplate: string;
  autoSave: boolean;
  theme: string;
}

export interface Stats {
  totalRumors: number;
  todayRumors: number;
  pendingVideos: number;
  completedVideos: number;
  gsRumors: number;
  fbRumors: number;
  hotRumors: number;
  starredRumors: number;
}
