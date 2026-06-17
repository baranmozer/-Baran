"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import { evaluateTransfer } from "@/lib/agent";
import { AGENT_MODES, getMode } from "@/lib/agentSkills";
import { EmptyState } from "@/components/cards";

const TEAM_NAME: Record<string, string> = {
  GS: "Galatasaray",
  FB: "Fenerbahçe",
  BJK: "Beşiktaş",
  TS: "Trabzonspor",
};

export default function AgentPage() {
  const { hydrated, rumors, sources, players, toast } = useStudio();
  const router = useRouter();
  const [modeId, setModeId] = useState("value");
  const [player, setPlayer] = useState("");
  const [team, setTeam] = useState<"GS" | "FB">("GS");
  const [web, setWeb] = useState(false);
  const [aiText, setAiText] = useState("");
  const [aiLoading, setAiLoading] = useState(false);

  const mode = getMode(modeId);
  const playerNames = useMemo(
    () => Array.from(new Set(rumors.map((r) => r.playerName))),
    [rumors]
  );
  const selectedPlayer = player || playerNames[0] || "";

  // Heuristic yalnızca oyuncu kapsamlı modlarda anlamlı
  const verdict = useMemo(
    () =>
      mode.scope === "player" && selectedPlayer
        ? evaluateTransfer(selectedPlayer, rumors, sources)
        : null,
    [mode.scope, selectedPlayer, rumors, sources]
  );

  const probColor = (p: number) =>
    p >= 60 ? "var(--success)" : p >= 40 ? "var(--warning)" : "var(--error)";

  const askAI = async () => {
    setAiLoading(true);
    setAiText("");
    try {
      const res = await fetch("/api/transfer-agent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          mode: modeId,
          player: selectedPlayer,
          team,
          web,
          rumors,
          sources,
          players,
        }),
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

  // Seçili oyuncuyu çıkış➜varış armalı thumbnail'e aktar (her kulüp için)
  const toThumbnail = () => {
    if (!selectedPlayer) return;
    const p = players.find((x) => x.name === selectedPlayer);
    const r = rumors.find((x) => x.playerName === selectedPlayer);
    const from = p?.currentTeam ?? "";
    const to = r ? TEAM_NAME[r.team] ?? r.team : "";
    const q = new URLSearchParams();
    if (p) q.set("player", p.id);
    if (from) q.set("from", from);
    if (to) q.set("to", to);
    router.push(`/thumbnail?${q.toString()}`);
  };

  if (!hydrated) return <div className="page-subtitle">Yükleniyor…</div>;

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🕵️ Transfer Agent</h1>
        <div className="page-subtitle">
          Kaynakları ve spekülasyonları değerlendirir; modlara, web aramasına ve
          araçlara sahiptir.
        </div>
      </div>

      {playerNames.length === 0 ? (
        <EmptyState icon="📭" title="Haber Yok" text="Önce birkaç transfer haberi ekle." />
      ) : (
        <>
          {/* Kontrol paneli */}
          <div className="card mb-24">
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Beceri / Mod</label>
                <select
                  className="form-select"
                  value={modeId}
                  onChange={(e) => { setModeId(e.target.value); setAiText(""); }}
                >
                  {AGENT_MODES.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>

              {mode.scope === "player" && (
                <div className="form-group">
                  <label className="form-label">Oyuncu</label>
                  <select
                    className="form-select"
                    value={selectedPlayer}
                    onChange={(e) => { setPlayer(e.target.value); setAiText(""); }}
                  >
                    {playerNames.map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              )}

              {mode.scope === "team" && (
                <div className="form-group">
                  <label className="form-label">Takım</label>
                  <select
                    className="form-select"
                    value={team}
                    onChange={(e) => { setTeam(e.target.value as "GS" | "FB"); setAiText(""); }}
                  >
                    <option value="GS">Galatasaray</option>
                    <option value="FB">Fenerbahçe</option>
                  </select>
                </div>
              )}
            </div>

            <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={web} onChange={(e) => setWeb(e.target.checked)} />
              🌐 Web'den güncel haber ara (Claude web_search — daha güncel, biraz daha maliyetli)
            </label>
          </div>

          <div className="two-col animate-scale-in">
            {/* Sol */}
            <div>
              {verdict && (
                <div className="card mb-24">
                  <div className="card-title mb-16">📊 Hızlı Değerlendirme (ücretsiz)</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: probColor(verdict.probability), lineHeight: 1 }}>
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
                    <div className="stat-bar-fill" style={{ width: `${verdict.probability}%`, background: probColor(verdict.probability) }} />
                  </div>
                  <button className="btn btn-secondary w-full" style={{ marginTop: 16 }} onClick={toThumbnail}>
                    🎨 Thumbnail'e Aktar
                  </button>
                </div>
              )}

              <div className="card">
                <div className="card-title mb-16">🤖 AI Analizi (Claude)</div>
                <p className="text-muted" style={{ fontSize: 13, marginBottom: 14 }}>
                  Mod: <b>{mode.label}</b>{web ? " · 🌐 web arama açık" : ""}. Anthropic API key gerekir.
                </p>
                <button className="btn btn-primary" onClick={askAI} disabled={aiLoading}>
                  {aiLoading ? "Analiz ediliyor…" : "✨ AI Analizi Yap"}
                </button>
                {aiText && (
                  <div className="script-section" style={{ marginTop: 16, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                    {aiText}
                  </div>
                )}
              </div>
            </div>

            {/* Sağ: lehte/aleyhte (yalnızca oyuncu modunda) */}
            <div>
              {verdict ? (
                <>
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
                </>
              ) : (
                <div className="card">
                  <div className="card-title mb-16">ℹ️ Bu mod toplu çalışır</div>
                  <p className="text-muted" style={{ fontSize: 14, lineHeight: 1.7 }}>
                    Bu beceri tek oyuncu yerine geniş kapsamı değerlendirir.
                    Soldaki <b>AI Analizi Yap</b> ile sonucu üret.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
