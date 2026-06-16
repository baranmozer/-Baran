import type { Player, Rumor, Source, Settings } from "./types";

export const SEED_SOURCES: Source[] = [
  { id: "s_romano", name: "Fabrizio Romano", weight: 95, url: "https://twitter.com/FabrizioRomano" },
  { id: "s_dimarzio", name: "Gianluca Di Marzio", weight: 88 },
  { id: "s_sky", name: "Sky Sport", weight: 82 },
  { id: "s_athletic", name: "The Athletic", weight: 85 },
  { id: "s_yagiz", name: "Yağız Sabuncuoğlu", weight: 80 },
  { id: "s_marca", name: "Marca", weight: 65 },
  { id: "s_twitter", name: "Sosyal medya / söylenti", weight: 30 },
];

export const SEED_PLAYERS: Player[] = [
  { id: "p1", name: "Victor Osimhen", position: "FWD", club: "Napoli", age: 27, nationality: "Nijerya", marketValue: 100 },
  { id: "p2", name: "Florian Wirtz", position: "MID", club: "Bayer Leverkusen", age: 23, nationality: "Almanya", marketValue: 140 },
  { id: "p3", name: "Hakan Çalhanoğlu", position: "MID", club: "Inter", age: 32, nationality: "Türkiye", marketValue: 30 },
  { id: "p4", name: "Nico Williams", position: "FWD", club: "Athletic Bilbao", age: 23, nationality: "İspanya", marketValue: 70 },
  { id: "p5", name: "Alphonso Davies", position: "DEF", club: "Bayern Münih", age: 25, nationality: "Kanada", marketValue: 50 },
  { id: "p6", name: "Marcus Rashford", position: "FWD", club: "Manchester United", age: 28, nationality: "İngiltere", marketValue: 45 },
  { id: "p7", name: "Youssef En-Nesyri", position: "FWD", club: "Fenerbahçe", age: 29, nationality: "Fas", marketValue: 25 },
  { id: "p8", name: "Sandro Tonali", position: "MID", club: "Newcastle", age: 26, nationality: "İtalya", marketValue: 55 },
];

export const SEED_RUMORS: Rumor[] = [
  {
    id: "r1",
    player: "Victor Osimhen",
    fromClub: "Napoli",
    toClub: "Galatasaray",
    fee: 75,
    reliability: 68,
    status: "talks",
    sourceId: "s_romano",
    note: "Galatasaray kiralık + opsiyon formülü deniyor.",
    stage: "idea",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "r2",
    player: "Hakan Çalhanoğlu",
    fromClub: "Inter",
    toClub: "Fenerbahçe",
    fee: 22,
    reliability: 60,
    status: "talks",
    sourceId: "s_dimarzio",
    note: "Oyuncu Türkiye'ye dönmek istiyor.",
    stage: "scripted",
    createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
  {
    id: "r3",
    player: "Nico Williams",
    fromClub: "Athletic Bilbao",
    toClub: "FC Barcelona",
    fee: 58,
    reliability: 78,
    status: "agreed",
    sourceId: "s_romano",
    note: "Serbest kalma bedeli ödenecek.",
    stage: "thumbnail",
    createdAt: new Date(Date.now() - 26 * 3600_000).toISOString(),
  },
  {
    id: "r4",
    player: "Florian Wirtz",
    fromClub: "Bayer Leverkusen",
    toClub: "Manchester City",
    fee: 130,
    reliability: 45,
    status: "rumor",
    sourceId: "s_sky",
    stage: "idea",
    createdAt: new Date(Date.now() - 9 * 3600_000).toISOString(),
  },
];

export const DEFAULT_SETTINGS: Settings = {
  channelName: "Transfer Radar",
  host: "Baran",
  cta: "Videayı beğenmeyi ve kanala abone olmayı unutmayın!",
  hashtag: "#TransferRadar #Transfer #Futbol",
};
