import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "futures-position-meta.json");

export interface PositionMeta {
  algoId: number;
  direction: "LONG" | "SHORT";
  entryPrice: number;
  quantity: number;
  /** Pozisyon acilirken gercekten kullanilan kaldirac (Binance'in positionRisk
   *  API'si testnet'te bazen guncel/dogru kaldiraci dondurmuyor - bu yuzden
   *  goruntuleme icin buradaki degere guveniyoruz). */
  leverage: number;
  /** Su anki stop-loss/trailing tetikleme fiyati (Binance'teki algo emriyle ayni olmali). */
  currentStopPrice: number;
  /** Pozisyon lehine ulasilan en iyi fiyat (trailing stop icin). */
  peakPrice: number;
  /** Basabas'a tasindi mi (bir daha tasinmasin diye). */
  movedToBreakeven: boolean;
  /** Kar onayi (FUTURES_PROFIT_APPROVAL_ENABLED) bu pozisyon icin zaten
   *  soruldu mu - ayni pozisyon icin tekrar tekrar sorulmamasi icin. */
  profitApprovalRequested?: boolean;
}

function load(): Record<string, PositionMeta> {
  if (!fs.existsSync(FILE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(entries: Record<string, PositionMeta>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

/**
 * Binance'in yeni Algo Order API'si (stop-loss) icin "acik algo emirlerini
 * listele" endpoint'i yok - sadece algoId ile tek tek sorgu/iptal mumkun.
 * Bu yuzden hangi sembolun hangi algoId'ye sahip oldugunu, giris fiyatini
 * ve yonunu kendimiz saklamak zorundayiz. Bu bilgi ayrica stop-loss/
 * likidasyon tetiklenip pozisyon "kendiliginden" kapandiginda (bizim
 * kodumuz cagirilmadan) islem gecmisine dogru kayit dusebilmek icin de
 * kullaniliyor.
 */
export function getPositionMeta(symbol: string): PositionMeta | undefined {
  return load()[symbol];
}

export function setPositionMeta(symbol: string, meta: PositionMeta) {
  const entries = load();
  entries[symbol] = meta;
  save(entries);
}

export function clearPositionMeta(symbol: string) {
  const entries = load();
  delete entries[symbol];
  save(entries);
}

/** Bizim actigimiz, hala takip edilmesi gereken (acik olabilecek) tum semboller. */
export function getAllTrackedSymbols(): string[] {
  return Object.keys(load());
}
