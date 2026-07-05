import express from "express";
import { validateAlert, RiskRejection } from "./riskManager.js";
import { handleBuy, handleSell, log } from "./tradeActions.js";

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  // Manuel/yedek tetikleyici: strateji motoru otomatik calisirken, istersen
  // bunu elle bir istekle (TradingView alert'i, curl vb.) de tetikleyebilirsin.
  app.post("/webhook", async (req, res) => {
    try {
      const alert = validateAlert(req.body);
      log("Manuel alert alindi", { symbol: alert.symbol, side: alert.side });

      const result =
        alert.side === "BUY"
          ? await handleBuy(alert.symbol, alert.stopLossPercent!)
          : await handleSell(alert.symbol);

      res.json({ ok: true, result });
    } catch (err) {
      if (err instanceof RiskRejection) {
        log("Alert reddedildi:", err.message);
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      log("Beklenmeyen hata:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  return app;
}
