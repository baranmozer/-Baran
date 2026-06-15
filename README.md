# 📡 Transfer Radarı

Futbol transfer söylentilerini ve resmi açıklamaları tek ekranda takip eden web
uygulaması. Antigravity'deki "transfer radarı" projesinin Next.js'e taşınmış ve
geliştirilmiş hâli.

## Özellikler

- **Transfer kartları** — oyuncu, kulüpler, bonservis, durum ve güvenilirlik.
- **Durum akışı** — Söylenti → Görüşmeler → Anlaşma → Resmi (ve İptal).
- **Güvenilirlik göstergesi** — her habere %0–100 güven puanı + renkli bar.
- **Filtreleme & arama** — lig, durum, oyuncu/kulüp araması ve sıralama.
- **📡 Radar görselleştirmesi** — transferler güvenilirliğe göre merkeze
  yaklaşır; dönen tarama çizgisiyle klasik radar hissi (özel eklenti).
- **Takip listesi** — yıldızla favori transferleri işaretle (localStorage).
- **İstatistik şeridi** — toplam transfer, resmi açıklananlar, hacim, ortalama
  güvenilirlik.

## Çalıştırma

```bash
npm install
npm run dev      # http://localhost:3000
```

Production derlemesi:

```bash
npm run build && npm start
```

## Yapı

```
src/
  app/            # Next.js App Router (layout, sayfa, global stiller)
  components/     # TransferCard, FilterBar, StatsBar, RadarView, StatusBadge
  hooks/          # useWatchlist (localStorage tabanlı takip listesi)
  lib/            # types, demo verisi, yardımcılar
```

## Veri kaynağı

Şu an `src/lib/data.ts` içindeki demo verisini kullanır. Gerçek bir API'ye
(ör. `GET /api/transfers`) geçmek için sadece bu modülü değiştirmek yeterli;
arayüz `Transfer` tipine bağlıdır.
