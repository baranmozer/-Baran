# 📡 Transfer Radar — İçerik Stüdyosu

Futbol transfer haberleri YouTube kanalı için **içerik üretim platformu**.
Antigravity'deki vanilla-JS "Transfer Radar" uygulamasının Next.js'e taşınmış ve
geliştirilmiş hâli. Akış: **Haber → Senaryo → Thumbnail → Yayın**.

> Not: Antigravity sürümünden yalnızca `index.html` (sidebar + yönlendirme
> iskeleti) elde edildi; `js/*.js` ve `css/style.css` modülleri elimde olmadığı
> için işlevler bu iskelete sadık kalınarak yeniden yazıldı. Orijinal JS
> dosyaları paylaşılırsa birebir eşlenebilir.

## Sayfalar (orijinal menüyle birebir)

| Menü | Yol | İşlev |
|------|-----|-------|
| 🎬 İçerik Merkezi | `/` | Genel bakış, içerik kuyruğu, radar görseli |
| 📰 Haber Ekle | `/add-rumor` | Yeni transfer haberi formu |
| 👤 Futbolcu Ara | `/players` | Oyuncu arama + hızlı haber taslağı |
| 📝 Senaryo Yaz | `/script` | Haberden otomatik YouTube senaryosu |
| 🎨 Thumbnail Yap | `/thumbnail` | Canvas ile 1280×720 kapak + PNG indir |
| 📋 Kaynaklar | `/sources` | Kaynak yönetimi + güvenilirlik ağırlığı |
| ⚙️ Ayarlar | `/settings` | Kanal bilgileri, veri sıfırlama |

## Eklenen geliştirmeler

- **Senaryo üreticisi** — başlık önerileri, giriş (hook), gelişme, kapanış ve
  SEO etiketleri; kanal ayarlarını otomatik kullanır.
- **Thumbnail stüdyosu** — 4 tema, görsel yükleme, canlı önizleme, PNG indirme.
- **📡 Radar görselleştirmesi** — haberler güvenilirliğe göre merkeze yaklaşır,
  dönen tarama animasyonu.
- **İçerik aşaması takibi** — Fikir → Senaryo → Thumbnail → Yayın.
- **localStorage veri katmanı** — tüm veriler tarayıcıda; "$0 Cost".
- **Toast bildirimleri** ve koyu radar temalı, responsive arayüz.

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:3000
```

Production:

```bash
npm run build && npm start
```

## Yapı

```
src/
  app/            # App Router sayfaları (her menü = bir route)
  components/     # Sidebar, RadarView, StatusBadge, ui primitives
  store/          # StudioContext (veri katmanı + toast)
  lib/            # types, seed verisi, senaryo üreticisi, yardımcılar
```

## Teknik

- Next.js 16 + React 19 (App Router, TypeScript, Tailwind)
- `npm audit`: 0 güvenlik açığı
