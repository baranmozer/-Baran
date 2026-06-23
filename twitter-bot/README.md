# Türk Futbol/Basketbol Haber Botu

Galatasaray ve Fenerbahçe odaklı iki ayrı X (Twitter) hesabını besleyen haber otomasyon aracı.

## Kurulum

```bash
cd twitter-bot
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

## X Developer API Anahtarı Alma

1. https://developer.twitter.com adresine git, hesap oluştur/giriş yap
2. Developer Portal → Projects & Apps → yeni proje oluştur
3. App permissions → "Read and Write" olarak ayarla
4. Keys and Tokens sekmesinden şunları al:
   - API Key (Consumer Key)
   - API Secret (Consumer Secret)
   - Access Token
   - Access Token Secret
5. Her hesap için ayrı app oluştur (Galatasaray + Fenerbahçe)
6. `.env.example` dosyasını `.env` olarak kopyala ve anahtarları gir:

```bash
cp .env.example .env
# .env dosyasını düzenle
```

## Kullanım

```bash
# 1. Haberleri topla
python main.py collect

# 2. Tweet taslakları üret
python main.py generate

# 3. Taslakları incele ve onayla
python main.py approve

# 4. Onaylı tweetleri gönder (DRY_RUN varsayılan)
python main.py post

# 5. Zamanlayıcıyı başlat (config saatlerinde otomatik gönderir)
python main.py schedule

# Tek seferde topla + üret
python main.py run
```

## Yapı

```
twitter-bot/
├── config.yaml      # Hesap ayarları, RSS kaynakları, paylaşım saatleri
├── .env.example     # API anahtarları şablonu
├── main.py          # Ana giriş noktası (CLI)
├── collector.py     # RSS haber toplama + SQLite dedup
├── generator.py     # Tweet taslak üretici + onay sistemi
├── poster.py        # X API entegrasyonu (tweepy, DRY_RUN destekli)
├── scheduler.py     # Zamanlayıcı (schedule kütüphanesi)
├── db/              # SQLite veritabanı
├── drafts/          # Tweet taslak dosyaları (JSON)
└── logs/            # Log dosyaları
```

## DRY_RUN Modu

`config.yaml` içinde `dry_run: true` olduğu sürece tweet atılmaz, sadece konsola yazılır.
Gerçek paylaşım için `dry_run: false` yapın.
