"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import {
  generateScript,
  generateDailyRoundup,
  getTemplateList,
  exportAsText,
  type GeneratedScript,
} from "@/lib/scriptGenerator";
import { evaluateTransfer } from "@/lib/agent";

function ScriptInner() {
  const params = useSearchParams();
  const { hydrated, getRumors, getPlayer, getSource, markVideoCreated, players, sources, toast } = useStudio();

  const templates = getTemplateList();
  const pendingRumors = hydrated ? getRumors("pending") : [];

  const paramRumor = params.get("rumor") ?? "";
  const paramPlayer = params.get("player") ?? "";

  const [templateId, setTemplateId] = useState("transfer-bomb");
  const [rumorId, setRumorId] = useState("");
  const [script, setScript] = useState<GeneratedScript | null>(null);
  const generatedRumorId = useRef<string | null>(null);
  const autoTried = useRef(false);

  // Param ile gelen haberi seç
  useEffect(() => {
    if (!hydrated || autoTried.current) return;
    if (paramRumor) setRumorId(paramRumor);
    else if (paramPlayer) {
      const match = pendingRumors.find((r) => r.playerId === paramPlayer);
      if (match) setRumorId(match.id);
    }
  }, [hydrated, paramRumor, paramPlayer, pendingRumors]);

  const isDaily = templateId === "daily-roundup";

  const generate = useMemo(
    () => () => {
      if (isDaily) {
        setScript(generateDailyRoundup(getRumors(), players, sources));
        generatedRumorId.current = null;
        toast("Senaryo başarıyla üretildi.", "success");
        return;
      }
      if (!rumorId) {
        toast("Lütfen bir transfer haberi seçin.", "warning");
        return;
      }
      const rumor = getRumors().find((r) => r.id === rumorId);
      if (!rumor) return;
      const prob = evaluateTransfer(rumor.playerName, getRumors(), sources).probability;
      const result = generateScript(
        templateId,
        rumor,
        getPlayer(rumor.playerId),
        getSource(rumor.sourceId),
        prob
      );
      if (result) {
        setScript(result);
        generatedRumorId.current = rumorId;
        toast("Senaryo başarıyla üretildi.", "success");
      }
    },
    [isDaily, rumorId, templateId, getRumors, getPlayer, getSource, players, sources, toast]
  );

  // Param ile gelindiyse otomatik üret
  useEffect(() => {
    if (!hydrated || autoTried.current) return;
    if ((paramRumor || paramPlayer) && rumorId) {
      autoTried.current = true;
      const t = setTimeout(generate, 50);
      return () => clearTimeout(t);
    }
  }, [hydrated, paramRumor, paramPlayer, rumorId, generate]);

  const copyScript = () => {
    if (!script) return;
    navigator.clipboard.writeText(exportAsText(script)).then(() => {
      toast("Senaryo panoya kopyalandı.", "success");
      if (generatedRumorId.current) markVideoCreated(generatedRumorId.current);
    });
  };

  const downloadScript = () => {
    if (!script) return;
    const blob = new Blob([exportAsText(script)], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `senaryo-${script.playerName.replace(/\s+/g, "-").toLocaleLowerCase("tr")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    if (generatedRumorId.current) markVideoCreated(generatedRumorId.current);
  };

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">📝 Senaryo Motoru</h1>
        <div className="page-subtitle">Haber ve verileri birleştirerek saniyeler içinde YouTube video senaryosu oluştur.</div>
      </div>

      <div className="two-col animate-scale-in">
        <div className="card">
          <div className="form-group">
            <label className="form-label">Video Şablonu</label>
            <select className="form-select" value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.icon} {t.name} ({t.estimatedDuration})</option>
              ))}
            </select>
          </div>

          {!isDaily && (
            <div className="form-group">
              <label className="form-label">Hangi Transfer Haberi?</label>
              <select className="form-select" value={rumorId} onChange={(e) => setRumorId(e.target.value)}>
                <option value="">-- Haber Seç --</option>
                {pendingRumors.map((r) => (
                  <option key={r.id} value={r.id}>{r.playerName} ➡️ {r.team}</option>
                ))}
              </select>
              <div className="form-hint">Sadece videosu çekilmemiş (bekleyen) haberler listelenir.</div>
            </div>
          )}

          <div className="mt-24">
            <button className="btn btn-primary w-full" onClick={generate}>✨ Senaryoyu Üret</button>
          </div>
        </div>

        {script && (
          <div className="script-editor">
            <div className="script-toolbar">
              <button className="btn btn-ghost btn-sm" onClick={copyScript}><span style={{ fontSize: 16 }}>📋</span> Kopyala</button>
              <button className="btn btn-ghost btn-sm" onClick={downloadScript}><span style={{ fontSize: 16 }}>⬇️</span> İndir</button>
              <span className="text-muted" style={{ fontSize: 12, marginLeft: "auto" }}>
                ⏱️ ~{script.estimatedDuration} | 📝 {script.totalWords} kelime
              </span>
            </div>
            <div className="script-content">
              {script.sections.map((s) => (
                <div key={s.id} className="script-section">
                  <div className="section-time">[{s.time}]</div>
                  <div className="section-title">{s.title}</div>
                  <div className="section-text">{s.text}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function ScriptPage() {
  return (
    <Suspense fallback={<div className="page-subtitle">Yükleniyor…</div>}>
      <ScriptInner />
    </Suspense>
  );
}
