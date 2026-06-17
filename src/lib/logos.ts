// Kulüp logosu kayıt defteri.
//
// TELİF NOTU: Kulüp armaları çoğunlukla teliflidir/tescillidir; Wikipedia'da bile
// genelde "non-free" (adil kullanım) olarak barındırılır, yani serbest lisanslı
// DEĞİLDİR. Bu yüzden buraya telifli URL gömmüyoruz. En güvenli ve teknik olarak
// sorunsuz yol: logo dosyalarını projedeki `public/logos/` klasörüne koymak
// (same-origin → CORS sorunu yok, PNG indirme bozulmaz).
//
// Aşağıdaki kayıtlar `public/logos/<slug>.png` yolunu işaret eder. İlgili dosyayı
// koyarsan otomatik kullanılır; koymazsan uygulama takım renkleriyle telifsiz
// stilize rozete düşer (hata vermez).

export const LOGO_URLS: Record<string, string> = {
  GALATASARAY: "/logos/galatasaray.png",
  GS: "/logos/galatasaray.png",
  "FENERBAHÇE": "/logos/fenerbahce.png",
  FB: "/logos/fenerbahce.png",
  "BEŞİKTAŞ": "/logos/besiktas.png",
  BJK: "/logos/besiktas.png",
  TRABZONSPOR: "/logos/trabzonspor.png",
  TS: "/logos/trabzonspor.png",
  MARSEILLE: "/logos/marseille.png",
  NAPOLI: "/logos/napoli.png",
  "MANCHESTER UNITED": "/logos/manchester-united.png",
  "REAL MADRID": "/logos/real-madrid.png",
  "FC BARCELONA": "/logos/barcelona.png",
  BARCELONA: "/logos/barcelona.png",
};

export function logoFor(club: string): string | null {
  if (!club) return null;
  return LOGO_URLS[club.toLocaleUpperCase("tr").trim()] ?? null;
}
