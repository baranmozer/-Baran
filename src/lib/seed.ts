import type { Player, Rumor, Source, Settings } from "./types";

// ── Kaynaklar (gerçek Türk spor muhabirleri) ──
export const DEFAULT_SOURCES: Source[] = [
  { id: "s1", name: "Yağız Sabuncuoğlu", handle: "@yaboreel", team: "GS", reliability: 88, newsCount: 0, lastDate: null, avatar: "YS" },
  { id: "s2", name: "Emre Kaplan", handle: "@emaboreel", team: "GS", reliability: 82, newsCount: 0, lastDate: null, avatar: "EK" },
  { id: "s3", name: "Ertan Süzgün", handle: "@aboreel", team: "GS", reliability: 75, newsCount: 0, lastDate: null, avatar: "ES" },
  { id: "s4", name: "Haluk Yunus Cinel", handle: "@HalukYCinel", team: "FB", reliability: 80, newsCount: 0, lastDate: null, avatar: "HC" },
  { id: "s5", name: "Ekrem Konur", handle: "@Ekremkonur", team: "Genel", reliability: 70, newsCount: 0, lastDate: null, avatar: "EK" },
  { id: "s6", name: "Nicolò Schira", handle: "@NicoSchira", team: "Genel", reliability: 85, newsCount: 0, lastDate: null, avatar: "NS" },
  { id: "s7", name: "Fabrizio Romano", handle: "@FabrizioRomano", team: "Genel", reliability: 95, newsCount: 0, lastDate: null, avatar: "FR" },
  { id: "s8", name: "Sercan Dikme", handle: "@saboreel", team: "FB", reliability: 78, newsCount: 0, lastDate: null, avatar: "SD" },
];

// ── Oyuncular (gerçekçi istatistik) ──
export const DEFAULT_PLAYERS: Player[] = [
  {
    id: "p1", name: "Victor Osimhen", age: 27, nationality: "🇳🇬 Nijerya", position: "Forvet", positionShort: "FW",
    currentTeam: "Napoli", marketValue: "€75M", marketValueTrend: "down", contractEnd: "2027",
    stats: { goals: 18, assists: 5, matches: 32, rating: 7.4, yellowCards: 4, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Juventus", goals: 1, assists: 0, rating: 7.8 },
      { date: "25.05", opponent: "AC Milan", goals: 2, assists: 1, rating: 9.1 },
      { date: "18.05", opponent: "Lazio", goals: 0, assists: 0, rating: 6.2 },
      { date: "11.05", opponent: "Roma", goals: 1, assists: 1, rating: 8.0 },
      { date: "04.05", opponent: "Inter", goals: 0, assists: 1, rating: 7.1 },
    ],
    career: [
      { team: "Napoli", years: "2020-", goals: 76, matches: 133 },
      { team: "Lille", years: "2019-2020", goals: 18, matches: 38 },
      { team: "Charleroi", years: "2018-2019", goals: 20, matches: 36 },
    ],
  },
  {
    id: "p2", name: "Marcus Rashford", age: 28, nationality: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 İngiltere", position: "Sol Kanat", positionShort: "LW",
    currentTeam: "Manchester United", marketValue: "€55M", marketValueTrend: "down", contractEnd: "2028",
    stats: { goals: 8, assists: 4, matches: 33, rating: 6.8, yellowCards: 3, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Arsenal", goals: 0, assists: 0, rating: 6.0 },
      { date: "25.05", opponent: "Chelsea", goals: 1, assists: 0, rating: 7.2 },
      { date: "18.05", opponent: "Liverpool", goals: 0, assists: 1, rating: 6.8 },
      { date: "11.05", opponent: "Tottenham", goals: 1, assists: 0, rating: 7.5 },
      { date: "04.05", opponent: "West Ham", goals: 0, assists: 0, rating: 5.9 },
    ],
    career: [{ team: "Manchester United", years: "2015-", goals: 131, matches: 398 }],
  },
  {
    id: "p3", name: "Paulo Dybala", age: 31, nationality: "🇦🇷 Arjantin", position: "Ofansif Orta Saha", positionShort: "CAM",
    currentTeam: "Roma", marketValue: "€20M", marketValueTrend: "down", contractEnd: "2026",
    stats: { goals: 12, assists: 8, matches: 30, rating: 7.6, yellowCards: 2, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Napoli", goals: 1, assists: 1, rating: 8.2 },
      { date: "25.05", opponent: "Lazio", goals: 0, assists: 2, rating: 7.9 },
      { date: "18.05", opponent: "Fiorentina", goals: 1, assists: 0, rating: 7.5 },
      { date: "11.05", opponent: "Atalanta", goals: 0, assists: 0, rating: 6.4 },
      { date: "04.05", opponent: "Torino", goals: 2, assists: 0, rating: 8.8 },
    ],
    career: [
      { team: "Roma", years: "2022-", goals: 34, matches: 88 },
      { team: "Juventus", years: "2015-2022", goals: 82, matches: 236 },
      { team: "Palermo", years: "2012-2015", goals: 21, matches: 89 },
    ],
  },
  {
    id: "p4", name: "Jhon Arias", age: 27, nationality: "🇨🇴 Kolombiya", position: "Sağ Kanat", positionShort: "RW",
    currentTeam: "Fluminense", marketValue: "€12M", marketValueTrend: "up", contractEnd: "2027",
    stats: { goals: 10, assists: 11, matches: 35, rating: 7.3, yellowCards: 5, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Flamengo", goals: 1, assists: 2, rating: 8.5 },
      { date: "25.05", opponent: "Palmeiras", goals: 0, assists: 1, rating: 7.2 },
      { date: "18.05", opponent: "Corinthians", goals: 1, assists: 0, rating: 7.0 },
      { date: "11.05", opponent: "Santos", goals: 0, assists: 1, rating: 7.4 },
      { date: "04.05", opponent: "Botafogo", goals: 1, assists: 1, rating: 8.1 },
    ],
    career: [
      { team: "Fluminense", years: "2021-", goals: 32, matches: 140 },
      { team: "Patriotas", years: "2019-2021", goals: 8, matches: 45 },
    ],
  },
  {
    id: "p5", name: "Domenico Berardi", age: 30, nationality: "🇮🇹 İtalya", position: "Sağ Kanat", positionShort: "RW",
    currentTeam: "Sassuolo", marketValue: "€18M", marketValueTrend: "stable", contractEnd: "2027",
    stats: { goals: 14, assists: 9, matches: 28, rating: 7.5, yellowCards: 3, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Monza", goals: 2, assists: 1, rating: 9.0 },
      { date: "25.05", opponent: "Empoli", goals: 1, assists: 0, rating: 7.6 },
      { date: "18.05", opponent: "Lecce", goals: 0, assists: 2, rating: 7.8 },
      { date: "11.05", opponent: "Verona", goals: 1, assists: 0, rating: 7.2 },
      { date: "04.05", opponent: "Cagliari", goals: 0, assists: 0, rating: 6.5 },
    ],
    career: [{ team: "Sassuolo", years: "2012-", goals: 130, matches: 352 }],
  },
  {
    id: "p6", name: "Davinson Sánchez", age: 29, nationality: "🇨🇴 Kolombiya", position: "Stoper", positionShort: "CB",
    currentTeam: "Galatasaray", marketValue: "€10M", marketValueTrend: "stable", contractEnd: "2026",
    stats: { goals: 3, assists: 1, matches: 34, rating: 7.1, yellowCards: 7, redCards: 1 },
    last5: [
      { date: "01.06", opponent: "Fenerbahçe", goals: 1, assists: 0, rating: 7.8 },
      { date: "25.05", opponent: "Beşiktaş", goals: 0, assists: 0, rating: 7.2 },
      { date: "18.05", opponent: "Trabzonspor", goals: 0, assists: 0, rating: 6.8 },
      { date: "11.05", opponent: "Başakşehir", goals: 0, assists: 1, rating: 7.0 },
      { date: "04.05", opponent: "Samsunspor", goals: 1, assists: 0, rating: 7.5 },
    ],
    career: [
      { team: "Galatasaray", years: "2023-", goals: 5, matches: 68 },
      { team: "Tottenham", years: "2017-2023", goals: 4, matches: 120 },
      { team: "Ajax", years: "2016-2017", goals: 2, matches: 43 },
    ],
  },
  {
    id: "p7", name: "Dusan Tadic", age: 37, nationality: "🇷🇸 Sırbistan", position: "Ofansif Orta Saha", positionShort: "CAM",
    currentTeam: "Fenerbahçe", marketValue: "€5M", marketValueTrend: "down", contractEnd: "2026",
    stats: { goals: 9, assists: 14, matches: 36, rating: 7.3, yellowCards: 4, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Galatasaray", goals: 0, assists: 2, rating: 7.6 },
      { date: "25.05", opponent: "Beşiktaş", goals: 1, assists: 1, rating: 8.0 },
      { date: "18.05", opponent: "Antalyaspor", goals: 0, assists: 0, rating: 6.5 },
      { date: "11.05", opponent: "Kasımpaşa", goals: 1, assists: 1, rating: 7.8 },
      { date: "04.05", opponent: "Konyaspor", goals: 0, assists: 1, rating: 7.2 },
    ],
    career: [
      { team: "Fenerbahçe", years: "2023-", goals: 15, matches: 72 },
      { team: "Ajax", years: "2018-2023", goals: 60, matches: 199 },
      { team: "Southampton", years: "2014-2018", goals: 23, matches: 162 },
    ],
  },
  {
    id: "p8", name: "Michy Batshuayi", age: 31, nationality: "🇧🇪 Belçika", position: "Forvet", positionShort: "FW",
    currentTeam: "Fenerbahçe", marketValue: "€4M", marketValueTrend: "down", contractEnd: "2026",
    stats: { goals: 11, assists: 2, matches: 30, rating: 6.9, yellowCards: 2, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Galatasaray", goals: 1, assists: 0, rating: 7.2 },
      { date: "25.05", opponent: "Beşiktaş", goals: 0, assists: 0, rating: 6.0 },
      { date: "18.05", opponent: "Antalyaspor", goals: 2, assists: 0, rating: 8.5 },
      { date: "11.05", opponent: "Kasımpaşa", goals: 0, assists: 1, rating: 6.8 },
      { date: "04.05", opponent: "Konyaspor", goals: 1, assists: 0, rating: 7.0 },
    ],
    career: [
      { team: "Fenerbahçe", years: "2023-", goals: 18, matches: 60 },
      { team: "Chelsea", years: "2016-2023", goals: 25, matches: 77 },
      { team: "Marseille", years: "2014-2016", goals: 33, matches: 78 },
    ],
  },
  {
    id: "p9", name: "Mason Greenwood", age: 24, nationality: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 İngiltere", position: "Sağ Kanat", positionShort: "RW",
    currentTeam: "Marseille", marketValue: "€40M", marketValueTrend: "up", contractEnd: "2029",
    stats: { goals: 21, assists: 6, matches: 34, rating: 7.8, yellowCards: 3, redCards: 0 },
    last5: [
      { date: "01.06", opponent: "Lyon", goals: 2, assists: 0, rating: 8.6 },
      { date: "25.05", opponent: "PSG", goals: 1, assists: 1, rating: 8.0 },
      { date: "18.05", opponent: "Monaco", goals: 0, assists: 1, rating: 6.9 },
      { date: "11.05", opponent: "Lille", goals: 2, assists: 1, rating: 9.0 },
      { date: "04.05", opponent: "Nice", goals: 1, assists: 0, rating: 7.7 },
    ],
    career: [
      { team: "Marseille", years: "2024-", goals: 25, matches: 40 },
      { team: "Getafe", years: "2023-2024", goals: 10, matches: 36 },
      { team: "Manchester United", years: "2019-2023", goals: 35, matches: 129 },
    ],
  },
];

// Haber tohumları — createdAt, istemcide (kaç saat önce) hesaplanır (SSR uyuşmazlığını önlemek için).
interface RumorSeed extends Omit<Rumor, "createdAt"> {
  hoursAgo: number;
}

const RUMOR_SEEDS: RumorSeed[] = [
  { id: "r1", playerName: "Victor Osimhen", playerId: "p1", team: "GS", sourceId: "s2", type: "strong", priority: "hot", content: "Osimhen transferi için Napoli ile görüşmeler olumlu ilerliyor. Galatasaray, kiralama opsiyonunu satın alma hakkıyla birlikte değerlendiriyor. Oyuncunun bonservis bedeli üzerinde pazarlık sürüyor.", tweetUrl: "", starred: true, videoCreated: false, hoursAgo: 2 },
  { id: "r2", playerName: "Marcus Rashford", playerId: "p2", team: "FB", sourceId: "s4", type: "rumor", priority: "hot", content: "Fenerbahçe'nin Manchester United'ın yıldızı Marcus Rashford için temas kurduğu öğrenildi. Oyuncunun menajerliğini yapan ekiple görüşmeler başladı. Maaş konusu en büyük engel olarak görülüyor.", tweetUrl: "", starred: false, videoCreated: false, hoursAgo: 5 },
  { id: "r3", playerName: "Paulo Dybala", playerId: "p3", team: "GS", sourceId: "s7", type: "confirmed", priority: "hot", content: "Here we go! Paulo Dybala, Galatasaray ile 2+1 yıllık sözleşme konusunda anlaştı. Roma ile ayrılık konusunda mutabakat sağlandı. Oyuncu önümüzdeki hafta İstanbul'a gelecek.", tweetUrl: "", starred: true, videoCreated: true, hoursAgo: 1 },
  { id: "r4", playerName: "Jhon Arias", playerId: "p4", team: "FB", sourceId: "s5", type: "strong", priority: "normal", content: "Fenerbahçe, Fluminense'nin yıldızı Jhon Arias için 10 milyon Euro + bonuslar şeklinde bir teklif hazırladı. Kolombiyalı kanat oyuncusu Süper Lig'e sıcak bakıyor.", tweetUrl: "", starred: false, videoCreated: false, hoursAgo: 8 },
  { id: "r5", playerName: "Domenico Berardi", playerId: "p5", team: "GS", sourceId: "s6", type: "rumor", priority: "normal", content: "Galatasaray'ın Sassuolo'nun yıldızı Domenico Berardi'yi gündemine aldığı iddia edildi. İtalyan kanat oyuncusu geçen sezon sakatlığından döndükten sonra 14 gol attı.", tweetUrl: "", starred: false, videoCreated: false, hoursAgo: 12 },
  { id: "r6", playerName: "Davinson Sánchez", playerId: "p6", team: "GS", sourceId: "s1", type: "denied", priority: "low", content: "Davinson Sánchez'in Galatasaray'dan ayrılacağı iddialarını kulüp yalanladı. Kolombiyalı stoper ile sözleşme uzatma görüşmeleri devam ediyor.", tweetUrl: "", starred: false, videoCreated: false, hoursAgo: 24 },
  { id: "r7", playerName: "Dusan Tadic", playerId: "p7", team: "FB", sourceId: "s8", type: "confirmed", priority: "normal", content: "Dusan Tadic, Fenerbahçe ile sözleşmesini 1 yıl daha uzattı. Sırp yıldız, \"İstanbul'da çok mutluyum, burada kalmak istiyorum\" açıklamasını yaptı.", tweetUrl: "", starred: false, videoCreated: true, hoursAgo: 36 },
  { id: "r8", playerName: "Mason Greenwood", playerId: "p9", team: "FB", sourceId: "s4", type: "strong", priority: "hot", content: "Fenerbahçe, Marseille forması giyen Mason Greenwood'u transfer gündeminin üst sıralarına aldı. Sarı-lacivertliler, İngiliz yıldız için kiralama + satın alma opsiyonu formülünü değerlendiriyor. Oyuncunun İstanbul'a sıcak baktığı belirtiliyor.", tweetUrl: "", starred: true, videoCreated: false, hoursAgo: 3 },
];

export function buildDefaultRumors(): Rumor[] {
  const now = Date.now();
  return RUMOR_SEEDS.map(({ hoursAgo, ...r }) => ({
    ...r,
    createdAt: new Date(now - hoursAgo * 3600_000).toISOString(),
  }));
}

export const DEFAULT_SETTINGS: Settings = {
  channelName: "Transfer Radar",
  apiKey: "",
  defaultTemplate: "transfer-bomb",
  autoSave: true,
  theme: "dark",
};
