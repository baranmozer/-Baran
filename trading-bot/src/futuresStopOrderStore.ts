import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const FILE_PATH = path.join(DATA_DIR, "futures-stop-orders.json");

function load(): Record<string, number> {
  if (!fs.existsSync(FILE_PATH)) return {};
  return JSON.parse(fs.readFileSync(FILE_PATH, "utf-8"));
}

function save(entries: Record<string, number>) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(FILE_PATH, JSON.stringify(entries, null, 2));
}

/**
 * Binance'in yeni Algo Order API'si (stop-loss) icin "acik algo emirlerini
 * listele" endpoint'i yok - sadece algoId ile tek tek sorgu/iptal mumkun.
 * Bu yuzden hangi sembolun hangi algoId'ye sahip oldugunu kendimiz
 * saklamak zorundayiz (pozisyon durumunun kendisi hala canli API'den
 * okunuyor, sadece stop emri ID'si burada tutuluyor).
 */
export function getStopOrderId(symbol: string): number | undefined {
  return load()[symbol];
}

export function setStopOrderId(symbol: string, algoId: number) {
  const entries = load();
  entries[symbol] = algoId;
  save(entries);
}

export function clearStopOrderId(symbol: string) {
  const entries = load();
  delete entries[symbol];
  save(entries);
}
