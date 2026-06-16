"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import {
  THUMB_TEMPLATES,
  DEFAULT_THUMB_CONFIG,
  renderThumbnail,
  downloadThumbnail,
  type ThumbConfig,
} from "@/lib/thumbnail";

function ThumbInner() {
  const params = useSearchParams();
  const { hydrated, players, getPlayer, toast } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cfg, setCfg] = useState<ThumbConfig>(DEFAULT_THUMB_CONFIG);
  const [selectedPlayer, setSelectedPlayer] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const paramApplied = useRef(false);

  const set = <K extends keyof ThumbConfig>(k: K, v: ThumbConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  // Param ile gelen oyuncuyu otomatik doldur
  useEffect(() => {
    if (!hydrated || paramApplied.current) return;
    const pid = params.get("player");
    if (pid) {
      paramApplied.current = true;
      setSelectedPlayer(pid);
      autoFill(pid);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated]);

  // Her config değişiminde yeniden çiz
  useEffect(() => {
    if (canvasRef.current) renderThumbnail(canvasRef.current, cfg);
  }, [cfg]);

  const autoFill = (pid: string) => {
    const p = getPlayer(pid);
    if (!p) return;
    setCfg((c) => ({
      ...c,
      playerName: p.name.toLocaleUpperCase("tr"),
      value: p.marketValue,
      statsText: `${p.stats.goals} GOL | ${p.stats.assists} ASİST`,
    }));
  };

  const selectTemplate = (id: string) => {
    setCfg((c) => {
      const next = { ...c, templateId: id };
      if (id === "breaking") next.title = "SON DAKİKA";
      if (id === "confirmed") next.title = "RESMİLEŞTİ";
      if (id === "denied") next.title = "YALANLANDI";
      if (id === "vs") { next.title = "BÜYÜK KAPIŞMA"; next.teamTheme = ""; }
      return next;
    });
  };

  const download = () => {
    if (!canvasRef.current) return;
    const name = cfg.playerName.replace(/\s+/g, "-").toLocaleLowerCase("tr") || "thumbnail";
    downloadThumbnail(canvasRef.current, `transfer-radar-${name}.png`);
    toast("Thumbnail başarıyla indirildi.", "success");
  };

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">🎨 Thumbnail Oluşturucu</h1>
        <div className="page-subtitle">YouTube videoları için Canvas API ile yüksek kaliteli küçük resimler.</div>
      </div>

      <div className="two-col animate-scale-in">
        <div className="card">
          <div className="form-group">
            <label className="form-label">Şablon Seçimi</label>
            <div className="thumbnail-templates">
              {Object.values(THUMB_TEMPLATES).map((t) => (
                <div
                  key={t.id}
                  className={`thumbnail-template-option ${cfg.templateId === t.id ? "active" : ""}`}
                  onClick={() => selectTemplate(t.id)}
                >
                  <div className="template-icon">{t.icon}</div>
                  <div className="template-name">{t.name}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="section-divider" />

          <div className="form-group">
            <label className="form-label">Veri Kaynağı (Otomatik Doldur)</label>
            <select
              className="form-select"
              value={selectedPlayer}
              onChange={(e) => { setSelectedPlayer(e.target.value); if (e.target.value) autoFill(e.target.value); }}
            >
              <option value="">-- Futbolcu Seçerek Doldur --</option>
              {players.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Ana Başlık (Büyük)</label>
              <input type="text" className="form-input" value={cfg.title} onChange={(e) => set("title", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Alt Başlık (Ufak)</label>
              <input type="text" className="form-input" value={cfg.subtitle} onChange={(e) => set("subtitle", e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Futbolcu Adı</label>
              <input type="text" className="form-input" value={cfg.playerName} onChange={(e) => set("playerName", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Takım Teması</label>
              <select className="form-select" value={cfg.teamTheme} onChange={(e) => set("teamTheme", e.target.value as ThumbConfig["teamTheme"])}>
                <option value="GS">Galatasaray (Sarı-Kırmızı)</option>
                <option value="FB">Fenerbahçe (Sarı-Lacivert)</option>
                <option value="">Genel (Şablon Rengi)</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Sol Alt Değer (Piyasa Değeri)</label>
              <input type="text" className="form-input" value={cfg.value} onChange={(e) => set("value", e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Sağ Alt Metin (İstatistik)</label>
              <input type="text" className="form-input" value={cfg.statsText} onChange={(e) => set("statsText", e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Özel Fotoğraf URL (Opsiyonel)</label>
            <input
              type="text"
              className="form-input"
              value={imageUrl}
              placeholder="https://example.com/player.png"
              onChange={(e) => setImageUrl(e.target.value)}
              onBlur={() => set("customImageSrc", imageUrl || null)}
            />
            <div className="form-hint">Arkaplanı transparan PNG tavsiye edilir. Boş bırakılırsa silüet çizilir.</div>
          </div>
        </div>

        <div>
          <div className="thumbnail-preview-container">
            <div className="thumbnail-canvas-wrapper">
              <canvas ref={canvasRef} />
            </div>
            <div className="flex gap-16">
              <button className="btn btn-primary flex-1" onClick={download}><span style={{ fontSize: 18 }}>⬇️</span> PNG Olarak İndir (1280x720)</button>
              <button className="btn btn-secondary" onClick={() => canvasRef.current && renderThumbnail(canvasRef.current, cfg)}>🔄 Yenile</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default function ThumbnailPage() {
  return (
    <Suspense fallback={<div className="page-subtitle">Yükleniyor…</div>}>
      <ThumbInner />
    </Suspense>
  );
}
