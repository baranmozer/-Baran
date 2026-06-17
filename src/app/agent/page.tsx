"use client";

import { useMemo, useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { evaluateTransfer } from "@/lib/agent";
import { EmptyState } from "@/components/cards";

export default function AgentPage() {
  const { hydrated, rumors, sources, settings, toast } = useStudio();
  const [player, setPlayer] = useState("");
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  // Haberi olan oyuncular
  const players = useMemo(
    () => Array.from(new Set(rumors.map((r) => r.playerName))),
    [rumors]
  );

  const selected = player || players[0] || "";
  const verdict = useMemo(
    () => (selected ? evaluateTransfer(selected, rumors, sources) : null),
    [selected, rumors, sources]
  );

  const probColor = (p: number) =>
    p >= 60 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

  const askAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/transfer-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ player: selected, rumors, sources, settings }),
      });
      const data = await res.json();
      if (data.ok) {
        setAiText(data.analysis);
        toast("AI analizi hazır.", "success");
      } else {
        setAiText(`⚠️ ${data.message}`);
        toast("AI analizi yapılamadı.", "warning");
      }
    } catch {
      setAiText("⚠️ Sunucuya ulaşılamadı.");
      toast("Bağlantı hatası.", "error");
    } finally {
      setAiLoading(false);
    }
  };

  if (!hydrated) return <div className="page-subtitle">Yükleniyor…</div>;

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🕵️ Transfer Agent</h1>
        <div className="page-subtitle">
          Kaynakları ve spekülasyonları birlikte değerlendirip transferin
          gerçekleşme olasılığını tahmin eder.
        </div>
      </div>

      {players.length === 0 ? (
        <EmptyState icon="📭" title="Haber Yok" text="Önce birkaç transfer haberi ekle." />
      ) : (
        <>
          <div className="card mb-24" style={{ maxWidth: 420 }}>
            <label className="form-label">Oyuncu seç</label>
            <select
              className="form-select"
              value={selected}
              onChange={(e) => {
                setPlayer(e.target.value);
                setAiText("");
              }}
            >
              {players.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {verdict && (
            <div className="two-col animate-scale-in">
              {/* Sol: özet + olasılık */}
              <div>
                <div className="card mb-24">
                  <div className="card-title mb-16">📊 Değerlendirme</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div
                      style={{
                        fontSize: 48,
                        fontWeight: 800,
                        color: probColor(verdict.probability),
                        lineHeight: 1,
                      }}
                    >
                      %{verdict.probability}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700 }}>{verdict.label}</div>
                      <div className="text-muted" style={{ fontSize: 13 }}>
                        Güven: {verdict.confidence} · {verdict.signals.length} haber
                      </div>
                    </div>
                  </div>
                  <div className="stat-bar" style={{ marginTop: 16 }}>
                    <div
                      className="stat-bar-fill"
                      style={{
                        width: `${verdict.probability}%`,
                        background: probColor(verdict.probability),
                      }}
                    />
                  </div>
                  <p className="text-muted" style={{ fontSize: 13, marginTop: 14, lineHeight: 1.7 }}>
                    {verdict.summary}
                  </p>
                </div>

                <div className="card">
                  <div className="card-title mb-16">🤖 AI ile Derinleştir</div>
                  <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
                    Claude ile detaylı doğal-dil analiz (Anthropic API key gerekir).
                  </p>
                  <button className="btn btn-primary" onClick={askAI} disabled={aiLoading}>
                    {aiLoading ? "Analiz ediliyor…" : "✨ AI Analizi Yap"}
                  </button>
                  {aiText && (
                    <div
                      className="script-section"
                      style={{ marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.7 }}
                    >
                      {aiText}
                    </div>
                  )}
                </div>
              </div>

              {/* Sağ: lehte/aleyhte + sinyaller */}
              <div>
                <div className="card mb-24">
                  <div className="card-title mb-16">✅ Lehte</div>
                  {verdict.positives.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: 13 }}>Olumlu sinyal yok.</p>
                  ) : (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {verdict.positives.map((p, i) => (
                        <li key={i} style={{ fontSize: 14, color: "var(--success)" }}>● {p}</li>
                      ))}
                    </ul>
                  )}
                </div>
                <div className="card">
                  <div className="card-title mb-16">⚠️ Aleyhte</div>
                  {verdict.negatives.length === 0 ? (
                    <p className="text-muted" style={{ fontSize: 13 }}>Olumsuz sinyal yok.</p>
                  ) : (
                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: 8 }}>
                      {verdict.negatives.map((n, i) => (
                        <li key={i} style={{ fontSize: 14, color: "var(--error)" }}>● {n}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}
