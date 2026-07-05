# Trading Bot — Otomatik EMA Stratejisi → Binance Testnet

Binance **Testnet** (sahte para) hesabinda kendi kendine calisan, EMA (hareketli
ortalama) kesisim stratejisiyle otomatik emir acan/kapatan bot. Su an **sadece
testnet** icin ayarli — gercek paraya gecmeden once "Canliya gecmeden once"
bolumunu oku.

> Not: Ilk tasarimda TradingView alert'leri webhook ile kullanilmasi planlandi,
> ancak TradingView webhook bildirimlerini ucretli plana (Premium) bagliyor.
> Bunun yerine bot, fiyati dogrudan Binance'ten cekip **kendi stratejisiyle**
> karar veriyor — disaridan hicbir servise veya odemeye ihtiyac yok.

## Nasil calisir

1. Bot, `ALLOWED_SYMBOLS` listesindeki her sembol icin belirli araliklarla
   (`STRATEGY_POLL_SECONDS`) Binance'ten mum verisi (kline) ceker.
2. Hizli EMA (`STRATEGY_EMA_FAST`, varsayilan 9) ve yavas EMA (`STRATEGY_EMA_SLOW`,
   varsayilan 21) hesaplanir.
3. Hizli EMA, yavasi asagidan yukari keserse → **BUY** sinyali.
   Yukaridan asagi keserse → **SELL** sinyali.
4. **BUY**: bakiyenin sabit yuzdesi kadar (varsayilan %2) market emriyle alim yapar,
   ardindan **zorunlu stop-loss** emri koyar (`STRATEGY_STOP_LOSS_PERCENT`).
5. **SELL**: o sembol icin bot'un actigi pozisyon varsa stop emrini iptal edip
   market'ten satar. Bot'un bilmedigi (kendi actigin) bir pozisyon varsa dokunmaz.
6. **Kar hedefi**: fiyat giris fiyatinin `STRATEGY_TAKE_PROFIT_PERCENT` kadar
   ustune cikarsa, EMA sinyali beklemeden pozisyon otomatik kapatilir.

## Indikator kutuphanesi (`src/indicators.ts`)

Su an aktif strateji hala EMA kesisimi, ama asagidaki indikatorler de hazir
durumda — ileride EMA'yla birlikte kombinleyip (ornek: "EMA kesisimi VE RSI
asiri alimda degilse al") daha gelismis stratejiler kurabiliriz:

- `calculateSma` — basit hareketli ortalama
- `calculateEma` — ustel hareketli ortalama (halihazirda kullaniliyor)
- `calculateRsi` — RSI (asiri alim/satim, 0-100)
- `calculateMacd` — MACD cizgisi, sinyal cizgisi, histogram
- `calculateBollingerBands` — Bollinger Bantlari (ust/orta/alt)
- `calculateAtr` — Average True Range (volatilite, dinamik stop-loss icin)
- `calculateFibonacciRetracement` — son X mumun swing high/low'una gore
  Fibonacci duzeltme seviyeleri (%23.6, %38.2, %50, %61.8, %78.6)
- `calculateVwap` — Volume Weighted Average Price (kurumsal traderlarin
  gun ici referans fiyati)
- `calculateStochasticRsi` — RSI'nin kendi araligina gore normalize edilmis
  hali (K/D cizgileri), asiri hassas asiri alim/satim tespiti
- `calculateAdx` — ADX + Directional Index (+DI/-DI), trend gucunu olcer
  (25 uzeri genelde guclu trend)
- `calculateParabolicSar` — trend takip eden durdur-ve-cevir noktalari
- `calculateSupertrend` — ATR tabanli trend takip indikatoru
- `calculateIchimoku` — Ichimoku Cloud (tenkan/kijun/senkou span A-B)
- `detectFairValueGaps` — ICT/Smart Money Concepts tarzinda Fair Value Gap
  (FVG) tespiti: 3 mumluk ardisik grupta doldurulmamis fiyat boslugu

`getCandles()` (`src/binanceClient.ts`) artik sadece kapanis degil, tam OHLCV
(open/high/low/close/volume) mum verisini donuyor — bu indikatorlerin
cogu high/low/volume'a ihtiyac duyar.

Not: Bu indikatorler borsaya (Binance, BtcTurk, fark etmez) bagli degil —
sadece fiyat verisi uzerinde matematiksel hesaplama. Hangi borsadan OHLCV
verisi cekebiliyorsak, ayni indikatorleri orada da kullanabiliriz (Matriks
gibi ayri bir platforma ihtiyac yok).

## Manuel tetikleyici (webhook) hala mevcut

`/webhook` endpoint'i kaldirilmadi — istersen TradingView'in ucretsiz planinda
olmayan webhook yerine, kendi yazacagin bir script'ten veya `curl`/Postman ile
elle BUY/SELL tetiklemek icin kullanabilirsin. Otomatik strateji motoruyla ayni
risk kurallarini ve pozisyon takibini paylasir.

Risk kurallari (varsayilan, degistirilebilir):
- Her islemde bakiyenin sabit bir yuzdesi kullanilir (`POSITION_SIZE_PERCENT`).
- Stop-loss olmadan BUY emri kabul edilmez.
- Stop-loss yuzdesi cok buyukse (`MAX_STOP_LOSS_PERCENT` ustunde) reddedilir.
- Sadece `ALLOWED_SYMBOLS` listesindeki semboller islem gorur.
- Ayni sembolde acik pozisyon varken ikinci BUY kabul edilmez.

## 1) Binance Testnet API Key olustur

Bu **gercek Binance hesabindan farkli**, sahte parayla calisan ayri bir sistem:

1. https://testnet.binance.vision adresine git, GitHub hesabinla giris yap.
2. "Generate HMAC_SHA256 Key" ile bir API Key + Secret olustur.
3. Bu bilgileri kimseyle paylasma, `.env` dosyasina koyacaksin (repoya girmez).

## 2) Kurulum

```bash
cd trading-bot
npm install
cp .env.example .env
```

`.env` dosyasini ac ve doldur:

```
WEBHOOK_SECRET=uzun-rastgele-bir-deger-uret
BINANCE_API_KEY=...        # testnet'ten aldigin key
BINANCE_API_SECRET=...     # testnet'ten aldigin secret
ALLOWED_SYMBOLS=BTCUSDT,ETHUSDT
POSITION_SIZE_PERCENT=2
MAX_STOP_LOSS_PERCENT=10
STRATEGY_ENABLED=true
STRATEGY_CANDLE_INTERVAL=15m
STRATEGY_POLL_SECONDS=60
STRATEGY_EMA_FAST=9
STRATEGY_EMA_SLOW=21
STRATEGY_STOP_LOSS_PERCENT=2
```

Baslat:

```bash
npm run dev
```

`http://localhost:3001/health` adresi `{"ok":true}` donerse calisiyor demektir.
Terminalde `"Strateji motoru basladi"` satirini gorunce bot artik otomatik
calisiyor demektir — TradingView'a veya internete acik bir adrese ihtiyac yok.

## 3) (Opsiyonel) TradingView Alert Webhook Kurulumu

Bu adim **gerekli degil** — strateji motoru zaten otomatik calisiyor. Sadece
TradingView'in kendi analizini/alert'ini de tetikleyici olarak eklemek istersen
(ve TradingView'da webhook destekleyen ucretli bir plan varsa) kullan.

Bot'un internetten erisilebilir olmasi gerekir (TradingView sunucudan sana ulasir).
Yerelde test icin `ngrok http 3001` gibi bir tunel araci kullanabilirsin; kalici
kurulum icin botu bir sunucuya (VPS, Render, Railway vb.) deploy et.

TradingView'da alert olustururken **Webhook URL** alanina:

```
https://<senin-adresin>/webhook
```

**Message** alanina (JSON):

```json
{
  "secret": "WEBHOOK_SECRET_ile_ayni_deger",
  "symbol": "BTCUSDT",
  "side": "BUY",
  "stopLossPercent": 2
}
```

Kapatma sinyali icin ayni sembolle `"side": "SELL"` gonder (`stopLossPercent` gerekmez).

TradingView Pine Script alert mesaji icinde `{{ticker}}` gibi degiskenler kullanip
JSON'u dinamik olusturabilirsin, ornek:

```
{"secret":"...","symbol":"{{ticker}}","side":"BUY","stopLossPercent":2}
```

## Acik pozisyonlarin kar/zararini gorme

```
GET /positions
```

Acik her pozisyon icin giris fiyati, guncel fiyat, kar/zarar yuzdesi ve USDT
tutarini doner:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/positions
```

## 4) Test etme

Gercek TradingView alert'i beklemeden manuel test:

```bash
curl -X POST http://localhost:3001/webhook \
  -H "Content-Type: application/json" \
  -d '{"secret":"WEBHOOK_SECRET_degeri","symbol":"BTCUSDT","side":"BUY","stopLossPercent":2}'
```

Binance Testnet hesabinda (testnet.binance.vision) bakiye ve emirleri kontrol et.

## Canliya gecmeden once

Bu bot su an testnet'e gore ayarli. Gercek parayla kullanmadan once:

- `BINANCE_BASE_URL=https://api.binance.com` yap ve **gercek** Binance API key kullan
  (sadece "Spot & Margin Trading" izni ver, **withdraw (para cekme) izni verme**).
- Kucuk pozisyon boyutuyla (`POSITION_SIZE_PERCENT` dusuk) uzun sure gercek piyasada
  test et.
- API key'leri asla repoya, sohbete veya paylasilan bir yere yazma.
- Sunucunun (webhook endpoint'inin) herkese acik oldugunu unutma — `WEBHOOK_SECRET`
  guclu ve gizli olmali, HTTPS kullan.
- Gunluk zarar limiti, pozisyon sayisi limiti gibi ek risk kontrolleri eklemek
  isteyebilirsin — su anki surum sadece sabit pozisyon boyutu + zorunlu stop-loss
  uyguluyor.

## Proje yapisi

```
src/
  config.ts          # .env okur, dogrular
  types.ts           # TradingViewAlert, OpenPosition tipleri
  binanceClient.ts   # Binance REST imzali istekler, emir + kline fonksiyonlari
  indicators.ts       # EMA hesaplama + crossover tespiti
  riskManager.ts      # secret/sembol/stop-loss dogrulama, pozisyon boyutu hesabi
  tradeActions.ts      # BUY/SELL islem mantigi (webhook ve strateji motoru ortak kullanir)
  strategyEngine.ts   # periyodik fiyat kontrolu + otomatik EMA stratejisi
  positionStore.ts    # data/positions.json ile acik pozisyon takibi
  server.ts           # Express /webhook (manuel/yedek) ve /health endpoint'leri
  index.ts            # giris noktasi: server + strateji motorunu baslatir
data/
  positions.json      # calisirken olusur, git'e girmez
```
