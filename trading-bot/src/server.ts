import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { validateAlert, RiskRejection } from "./riskManager.js";
import { handleBuy, handleSell, log } from "./tradeActions.js";
import { getAllPositions } from "./positionStore.js";
import { getPrice } from "./binanceClient.js";
import { getFuturesPrice, getOpenPosition, getFuturesAccountSummary, getFuturesCandles } from "./binanceFuturesClient.js";
import { getTradeHistory } from "./futuresTradeHistoryStore.js";
import { handleFuturesBuy, handleFuturesShort, handleFuturesSell } from "./futuresTradeActions.js";
import { validateFuturesAlert } from "./futuresRiskManager.js";
import { getWatchlistSignals } from "./signalScreener.js";
import { computeConfluenceSignal } from "./confluenceStrategy.js";
import { calculateSupportResistance } from "./indicators.js";
import { getPendingApprovals, getPendingApproval, removePendingApproval } from "./futuresPendingApprovalStore.js";
import {
  getPendingCloseApprovals,
  getPendingCloseApproval,
  removePendingCloseApproval,
} from "./futuresPendingCloseApprovalStore.js";
import { getAllTrackedSymbols, getPositionMeta } from "./futuresStopOrderStore.js";

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

  // Dashboard'daki mum grafigi icin: OHLCV veri + confluence skoru + destek/direnc seviyeleri.
  app.get("/candles", async (req, res) => {
    try {
      const symbol = String(req.query.symbol ?? "BTCUSDT").toUpperCase();
      const interval = String(req.query.interval ?? config.futures.candleInterval);
      const limit = Math.min(300, Math.max(50, Number(req.query.limit) || 150));

      const candles = await getFuturesCandles(symbol, interval, limit);
      const highs = candles.map((c) => c.high);
      const lows = candles.map((c) => c.low);
      const closes = candles.map((c) => c.close);

      const result = computeConfluenceSignal(candles, config.futures.buyThreshold, config.futures.sellThreshold);
      const sr = calculateSupportResistance(highs, lows, closes, 50);

      res.json({
        ok: true,
        symbol,
        interval,
        candles,
        signal: result.signal,
        score: Number(result.score.toFixed(2)),
        support: sr.support,
        resistance: sr.resistance,
      });
    } catch (err) {
      log("Mum grafigi verisi hatasi:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Sunucu hatasi" });
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
      // Sadece sabit FUTURES_ALLOWED_SYMBOLS degil, firsat taramasi/onay
      // moduyla acilmis (getAllTrackedSymbols) semboller de dahil edilir.
      const symbolsToCheck = Array.from(new Set([...config.futures.allowedSymbols, ...getAllTrackedSymbols()]));
      const results = await Promise.all(
        symbolsToCheck.map(async (symbol) => {
          const position = await getOpenPosition(symbol);
          if (!position) return null;
          const currentPrice = await getFuturesPrice(symbol);
          const pnlPercent =
            ((currentPrice - position.entryPrice) / position.entryPrice) * 100 * Math.sign(position.positionAmt);
          // Binance'in positionRisk API'si testnet'te bazen guncel kaldiraci
          // dondurmuyor - pozisyonu acarken kendi kaydettigimiz gercek deger
          // varsa ona guveniyoruz, yoksa API'nin degerine dusuyoruz.
          const meta = getPositionMeta(symbol);
          return {
            symbol,
            positionAmt: position.positionAmt,
            entryPrice: position.entryPrice,
            currentPrice,
            liquidationPrice: position.liquidationPrice,
            leverage: meta?.leverage ?? position.leverage,
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

  app.get("/futures-history", (_req, res) => {
    try {
      const history = getTradeHistory(50);
      res.json({ ok: true, history });
    } catch (err) {
      log("Futures gecmis sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.get("/futures-pending", (_req, res) => {
    try {
      res.json({ ok: true, pending: getPendingApprovals() });
    } catch (err) {
      log("Onay bekleyen sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.post("/futures-approve/:id", async (req, res) => {
    try {
      const pending = getPendingApproval(req.params.id);
      if (!pending) {
        res.status(404).json({ ok: false, error: "Bulunamadi veya suresi dolmus" });
        return;
      }
      removePendingApproval(pending.id);

      const leverage = Number(req.body?.leverage) || pending.suggestedLeverage;
      const positionSizePercent = Number(req.body?.positionSizePercent) || pending.suggestedPositionSizePercent;
      const overrides = { leverage, positionSizePercent };

      const result =
        pending.direction === "LONG"
          ? await handleFuturesBuy(pending.symbol, config.futures.stopLossPercent, overrides)
          : await handleFuturesShort(pending.symbol, config.futures.stopLossPercent, overrides);

      res.json({ ok: true, result });
    } catch (err) {
      if (err instanceof RiskRejection) {
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      log("Onay isleme hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  app.post("/futures-reject/:id", (req, res) => {
    removePendingApproval(req.params.id);
    res.json({ ok: true });
  });

  app.get("/futures-pending-close", (_req, res) => {
    try {
      res.json({ ok: true, pending: getPendingCloseApprovals() });
    } catch (err) {
      log("Kar onayi sorgulama hatasi:", err);
      res.status(500).json({ ok: false, error: "Sunucu hatasi" });
    }
  });

  // Kar onayi bekleyen pozisyonu satar (kullanici "Sat" dedi).
  app.post("/futures-close-approve/:id", async (req, res) => {
    try {
      const pending = getPendingCloseApproval(req.params.id);
      if (!pending) {
        res.status(404).json({ ok: false, error: "Bulunamadi veya suresi dolmus" });
        return;
      }
      removePendingCloseApproval(pending.id);
      const result = await handleFuturesSell(pending.symbol, "PROFIT_APPROVED");
      res.json({ ok: true, result });
    } catch (err) {
      log("Kar onayi ile satis hatasi:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Sunucu hatasi" });
    }
  });

  // Kar onayi bekleyen pozisyonu tutmaya devam eder (kullanici "Tut" dedi) -
  // pozisyon normal (trailing/stop-loss) yonetimine devam eder, bir daha sorulmaz.
  app.post("/futures-close-reject/:id", (req, res) => {
    removePendingCloseApproval(req.params.id);
    res.json({ ok: true });
  });

  // Panelden elle pozisyon acma: kaldirac/pozisyon boyutu/stop-loss tamamen
  // burada girilen degerlerle acilir, hicbir sabit degere dusmez.
  app.post("/futures-manual-open", async (req, res) => {
    try {
      if (!config.futures.enabled) {
        res.status(400).json({ ok: false, error: "BINANCE_FUTURES_ENABLED=false" });
        return;
      }
      const symbol = String(req.body?.symbol ?? "").toUpperCase().trim();
      const direction = req.body?.direction;
      if (!symbol) {
        res.status(400).json({ ok: false, error: "Sembol girilmedi" });
        return;
      }
      if (direction !== "LONG" && direction !== "SHORT") {
        res.status(400).json({ ok: false, error: `Gecersiz yon: ${direction}` });
        return;
      }

      const leverage = Number(req.body?.leverage);
      const positionSizePercent = Number(req.body?.positionSizePercent);
      const stopLossPercent = Number(req.body?.stopLossPercent) || config.futures.stopLossPercent;
      const overrides = {
        leverage: Number.isFinite(leverage) && leverage > 0 ? leverage : undefined,
        positionSizePercent:
          Number.isFinite(positionSizePercent) && positionSizePercent > 0 ? positionSizePercent : undefined,
      };

      const result =
        direction === "LONG"
          ? await handleFuturesBuy(symbol, stopLossPercent, overrides)
          : await handleFuturesShort(symbol, stopLossPercent, overrides);

      res.json({ ok: true, result });
    } catch (err) {
      if (err instanceof RiskRejection) {
        res.status(400).json({ ok: false, error: err.message });
        return;
      }
      log("Manuel pozisyon acma hatasi:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Sunucu hatasi" });
    }
  });

  app.post("/futures-manual-close", async (req, res) => {
    try {
      const symbol = String(req.body?.symbol ?? "").toUpperCase().trim();
      if (!symbol) {
        res.status(400).json({ ok: false, error: "Sembol girilmedi" });
        return;
      }
      const result = await handleFuturesSell(symbol, "MANUAL");
      res.json({ ok: true, result });
    } catch (err) {
      log("Manuel pozisyon kapama hatasi:", err);
      res.status(500).json({ ok: false, error: err instanceof Error ? err.message : "Sunucu hatasi" });
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
