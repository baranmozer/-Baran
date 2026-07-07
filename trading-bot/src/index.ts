import { config } from "./config.js";
import { createServer } from "./server.js";
import { startStrategyEngine } from "./strategyEngine.js";
import { startFuturesStrategyEngine } from "./futuresStrategyEngine.js";

// Ev interneti gibi kararsiz baglantilarda ara sira bir Binance istegi
// (ozellikle setInterval uzerinden tetiklenen arka plan gorevlerinde)
// yakalanmamis bir hata firlatabilir - bu normalde tum bot process'ini
// cokertip elle yeniden baslatma gerektirir. Son bir guvenlik agi olarak
// burada loglayip devam ediyoruz (asil koruma ilgili fonksiyonlardaki
// try/catch'ler, bu sadece unutulmus bir durumun botu tamamen
// durdurmasini onlemek icin).
process.on("unhandledRejection", (err) => {
  console.error(new Date().toISOString(), "Yakalanmamis hata (unhandledRejection), bot calismaya devam ediyor:", err);
});

const app = createServer();

app.listen(config.port, () => {
  console.log(`Trading bot ${config.port} portunda calisiyor (Binance base: ${config.binance.baseUrl})`);
  console.log(`Izinli semboller: ${config.allowedSymbols.join(", ") || "(tanimli degil!)"}`);
});

startStrategyEngine();
startFuturesStrategyEngine();
