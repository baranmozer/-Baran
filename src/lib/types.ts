// "Transfer Radar" — futbol transfer haberleri YouTube kanalı için içerik stüdyosu.

// Bir haberin/transferin yaşam döngüsü.
export type RumorStatus =
  | "rumor" // Söylenti
  | "talks" // Görüşmeler
  | "agreed" // Anlaşma (here we go)
  | "official" // Resmi
  | "collapsed"; // İptal

export type Position = "GK" | "DEF" | "MID" | "FWD";

export type ContentStage =
  | "idea" // Haber girildi, fikir
  | "scripted" // Senaryo yazıldı
  | "thumbnail" // Thumbnail hazır
  | "published"; // Yayınlandı

export interface Source {
  id: string;
  name: string;
  /** Güvenilirlik ağırlığı 0-100 (ör. Fabrizio Romano = 95). */
  weight: number;
  url?: string;
}

export interface Player {
  id: string;
  name: string;
  position: Position;
  club: string;
  age: number;
  nationality: string;
  /** Piyasa değeri (milyon €). */
  marketValue: number;
}

export interface Rumor {
  id: string;
  player: string;
  fromClub: string;
  toClub: string;
  /** Bonservis (milyon €). 0 = bedelsiz, null = bilinmiyor. */
  fee: number | null;
  /** Güvenilirlik 0-100. */
  reliability: number;
  status: RumorStatus;
  sourceId?: string;
  note?: string;
  /** İçerik üretim aşaması. */
  stage: ContentStage;
  createdAt: string;
}

export interface Script {
  id: string;
  rumorId: string;
  titleOptions: string[];
  hook: string;
  body: string;
  outro: string;
  tags: string[];
  createdAt: string;
}

export interface Settings {
  channelName: string;
  host: string;
  cta: string;
  hashtag: string;
}
