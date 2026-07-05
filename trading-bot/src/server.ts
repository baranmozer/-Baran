import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { validateAlert, RiskRejection } from "./riskManager.js";
import { handleBuy, handleSell, log } from "./tradeActions.js";
import { getAllPositions } from "./positionStore.js";
import { getPrice } from "./binanceClient.js";
import { getFuturesPrice, getOpenPosition, getFuturesAccountSummary } from "./binanceFuturesClient.js";
import { handleFuturesBuy, handleFuturesSell } from "./futuresTradeActions.js";
import { validateFuturesAlert } from "./futuresRiskManager.js";
import { getWatchlistSignals } from "./signalScreener.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createServer() {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.get("/dashboard", (_req, res) => {
    res.sendFile(path.join(__dirname, "dashboard.html"));
  });

  app.get("/signals", async (_req, res) => {
    try {
      const signals = await getWatchlistSignals();
      res.json({ ok: true, signals });
    } catch (err) {
      log("Sinyal tarama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.get("/positions", async (_req, res) => {
    try {
      const positions = getAllPositions();
      const result = await Promise.all(
        positions.map(async (position) => {
          const currentPrice = await getPrice(position.symbol);
          const pnlPercent = ((currentPrice - position.entryPrice) / position.entryPrice) * 100;
          const pnlUsdt = (currentPrice - position.entryPrice) * position.quantity;
          return {
            symbol: position.symbol,
            quantity: position.quantity,
            entryPrice: position.entryPrice,
            currentPrice,
            pnlPercent: Number(pnlPercent.toFixed(2)),
            pnlUsdt: Number(pnlUsdt.toFixed(2)),
            createdAt: position.createdAt,
          };
        })
      );
      res.json({ ok: true, positions: result });
    } catch (err) {
      log("Pozisyon sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.get("/futures-positions", async (_req, res) => {
    try {
      if (!config.futures.enabled) {
        res.json({ ok: true, positions: [], note: "BINANCE_FUTURES_ENABLED=false" });
        return;
      }
      const results = await Promise.all(
        config.futures.allowedSymbols.map(async (symbol) => {
          const position = await getOpenPosition(symbol);
          if (!position) return null;
          const currentPrice = await getFuturesPrice(symbol);
          const pnlPercent =
            ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * Math.sign(position.positionAmt);
          return {
            symbol,
            positionAmt: position.positionAmt,
            entryPrice: position.entryPrice,
            currentPrice,
            liquidationPrice: position.liquidationPrice,
            leverage: position.leverage,
            unrealizedProfit: position.unrealizedProfit,
            pnlPercent: Number(pnlPercent.toFixed(2)),
          };
        })
      );
      res.json({ ok: true, positions: results.filter(Boolean) });
    } catch (err) {
      log("Futures pozisyon sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.get("/futures-account", async (_req, res) => {
    try {
      if (!config.futures.enabled) {
        res.json({ ok: true, account: null, note: "BINANCE_FUTURES_ENABLED=false" });
        return;
      }
      const account = await getFuturesAccountSummary();
      res.json({ ok: true, account });
    } catch (err) {
      log("Futures hesap sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
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

  // Manuel/yedek futures tetikleyici: strateji motoru sinyal beklerken,
  // istersen bunu elle bir istekle hemen tetikleyebilirsin.
  app.post("/futures-webhook", async (req, res) => {
    try {
      if (!config.futures.enabled) {
        res.status(400).json({ ok: false, error: "BINANCE_FUTURES_ENABLED=false" });
        return;
      }
      const alert = validateFuturesAlert(req.body);
      log("Manuel futures alert alindi", { symbol: alert.symbol, side: alert.side });

      const result =
        alert.side === "BUY"
          ? await handleFuturesBuy(alert.symbol, alert.stopLossPercent!)
          : await handleFuturesSell(alert.symbol);

      res.json({ ok: true, result });
    } catch (err) {
      if (err instanceof RiskRejection) {
        log("Futures alert reddedildi:", err.message);
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      log("Beklenmeyen futures hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  return app;
}
