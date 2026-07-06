# Trading Bot — Coklu Indikator (Confluence) Stratejisi → Binance Testnet

Binance **Testnet** (sahte para) hesabinda kendi kendine calisan, 13 farkli
indikatorun agirlikli oyuyla karar veren ("confluence") stratejiyle otomatik
emir acan/kapatan bot. Su an **sadece testnet** icin ayarli — gercek paraya
gecmeden once "Canliya gecmeden once" bolumunu oku.

> Not: Ilk tasarimda TradingView alert'leri webhook ile kullanilmasi planlandi,
> ancak TradingView webhook bildirimlerini ucretli plana (Premium) bagliyor.
> Bunun yerine bot, fiyati dogrudan Binance'ten cekip **kendi stratejisiyle**
> karar veriyor — disaridan hicbir servise veya odemeye ihtiyac yok.

## Nasil calisir (confluence modu, varsayilan)

1. Bot, `ALLOWED_SYMBOLS` listesindeki her sembol icin belirli araliklarla
   (`STRATEGY_POLL_SECONDS`) Binance'ten mum verisi (kline, OHLCV) ceker.
2. `src/confluenceStrategy.ts` icindeki 13 indikatorun her biri kendi
   mantigina gore **+1 (yukselis), -1 (dusus) veya 0 (notr)** oy verir:
   EMA(9/21) kesisimi, SMA50 karsilastirmasi, MACD histogrami, RSI,
   Stochastic RSI, Bollinger Bantlari, ADX+DI/-DI (trend gucu), Parabolic SAR,
   Supertrend, Ichimoku Cloud, VWAP, Fibonacci seviyeleri, Fair Value Gap.
3. Her oy kendi agirligiyla (trend indikatorleri daha agirlikli) carpilip
   toplanir, toplam agirliga bolunerek **-1 ile +1 arasi bir skor** elde edilir.
4. Skor `STRATEGY_BUY_THRESHOLD` (varsayilan 0.4) uzerine cikarsa **BUY**,
   `STRATEGY_SELL_THRESHOLD` (varsayilan -0.4) altina inerse **SELL** sinyali.
5. **BUY**: bakiyenin sabit yuzdesi kadar (varsayilan %2) market emriyle alim yapar,
   ardindan **zorunlu stop-loss** emri koyar (`STRATEGY_STOP_LOSS_PERCENT`).
6. **SELL**: o sembol icin bot'un actigi pozisyon varsa stop emrini iptal edip
   market'ten satar. Bot'un bilmedigi (kendi actigin) bir pozisyon varsa dokunmaz.
7. **Kar hedefi**: fiyat giris fiyatinin `STRATEGY_TAKE_PROFIT_PERCENT` kadar
   ustune cikarsa, sinyal beklemeden pozisyon otomatik kapatilir.

Terminal logunda her sinyalde hangi indikatorun ne oy verdigini goruyorsun
(`"Confluence sinyali"` satirinda `oylar` alani) — kararin neden verildigi
her zaman seffaf.

Daha basit bir mod isteyen icin sadece EMA kesisimine bakan eski mantik da
duruyor: `.env`'de `STRATEGY_MODE=ema` yaparsan bot sadece EMA(9/21)
kesisimine gore karar verir.

## Indikator kutuphanesi (`src/indicators.ts`)

- `calculateSma` — basit hareketli ortalama
- `calculateEma` — ustel hareketli ortalama
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
STRATEGY_MODE=confluence
STRATEGY_CANDLE_INTERVAL=15m
STRATEGY_POLL_SECONDS=60
STRATEGY_CANDLE_LOOKBACK=100
STRATEGY_BUY_THRESHOLD=0.4
STRATEGY_SELL_THRESHOLD=-0.4
STRATEGY_EMA_FAST=9
STRATEGY_EMA_SLOW=21
STRATEGY_STOP_LOSS_PERCENT=2
STRATEGY_TAKE_PROFIT_PERCENT=2
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

## Canli panel ve coklu coin indikator ekrani

```
http://localhost:3001/dashboard
```

Taraycida bu adresi ac — acik Spot/Futures pozisyonlarini ve **WATCHLIST_SYMBOLS**'te
tanimli (varsayilan 21) coin'in su anki BUY/SELL/HOLD onerisini, confluence
skorunu ve hangi indikatorun ne oy verdigini gosteren bir tablo bulacaksin.
Sayfa kendiliginden yenilenir (pozisyonlar 5 saniyede, sinyaller 30 saniyede
bir), elle bir sey calistirmana gerek yok.

Sadece veri olarak istersen:

```
GET /signals
```

`WATCHLIST_SYMBOLS` **sadece izleme icindir, otomatik islem acmaz** —
gercekten trade edilecek semboller hala `ALLOWED_SYMBOLS` (Spot) ve
`FUTURES_ALLOWED_SYMBOLS` (Futures) ile ayri kontrol edilir.

## Acik pozisyonlarin kar/zararini gorme

```
GET /positions
```

Acik her pozisyon icin giris fiyati, guncel fiyat, kar/zarar yuzdesi ve USDT
tutarini doner:

```powershell
Invoke-RestMethod -Uri http://localhost:3001/positions
```

## (Opsiyonel) Binance Futures Modulu — Kaldiracli Islem

**Varsayilan olarak KAPALI.** Bu, Spot'tan tamamen ayri, cok daha riskli bir
sistem — kaldirac kullanildigi icin kucuk bir fiyat hareketi bile pozisyonu
tamamen **likide edebilir** (kaybettirebilir). Acmadan once "Kaldirac riski"
bolumunu mutlaka oku.

### Neden ayri bir sistem?

- Spot'ta elinde olmayan bir varligi satamazsin (short yok), kaybin en fazla
  yatirdigin kadar olur. **Futures hem LONG hem SHORT acabilir.**
- Futures'ta **kaldirac** ile pozisyon buyutulur: 20x kaldiracta fiyat sadece
  **~%5 aleyhine hareket ederse pozisyon likide olur** (marjin sifirlanir).
  Bu yuzden stop-loss'un likidasyon mesafesinden guvenli sekilde uzakta
  olmasi sart — bot bunu her acilista otomatik kontrol eder ve guvensizse
  islemi reddeder.

### LONG ve SHORT nasil karar veriliyor

**Giris** icin tam esik gerekir: confluence skoru `FUTURES_BUY_THRESHOLD`
(varsayilan 0.4) uzerine cikarsa **LONG**, `FUTURES_SELL_THRESHOLD`
(varsayilan -0.4) altina inerse **SHORT** acilir (pozisyon yoksa).

**Cikis cok daha hassastir:** acik bir pozisyon varken indikatorlerin
ortak skoru pozisyona ters isarete donerse (LONG'da skor negatife,
SHORT'ta pozitife donerse) — kar da olsa zarar da olsa, `%2` stop-loss'un
tetiklenmesini beklemeden — **hemen kapatilir**. Yani bot artik ya kar
hedefine (%2) ya da net bir ters sinyale gore erken cikiyor; -%2'ye kadar
beklemek zorunda degil.

### Basabas (breakeven) stop-loss

Fiyat lehte `FUTURES_BREAKEVEN_TRIGGER_PERCENT` (varsayilan %1) kadar
hareket edince, stop-loss **giris fiyatina** cekilir. Boylece bir kere
kara gecen islem, tekrar geri donse bile **en kotu ihtimalle basabas**
kapanir, zarar etmez. `FUTURES_BREAKEVEN_ENABLED=false` ile kapatilabilir.

### Trailing stop (iz suren stop-loss)

Fiyat lehte `FUTURES_TRAILING_ACTIVATION_PERCENT` (varsayilan %2) kadar
hareket edince, sabit kar hedefi devreden cikar; bunun yerine stop-loss,
ulasilan en iyi fiyatin `FUTURES_TRAILING_DISTANCE_PERCENT` (varsayilan %1)
gerisinden takip etmeye baslar. Fiyat lehte gitmeye devam ettikce stop de
onunla birlikte yukari (LONG) / asagi (SHORT) cekilir, sadece geri donus
oldugunda tetiklenir — trend guclu surdukce kar sabit %2'de kalmaz, buyumeye
devam eder. `FUTURES_TRAILING_ENABLED=false` yaparsan sabit `%2` kar
hedefine geri donulur.

### ADX zorunlu giris filtresi

Yeni bir LONG/SHORT acilmadan once ADX (trend gucu) kontrol edilir;
`FUTURES_MIN_ADX_FOR_ENTRY` (varsayilan 20) altindaysa — yani piyasa
yatay/kararsizsa — islem **acilmaz**, log'da "ADX yetersiz" diye gorursun.
Bu, dusuk trend gucunde confluence sinyallerinin yanlis alarm vermesini
azaltir. (Cikis / erken kapatma bu filtreden etkilenmez.)

### Portfoy risk sinirlari

- **Gunluk max zarar** (`FUTURES_DAILY_MAX_LOSS_PERCENT`, varsayilan %5):
  Bugun kapanan islemlerin toplam zarari bakiyenin bu yuzdesini gecerse,
  o gun (gece yarisina kadar) yeni islem acilmaz. Acik pozisyonlar
  (stop-loss, trailing, erken cikis) yonetilmeye devam eder.
- **Max eszamanli pozisyon** (`FUTURES_MAX_CONCURRENT_POSITIONS`,
  varsayilan 8): Ayni anda en fazla bu kadar pozisyon acik olabilir;
  sinira ulasinca yeni sinyaller "max pozisyon sinirina ulasildi" diye
  loglanip atlanir. `0` yaparsan sinirsiz olur.
- **Yeniden giris cooldown'u** (`FUTURES_REENTRY_COOLDOWN_MINUTES`,
  varsayilan 15 dakika): Bir pozisyon herhangi bir nedenle (basabas/
  trailing stop, stop-loss, sinyal degisimi, manuel) kapandiktan sonra,
  ayni sembole bu sure dolmadan tekrar giris yapilmaz. Amac: dalgali
  piyasada kapan-ac-kapan-ac (whipsaw) dongusunu ve her dongude odenen
  islem ucretini azaltmak. `0` yaparsan cooldown devre disi kalir, sinyal
  gelir gelmez tekrar acilabilir.
- **Yon cesitliligi** (`FUTURES_MAX_SAME_DIRECTION_PERCENT`, varsayilan
  %60): Altcoinler buyuk olcude BTC ile korele hareket eder - acik
  pozisyonlarin hepsi ayni yonde (hep LONG ya da hep SHORT) olursa, tek
  bir piyasa hareketi hepsini ayni anda vurabilir. Bu yuzden acik
  pozisyonlarin en fazla bu yuzdesi ayni yonde olabilir; sinira
  ulasilinca "yon cesitliligi sinirina ulasildi" diye loglanip yeni
  islem acilmaz. `100` yaparsan sinirsiz (eski davranis) olur.

### Erken cikis artik ADX ile de suzuluyor

Acik pozisyonda indikator ters yone donunce (skorun isareti pozisyona
aykiri hale gelince) bot HALA hemen kapatir — ama artik sadece
skorun *isareti* degil, ters sinyalin **esigi gecmis olmasi VE
ADX'in yeterli olmasi** (`FUTURES_MIN_ADX_FOR_ENTRY` ile ayni esik)
de gerekiyor. Amac: zayif/gurultulu bir kipirdama yuzunden pozisyonu
erken kapatip whipsaw'a girmeyi azaltmak - sadece gercekten guclu bir
ters sinyalde erken cikis tetiklenir.

### Otomatik "firsat coin" taramasi varsayilan olarak kapali

Canli veriyle test edildiginde, sabit listenin disindaki yuksek
oynaklikli "firsat coin"ler (`FUTURES_AUTO_DISCOVER_ENABLED`) tutarli
sekilde zarar etti - yuksek 24 saatlik hareket, yuksek risk demek.
Bu yuzden varsayilan `false` yapildi. Acmak istersen
`FUTURES_DISCOVER_MIN_QUOTE_VOLUME` degerini de yukseltmen onerilir.

### Coin bazinda farkli kaldirac

`FUTURES_SYMBOL_LEVERAGE_OVERRIDES` ile belirli coinlere ozel kaldirac
tanimlayabilirsin, ornek:

```
FUTURES_SYMBOL_LEVERAGE_OVERRIDES=BTCUSDT:10,ETHUSDT:15
```

Burada belirtilmeyen tum semboller `FUTURES_LEVERAGE` (varsayilan)
degerini kullanir. Boylece stabil coinlerde daha yuksek, oynak/riskli
altcoinlerde daha dusuk kaldirac kullanabilirsin.

### Onay bekleyen mod (yari-otomatik calisma)

`FUTURES_APPROVAL_MODE_ENABLED=true` yaparsan, bot yeni bir sinyal
bulunca **otomatik acmaz** — dashboard'da "Onay Bekleyen Islemler"
bolumune bir kayit duser. Orada:

- Onerilen kaldirac ve pozisyon boyutu (%) **degistirilebilir** kutucuklar
  halinde gorunur
- **"Onayla"** dersen, (degistirdiysen) yeni degerlerle pozisyon hemen acilir
- **"Reddet"** dersen, o sinyal yok sayilir
- Hicbir sey yapmazsan, `FUTURES_APPROVAL_EXPIRY_MINUTES` (varsayilan 10
  dakika) sonra sinyal otomatik iptal olur (log'da gorursun)

Acik pozisyonlarin **kapatilmasi** (stop-loss, trailing, kar hedefi, erken
cikis) bu moddan etkilenmez — her zaman otomatik kalir, sadece **yeni
acilis** onaya bagli olur.

### Kar onayi (belirli kar yuzdesine ulasinca "satayim mi?" diye sor)

`FUTURES_PROFIT_APPROVAL_ENABLED=true` yaparsan, bir pozisyon
`FUTURES_PROFIT_APPROVAL_THRESHOLD_PERCENT` (varsayilan %5) kara
ulastiginda bot **otomatik satmaz** — dashboard'da "Kar Onayi Bekleyen
Pozisyonlar" bolumune bir kayit duser:

- **"Sat"** dersen pozisyon hemen (o anki fiyattan) kapatilir
- **"Tutmaya Devam Et"** dersen pozisyon acik kalir, basabas/trailing/
  stop-loss ile normal yonetime devam eder — bu pozisyon icin bir daha
  sorulmaz (ayni pozisyon suresince tek seferlik soru)
- Hicbir sey yapmazsan, `FUTURES_PROFIT_APPROVAL_EXPIRY_MINUTES`
  (varsayilan 30 dakika) sonra soru otomatik kapanir, pozisyon normal
  yonetime devam eder (otomatik satilmaz)

Bu ozellik, trailing stop aktifken en cok ise yarar — trailing zaten
geri cekilmelerde kari korur, kar onayi ise sana "simdi mi kilitleyeyim"
karari icin ekstra kontrol verir.

### Manuel islem (dashboard'dan elle pozisyon acma/kapama)

Panelde "Manuel Islem" bolumunden, bot sinyal beklemeden istedigin an
kendi belirledigin ayarlarla futures pozisyonu acabilirsin:

- **Sembol**, **Yon** (LONG/SHORT), **Kaldirac**, **Pozisyon %** ve
  **Stop-Loss %** alanlarini doldurup "Pozisyon Ac" dersin
- Kaldirac ve pozisyon % alanlarini bos birakirsan varsayilan/ayarlanmis
  degerler kullanilir; doldurursan **tam olarak girdigin deger** kullanilir
  (baska hicbir sabit degere düşmez)
- Her acik futures pozisyon kartinda bir **"Kapat"** butonu vardir —
  istediginde manuel olarak (kar/zararina bakmadan) hemen kapatabilirsin

Bu, `/futures-manual-open` ve `/futures-manual-close` endpoint'leri
uzerinden calisir; webhook secret gerektirmez (sadece panelin calistigi
makineden erisim varsayilir).

### Otomatik kaldirac (oynaklik + sinyal gucune gore)

`FUTURES_AUTO_LEVERAGE_ENABLED=true` (varsayilan) iken, sabit bir kaldirac
yerine bot her sinyalde kaldiraci kendisi hesaplar:

- **ATR (Average True Range)** ile o coinin son dönemdeki oynakligi
  (fiyatin yuzde kaci kadar hareket ettigi) olculur
- Oynaklik **dusukse** (ATR ≤ %1) kaldirac **artirilir** (x1.25)
- Oynaklik **yuksekse** (ATR ≥ %3, riskli) kaldirac **dusurulur** (x0.5)
- Sinyal cok guclu ise (skor ≥ 0.7 VE ADX ≥ 30) kaldirac biraz daha
  **artirilir** (x1.15)
- Sonuc her zaman `FUTURES_MIN_AUTO_LEVERAGE`/`FUTURES_MAX_AUTO_LEVERAGE`
  (varsayilan 5-30x) araliginda tutulur VE stop-loss'un likidasyon-guvenlik
  kuralini (bkz. yukarida) her zaman gecebilecek sekilde ust sinirlanir —
  yani hesaplanan kaldirac asla guvensiz bir seviyeye cikmaz

Bu deger, onay bekleyen modda "onerilen kaldirac" olarak dashboard'da
gorunur (istersen degistirebilirsin); otomatik modda ise dogrudan o
kaldiracla islem acilir. `FUTURES_SYMBOL_LEVERAGE_OVERRIDES` ile sabit bir
deger belirlediysen, otomatik hesaplama o degeri **baz alip** oradan
carpar (tamamen yok saymaz).

### Otomatik "firsat coin" taramasi

`FUTURES_ALLOWED_SYMBOLS`'teki sabit listenin disinda, bot periyodik
olarak (varsayilan 30 dakikada bir) Binance Futures'taki tum USDT
paritelerini tarar, **24 saatte en cok hareket eden** (mutlak yuzde
degisim) ve yeterli hacme (`FUTURES_DISCOVER_MIN_QUOTE_VOLUME`, varsayilan
5M USDT) sahip en fazla `FUTURES_DISCOVER_TOP_N` (varsayilan 5) coini
bulup gecici olarak izleme/trade listesine ekler. Bir coin "firsat"
listesinden dusse bile, o coinde acik pozisyon varsa kapanana kadar
takip edilmeye devam eder. `FUTURES_AUTO_DISCOVER_ENABLED=false` ile
tamamen kapatilabilir.

### Kurulum

1. https://testnet.binancefuture.com adresine git, GitHub ile giris yap.
   **Bu, Spot testnet'inden (testnet.binance.vision) ayri bir sistemdir**,
   ayri bir API key gerekir.
2. API key olustur, `.env` dosyasina ekle:

```
BINANCE_FUTURES_ENABLED=true
BINANCE_FUTURES_API_KEY=...
BINANCE_FUTURES_API_SECRET=...
FUTURES_ALLOWED_SYMBOLS=BTCUSDT
FUTURES_LEVERAGE=20
FUTURES_MARGIN_TYPE=ISOLATED
FUTURES_POSITION_SIZE_PERCENT=2
FUTURES_STOP_LOSS_PERCENT=2
FUTURES_TAKE_PROFIT_PERCENT=2
```

3. Botu yeniden baslat (`npm run dev`). Terminalde `"Futures strateji motoru
   basladi"` satirini gorunce aktif demektir. Ayni confluence stratejisini
   (13 indikator) kullanir, ama Spot'tan tamamen bagimsiz calisir.

### Pozisyon boyutu nasil hesaplanir

`FUTURES_POSITION_SIZE_PERCENT`, bakiyenin ne kadarinin **marjin** olarak
kullanilacagini belirler. Gercek pozisyon buyuklugu (notional) = marjin *
kaldirac. Ornek: bakiye 1000 USDT, `FUTURES_POSITION_SIZE_PERCENT=2` (20 USDT
marjin), `FUTURES_LEVERAGE=20` → **400 USDT'lik pozisyon** acilir (20x20).

### Likidasyon guvenlik kontrolu

Bot, her BUY'dan once tahmini likidasyon mesafesini (~100/kaldirac) hesaplar
ve stop-loss'un bunun **guvenli bir payla (yuzde 60'i) altinda** olmasini
zorunlu kilar. Ornek: 20x kaldiracta likidasyon ~%5 civarinda, bot en fazla
~%3 stop-loss'a izin verir — `FUTURES_STOP_LOSS_PERCENT` bunu asarsa BUY
reddedilir (log'da acikca gorursun).

### Pozisyonlari gorme

```powershell
Invoke-RestMethod -Uri http://localhost:3001/futures-positions
```

Giris fiyati, guncel fiyat, **likidasyon fiyati**, kaldirac ve anlik
kar/zararı gosterir.

### Hesap ozeti (toplam bakiye, kilitli marjin)

```powershell
Invoke-RestMethod -Uri http://localhost:3001/futures-account
```

Toplam bakiye, kullanilabilir bakiye, tum pozisyonlara kilitli toplam
marjin ve toplam kar/zarar doner. Dashboard'da (`/dashboard`) en ustte
otomatik gorunur.

### Kapatilan islem gecmisi (kar hedefi / stop-loss / likidasyon)

```powershell
Invoke-RestMethod -Uri http://localhost:3001/futures-history
```

Kapanan her pozisyonu, **neden kapandigi** bilgisiyle birlikte listeler:

- `TAKE_PROFIT` — kar hedefine ulasti
- `SIGNAL_FLATTEN` — confluence sinyali ters yone dondu
- `MANUAL` — `/futures-webhook` ile elle kapatildi
- `STOP_LOSS` — Binance'teki stop-loss emri kendiliginden tetiklendi
- `LIQUIDATION` — pozisyon **likide oldu** (marjin yetmedi)

Bot, kendi actigi bir pozisyonun beklenmedik sekilde (kendi kodu
cagirilmadan) kapandigini her taramada tespit edip, Binance'in emir
gecmisindeki `origType` alanina bakarak likidasyon mu yoksa normal
stop-loss mi oldugunu ayirt eder ve gecmis kaydina isler. Dashboard'da
"Kapatilan Islemler" tablosunda 15 saniyede bir gorunur; likidasyonlar
kirmizi "LIKIDASYON" rozetiyle vurgulanir.

### Manuel tetikleyici

Strateji motoru sinyal beklemeden hemen bir islem acmak/kapatmak istersen
(`FUTURES_ALLOWED_SYMBOLS`'e ekledigin herhangi bir sembolde):

```powershell
$body = @{ secret="WEBHOOK_SECRET_degeri"; symbol="SOLUSDT"; side="BUY"; stopLossPercent=2 } | ConvertTo-Json
Invoke-RestMethod -Uri http://localhost:3001/futures-webhook -Method Post -Body $body -ContentType "application/json"
```

`stopLossPercent` gonderilmezse `FUTURES_STOP_LOSS_PERCENT` kullanilir. Ayni
likidasyon-guvenlik kontrolu burada da gecerlidir — kaldiraca gore cok
yuksek bir stop-loss gonderirsen istek reddedilir.

### Kaldirac riski (mutlaka oku)

- Kaldirac ne kadar yuksekse, likidasyona o kadar az fiyat hareketi yeter:
  10x → ~%10, 20x → ~%5, 50x → ~%2, 100x → ~%1.
- Testnet'te (sahte para) risk yok, ama burada ogrenilen aliskanliklar
  gercek paraya tasinirsa cok hizli kayip yasanabilir.
- Gercek paraya gecmeden once uzun sure testnet'te izleyip stratejinin
  gercekten kazandirip kazandirmadigini gor.
- `FUTURES_MARGIN_TYPE=ISOLATED` kullan (varsayilan) — `CROSSED` yaparsan
  tum bakiyen tek bir pozisyonun likidasyon riskine girer.

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
  config.ts               # .env okur, dogrular
  types.ts                # ortak tipler (Candle, OpenPosition, SymbolFilters...)
  binanceClient.ts        # Binance Spot REST imzali istekler, emir + kline fonksiyonlari
  binanceFuturesClient.ts # Binance Futures REST imzali istekler, kaldirac/marjin/pozisyon
  indicators.ts           # EMA, SMA, RSI, MACD, Bollinger, ADX, PSAR, Supertrend, Ichimoku, VWAP, Fibonacci, FVG
  confluenceStrategy.ts   # 13 indikatorun agirlikli oyuyla BUY/SELL/null skoru
  riskManager.ts          # secret/sembol/stop-loss dogrulama (Spot), pozisyon boyutu hesabi
  futuresRiskManager.ts   # kaldiraca gore likidasyon-guvenli stop-loss kontrolu
  tradeActions.ts         # Spot BUY/SELL islem mantigi (webhook + strateji motoru ortak kullanir)
  futuresTradeActions.ts  # Futures BUY/SELL islem mantigi (canli pozisyon sorgusu uzerinden)
  strategyEngine.ts       # Spot: periyodik fiyat kontrolu + confluence/EMA stratejisi
  futuresStrategyEngine.ts # Futures: ayni confluence stratejisi, bagimsiz dongu
  positionStore.ts        # data/positions.json ile Spot acik pozisyon takibi (Futures kendi API'sinden canli okur)
  server.ts               # Express /webhook, /positions, /futures-positions, /health
  index.ts                # giris noktasi: server + Spot + Futures strateji motorlarini baslatir
data/
  positions.json          # calisirken olusur, git'e girmez (sadece Spot icin)
```
