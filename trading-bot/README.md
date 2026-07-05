# Trading Bot — TradingView → Binance Testnet

TradingView alert'lerini webhook ile alip Binance **Testnet** (sahte para) hesabinda
otomatik emir acan/kapatan bot. Su an **sadece testnet** icin ayarli — gercek paraya
gecmeden once "Canliya gecmeden once" bolumunu oku.

## Nasil calisir

1. TradingView'daki bir strateji/indikatorde alert kurulur.
2. Alert tetiklenince TradingView, bu botun `/webhook` adresine JSON gonderir.
3. Bot secret'i dogrular, sembolun izinli listede olup olmadigina bakar.
4. **BUY**: bakiyenin sabit yuzdesi kadar (varsayilan %2) market emriyle alim yapar,
   ardindan **zorunlu stop-loss** emri koyar. Stop-loss yuzdesi alert icinde gelir.
5. **SELL**: o sembol icin bot'un actigi pozisyon varsa stop emrini iptal edip
   market'ten satar. Bot'un bilmedigi (kendi actigin) bir pozisyon varsa dokunmaz.

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
```

Baslat:

```bash
npm run dev
```

`http://localhost:3001/health` adresi `{"ok":true}` donerse calisiyor demektir.

## 3) TradingView Alert Webhook Kurulumu

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
  config.ts        # .env okur, dogrular
  types.ts          # TradingViewAlert, OpenPosition tipleri
  binanceClient.ts  # Binance REST imzali istekler, emir fonksiyonlari
  riskManager.ts    # secret/sembol/stop-loss dogrulama, pozisyon boyutu hesabi
  positionStore.ts  # data/positions.json ile acik pozisyon takibi
  server.ts         # Express /webhook ve /health endpoint'leri
  index.ts          # giris noktasi
data/
  positions.json    # calisirken olusur, git'e girmez
```
