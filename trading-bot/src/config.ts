import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Ortam degiskeni eksik: ${name} (.env dosyasina bak, .env.example ornektir)`);
  }
  return value;
}

export const config = {
  port: Number(process.env.PORT ?? 3001),
  webhookSecret: required("WEBHOOK_SECRET"),
  binance: {
    apiKey: required("BINANCE_API_KEY"),
    apiSecret: required("BINANCE_API_SECRET"),
    baseUrl: process.env.BINANCE_BASE_URL ?? "https://testnet.binance.vision",
  },
  allowedSymbols: (process.env.ALLOWED_SYMBOLS ?? "")
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  // Sadece izlemek (sinyal gormek) icin - islem acmaz, otomatik trade listesinden bagimsiz.
  watchlistSymbols: (
    process.env.WATCHLIST_SYMBOLS ??
    "BTCUSDT,ETHUSDT,BNBUSDT,SOLUSDT,XRPUSDT,ADAUSDT,DOGEUSDT,AVAXUSDT,DOTUSDT,LINKUSDT," +
      "LTCUSDT,TRXUSDT,ATOMUSDT,UNIUSDT,ETCUSDT,FILUSDT,APTUSDT,ARBUSDT,OPUSDT,NEARUSDT,LDOUSDT"
  )
    .split(",")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean),
  positionSizePercent: Number(process.env.POSITION_SIZE_PERCENT ?? 2),
  maxStopLossPercent: Number(process.env.MAX_STOP_LOSS_PERCENT ?? 10),
  strategy: {
    enabled: (process.env.STRATEGY_ENABLED ?? "true") === "true",
    // "confluence": tum indikatorlerin agirlikli oyu; "ema": sadece EMA kesisimi
    mode: (process.env.STRATEGY_MODE ?? "confluence") as "confluence" | "ema",
    candleInterval: process.env.STRATEGY_CANDLE_INTERVAL ?? "15m",
    pollIntervalSeconds: Number(process.env.STRATEGY_POLL_SECONDS ?? 60),
    emaFastPeriod: Number(process.env.STRATEGY_EMA_FAST ?? 9),
    emaSlowPeriod: Number(process.env.STRATEGY_EMA_SLOW ?? 21),
    candleLookback: Number(process.env.STRATEGY_CANDLE_LOOKBACK ?? 100),
    buyThreshold: Number(process.env.STRATEGY_BUY_THRESHOLD ?? 0.4),
    sellThreshold: Number(process.env.STRATEGY_SELL_THRESHOLD ?? -0.4),
    stopLossPercent: Number(process.env.STRATEGY_STOP_LOSS_PERCENT ?? 2),
    takeProfitPercent: Number(process.env.STRATEGY_TAKE_PROFIT_PERCENT ?? 2),
  },
  futures: {
    enabled: (process.env.BINANCE_FUTURES_ENABLED ?? "false") === "true",
    apiKey: process.env.BINANCE_FUTURES_API_KEY ?? "",
    apiSecret: process.env.BINANCE_FUTURES_API_SECRET ?? "",
    baseUrl: process.env.BINANCE_FUTURES_BASE_URL ?? "https://testnet.binancefuture.com",
    allowedSymbols: (process.env.FUTURES_ALLOWED_SYMBOLS ?? "")
      .split(",")
      .map((s) => s.trim().toUpperCase())
      .filter(Boolean),
    leverage: Number(process.env.FUTURES_LEVERAGE ?? 20),
    marginType: (process.env.FUTURES_MARGIN_TYPE ?? "ISOLATED") as "ISOLATED" | "CROSSED",
    // Bakiyenin yuzde kaci MARJIN olarak kullanilsin (notional = marjin * kaldirac)
    positionSizePercent: Number(process.env.FUTURES_POSITION_SIZE_PERCENT ?? 2),
    stopLossPercent: Number(process.env.FUTURES_STOP_LOSS_PERCENT ?? 2),
    takeProfitPercent: Number(process.env.FUTURES_TAKE_PROFIT_PERCENT ?? 2),
    candleInterval: process.env.FUTURES_CANDLE_INTERVAL ?? "15m",
    candleLookback: Number(process.env.FUTURES_CANDLE_LOOKBACK ?? 100),
    buyThreshold: Number(process.env.FUTURES_BUY_THRESHOLD ?? 0.4),
    sellThreshold: Number(process.env.FUTURES_SELL_THRESHOLD ?? -0.4),
    pollIntervalSeconds: Number(process.env.FUTURES_POLL_SECONDS ?? 60),
    // Sabit listenin disinda, hacmi/hareketi yuksek "firsat" coin'lerini
    // otomatik bulup gecici olarak izleme/trade listesine ekler. Varsayilan
    // kapali: bu coinler yuksek oynaklikli oldugu icin stop-loss'a carpma
    // orani/zarari daha yuksek cikiyor (canli veriyle dogrulandi).
    autoDiscoverEnabled: (process.env.FUTURES_AUTO_DISCOVER_ENABLED ?? "false") === "true",
    discoverTopN: Number(process.env.FUTURES_DISCOVER_TOP_N ?? 5),
    discoverMinQuoteVolume: Number(process.env.FUTURES_DISCOVER_MIN_QUOTE_VOLUME ?? 5000000),
    discoverIntervalMinutes: Number(process.env.FUTURES_DISCOVER_INTERVAL_MINUTES ?? 30),

    // Basabas: fiyat lehte bu yuzde kadar hareket edince stop-loss giris fiyatina cekilir.
    breakevenEnabled: (process.env.FUTURES_BREAKEVEN_ENABLED ?? "true") === "true",
    breakevenTriggerPercent: Number(process.env.FUTURES_BREAKEVEN_TRIGGER_PERCENT ?? 1),

    // Trailing stop: aktiflesince sabit kar hedefi yerine, en iyi fiyatin
    // gerisinden stop-loss'u takip eder. Aktifken checkTakeProfit devre disi kalir.
    trailingEnabled: (process.env.FUTURES_TRAILING_ENABLED ?? "true") === "true",
    trailingActivationPercent: Number(process.env.FUTURES_TRAILING_ACTIVATION_PERCENT ?? 2),
    trailingDistancePercent: Number(process.env.FUTURES_TRAILING_DISTANCE_PERCENT ?? 1),

    // Yeni islem acmadan once ADX bu esigin altindaysa (yatay/kararsiz piyasa) islem acilmaz.
    minAdxForEntry: Number(process.env.FUTURES_MIN_ADX_FOR_ENTRY ?? 20),

    // Portfoy risk sinirlari
    dailyMaxLossPercent: Number(process.env.FUTURES_DAILY_MAX_LOSS_PERCENT ?? 5),
    maxConcurrentPositions: Number(process.env.FUTURES_MAX_CONCURRENT_POSITIONS ?? 8),

    // Altcoinler buyuk olcude BTC ile korele hareket eder - acik pozisyonlarin
    // hepsi ayni yonde (hep LONG ya da hep SHORT) olursa, tek bir piyasa
    // hareketi hepsini ayni anda vurabilir. Acik pozisyonlarin en fazla bu
    // yuzdesi ayni yonde olabilir (100 = sinirsiz, eski davranis).
    maxSameDirectionPercent: Number(process.env.FUTURES_MAX_SAME_DIRECTION_PERCENT ?? 60),

    // Bir pozisyon kapandiktan sonra ayni sembole hemen tekrar girmesini
    // engeller (whipsaw/dalgali piyasada kapan-ac-kapan-ac dongusunu ve
    // gereksiz islem ucretini onlemek icin). 0 = cooldown yok.
    reentryCooldownMinutes: Number(process.env.FUTURES_REENTRY_COOLDOWN_MINUTES ?? 15),

    // Acik olunca, pozisyon kar yuzdesi esigine ulasinca bot otomatik
    // satmaz - dashboard'da "satayim mi satmayim mi" diye onay bekleyen
    // kayit olusturur. Cevaplanmazsa suresi dolunca pozisyon normal
    // (trailing/stop-loss) yonetimine devam eder, otomatik satilmaz.
    profitApprovalEnabled: (process.env.FUTURES_PROFIT_APPROVAL_ENABLED ?? "false") === "true",
    profitApprovalThresholdPercent: Number(process.env.FUTURES_PROFIT_APPROVAL_THRESHOLD_PERCENT ?? 5),
    profitApprovalExpiryMinutes: Number(process.env.FUTURES_PROFIT_APPROVAL_EXPIRY_MINUTES ?? 30),

    // Coin bazinda farkli kaldirac: "BTCUSDT:10,ETHUSDT:15" gibi, belirtilmeyen
    // semboller FUTURES_LEVERAGE (varsayilan) kaldiracini kullanir.
    symbolLeverageOverrides: Object.fromEntries(
      (process.env.FUTURES_SYMBOL_LEVERAGE_OVERRIDES ?? "")
        .split(",")
        .map((pair) => pair.trim())
        .filter(Boolean)
        .map((pair) => {
          const [symbol, leverage] = pair.split(":");
          return [symbol.trim().toUpperCase(), Number(leverage)];
        })
    ) as Record<string, number>,

    // Onay bekleyen mod: acik olunca, yeni sinyal geldiginde bot otomatik
    // acmaz - dashboard'da onay bekleyen bir kayit olusturur, sen onaylarsan
    // (istersen kaldirac/pozisyon boyutunu degistirerek) acilir.
    approvalModeEnabled: (process.env.FUTURES_APPROVAL_MODE_ENABLED ?? "false") === "true",
    approvalExpiryMinutes: Number(process.env.FUTURES_APPROVAL_EXPIRY_MINUTES ?? 10),

    // Otomatik kaldirac: sabit deger yerine, oynaklik (ATR%) ve sinyal
    // gucune (skor + ADX) gore bot kendisi kaldiraci hesaplar. Dusuk
    // oynaklikta/guclu sinyalde kaldiraci artirir, yuksek oynaklikta dusurur.
    autoLeverageEnabled: (process.env.FUTURES_AUTO_LEVERAGE_ENABLED ?? "true") === "true",
    minAutoLeverage: Number(process.env.FUTURES_MIN_AUTO_LEVERAGE ?? 5),
    maxAutoLeverage: Number(process.env.FUTURES_MAX_AUTO_LEVERAGE ?? 30),
  },
};

export function getLeverageForSymbol(symbol: string): number {
  return config.futures.symbolLeverageOverrides[symbol] ?? config.futures.leverage;
}

if (config.futures.enabled && (!config.futures.apiKey || !config.futures.apiSecret)) {
  throw new Error(
    "BINANCE_FUTURES_ENABLED=true ama BINANCE_FUTURES_API_KEY / BINANCE_FUTURES_API_SECRET eksik"
  );
}
