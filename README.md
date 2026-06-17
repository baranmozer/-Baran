# Transfer Radar — YouTube İçerik Stüdyosu

Futbol transfer haberleri YouTube kanalı için **tam donanımlı içerik üretim platformu**.
Akış: **Haber Topla → Agent ile Değerlendir → Senaryo Yaz → Thumbnail Yap → Yayınla**.

## Kurulum (Windows / Mac / Linux)

### 1. Gereksinimler

- **Node.js** (v18+): [nodejs.org](https://nodejs.org) — LTS sürümünü indir ve kur
- **Git** (opsiyonel): `winget install Git.Git` (Windows) veya [git-scm.com](https://git-scm.com)

### 2. Projeyi İndir

```bash
git clone https://github.com/baranmozer/-baran.git
cd -baran
```

Git yoksa GitHub'dan ZIP olarak indir → klasörü aç → terminalde o klasöre git.

### 3. Bağımlılıkları Kur ve Başlat

```bash
npm install
npm run dev
```

Tarayıcıda **http://localhost:3000** adresini aç.

### Windows PowerShell Notu

PowerShell'de `npm : Bu sistemde betik çalıştırma devre dışı` hatası alırsan:

```powershell
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned
```

komutunu çalıştır, sonra tekrar `npm install` dene.

### 4. Transfer Agent için API Anahtarı (Opsiyonel)

AI analizi için Anthropic API key gerekir. `.env.local` dosyası oluştur:

```bash
cp .env.local.example .env.local
```

`.env.local` içine API key'ini ekle:

```
ANTHROPIC_API_KEY=sk-ant-...
```

Sonra sunucuyu yeniden başlat (`npm run dev`).

> **Claude Pro ≠ API.** Claude Pro (claude.ai) aboneliği API kullanımını kapsamaz.
> API key [console.anthropic.com](https://console.anthropic.com) adresinden alınır.
> Key yoksa uygulama yine çalışır, sadece AI butonu uyarı gösterir.

## Sayfalar

| Menü | Yol | İşlev |
|------|-----|-------|
| 🎬 İçerik Merkezi | `/` | Dashboard: istatistikler, son haberler, takvim, hızlı aksiyonlar |
| 📰 Haber Ekle | `/add-rumor` | Yeni transfer haberi formu (kaynak, tür, öncelik) |
| 👤 Futbolcu Ara | `/players` | Oyuncu arama + detay kartları |
| 📝 Senaryo Yaz | `/script` | 4 şablonla otomatik YouTube senaryosu |
| 🎨 Thumbnail Yap | `/thumbnail` | Canvas ile 1280x720 kapak + PNG indir |
| 🕵️ Transfer Agent | `/agent` | 7 beceriyle haber değerlendirme (ücretsiz + AI) |
| 📋 Kaynaklar | `/sources` | Muhabir yönetimi + güvenilirlik puanları |
| ⚙️ Ayarlar | `/settings` | Kanal bilgileri, JSON yedekleme, fabrika sıfırlama |

## Transfer Agent Becerileri (7 Mod)

Agent iki katmandan oluşur:
- **Ücretsiz katman**: Kaynak güvenilirliği + haber türünü ağırlıklandırarak olasılık hesaplar ($0)
- **AI katman**: Claude API ile derin analiz + opsiyonel web arama (API key gerekir)

| # | Mod | Kapsam | Açıklama |
|---|-----|--------|----------|
| 1 | 🎯 Transfer Değerlendirme | Oyuncu | Tek oyuncunun transfer olasılığı, lehte/aleyhte faktörler |
| 2 | 📊 Oyuncu Analizi | Oyuncu | İstatistik, form, güçlü/zayıf yönler, takıma uyum |
| 3 | ⚔️ GS vs FB Karşılaştırma | Tümü | İki takımın transfer gündemini karşılaştır |
| 4 | 🧩 Kadro İhtiyacı Analizi | Takım | Kadro eksikleri ve önceliklendirme |
| 5 | 💰 Bonservis / Maliyet | Oyuncu | Rakam mantıklı mı, risk/getiri |
| 6 | 🔮 Sezon Sonu Tahmini | Takım | Gelen/giden tahmini, kadro gücü, şampiyonluk değerlendirmesi |
| 7 | 📺 Video İçerik Önerisi | Tümü | Bugün çekilmesi gereken videolar, trend konular |

Agent'ın araçları:
- `get_player_stats` — Veritabanından oyuncu istatistiklerini çeker
- `get_source_reliability` — Kaynak güvenilirlik puanını sorgular
- `web_search` — Güncel haberleri internetten arar (opsiyonel)

## Thumbnail Oluşturucu

- 4 tema: 🔥 Transfer Bombası, ✅ Resmi Transfer, ❌ Yalanlandı, ⚔️ Karşılaştırma
- **Çıkış ➜ Varış ikili arması**: Futbolcunun mevcut ve gideceği takımın armaları
- **20+ kulüp renk paleti**: GS, FB, BJK, TS, PSG, Bayern, Liverpool, Chelsea, Arsenal...
- **Logo ekleme**: Dosyadan yükle veya URL gir (CORS sorunu yok)
- **Takım teması**: GS (sarı-kırmızı) veya FB (sarı-lacivert) renklerle otomatik uyum
- PNG olarak indir (1280x720, YouTube standart)

### Kulüp Logoları

Gerçek logo kullanmak istersen PNG'leri `public/logos/` klasörüne koy:

```
public/logos/galatasaray.png
public/logos/fenerbahce.png
public/logos/besiktas.png
...
```

Dosya yoksa takım renkleriyle telifsiz stilize rozet çizilir (hata vermez).
Thumbnail sayfasında "Varış Takımı Logosu Ekle" butonu ile bilgisayardan da yükleyebilirsin.

## Senaryo Motoru

4 video şablonu:
- 🔥 **Transfer Bombası** (1:30-2:00) — Tek haber odaklı acil video
- 📊 **Oyuncu Analizi** (3:00-4:00) — Derinlemesine futbolcu incelemesi
- 📋 **Günlük Transfer Özeti** (4:00-6:00) — Tüm gündemin özeti
- ⚔️ **GS vs FB Karşılaştırma** (3:00-5:00) — Derbi gündem videosu

Her senaryo: Hook giriş, gelişme bölümleri, SEO etiketleri, kelime sayısı ve tahmini süre içerir.
Agent'tan gelen olasılık skoru otomatik olarak senaryoya eklenir.

## Teknik Detaylar

- **Next.js 16** + React 19 (App Router, TypeScript)
- **Veri**: localStorage (tarayıcıda, $0 maliyet, sunucu gerektirmez)
- **Stil**: Orijinal CSS tasarım sistemi (glassmorphism, radar teması)
- **Güvenlik**: `npm audit` 0 güvenlik açığı
- **API**: Anthropic Claude (sunucu tarafında, key client'a sızmaz)

## Proje Yapısı

```
src/
  app/              # Sayfalar (her menü = bir route)
    api/            # Sunucu tarafı API (Transfer Agent)
  components/       # Sidebar, kartlar, UI bileşenleri
  store/            # StudioContext (veri katmanı + toast)
  lib/              # types, seed, scriptGenerator, thumbnail, agent, logos
public/
  logos/            # Kulüp logo PNG'leri (opsiyonel)
reference/          # Orijinal Antigravity kaynak dosyaları (arşiv)
```
