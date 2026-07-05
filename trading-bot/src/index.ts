import { config } from "./config.js";
import { createServer } from "./server.js";

const app = createServer();

app.listen(config.port, () => {
  console.log(`Trading bot ${config.port} portunda calisiyor (Binance base: ${config.binance.baseUrl})`);
  console.log(`Izinli semboller: ${config.allowedSymbols.join(", ") || "(tanimli degil!)"}`);
});
