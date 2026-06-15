// Transfer durumu — söylentiden resmi açıklamaya doğru ilerler.
export type TransferStatus =
  | "rumor" // Söylenti
  | "talks" // Görüşmeler sürüyor
  | "agreed" // Anlaşma sağlandı (here we go)
  | "official" // Resmi açıklandı
  | "collapsed"; // İptal / çöktü

export type Position = "GK" | "DEF" | "MID" | "FWD";

export type League =
  | "Süper Lig"
  | "Premier League"
  | "LaLiga"
  | "Serie A"
  | "Bundesliga"
  | "Ligue 1"
  | "Diğer";

export interface Club {
  name: string;
  league: League;
  crest?: string; // opsiyonel amblem URL'i
}

export interface Transfer {
  id: string;
  player: string;
  age: number;
  position: Position;
  from: Club;
  to: Club;
  /** Bonservis bedeli (milyon €). 0 = bedelsiz/serbest. null = bilinmiyor. */
  fee: number | null;
  /** Güvenilirlik yüzdesi 0-100 — haberin gerçekleşme olasılığı. */
  reliability: number;
  status: TransferStatus;
  /** Haber kaynağı (ör. Fabrizio Romano). */
  source: string;
  /** ISO tarih. */
  updatedAt: string;
}
