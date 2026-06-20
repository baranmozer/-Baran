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
  const [logoUrl, setLogoUrl] = useState("");
  const paramApplied = useRef(false);

  const set = <K extends keyof ThumbConfig>(k: K, v: ThumbConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: v }));

  // Param ile gelen oyuncuyu/takımları otomatik doldur
  useEffect(() => {
    if (!hydrated || paramApplied.current) return;
    const pid = params.get("player");
    const from = params.get("from");
    const to = params.get("to");
    if (pid || from || to) {
      paramApplied.current = true;
      if (pid) {
        setSelectedPlayer(pid);
        autoFill(pid);
      }
      if (from || to) {
        setCfg((c) => ({
          ...c,
          fromTeam: from ?? c.fromTeam,
          toTeam: to ?? c.toTeam,
        }));
      }
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
      if (id === "spotlight") next.title = "İŞTE O İSİM";
      if (id === "poster") next.title = "TRANSFER SEZONU";
      if (id === "ribbon") { next.title = "ANLAŞMA TAMAM"; next.subtitle = "SON DAKİKA"; }
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

  // Dosyadan görsel/logo ekle (data URL → CORS sorunu yok)
  const onFileUpload =
    (which: "from" | "to" | "player") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const url = String(ev.target?.result || "");
        if (which === "to") {
          setLogoUrl(url);
          set("logoUrl", url);
          toast("Varış logosu eklendi.", "success");
        } else if (which === "from") {
          set("fromLogoUrl", url);
          toast("Çıkış logosu eklendi.", "success");
        } else {
          set("customImageSrc", url);
          toast("Futbolcu fotoğrafı eklendi.", "success");
        }
      };
      reader.readAsDataURL(file);
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Çıkış Takımı (arma)</label>
              <input
                type="text"
                className="form-input"
                list="club-list"
                value={cfg.fromTeam}
                placeholder="Marseille"
                onChange={(e) => set("fromTeam", e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Varış Takımı (arma)</label>
              <input
                type="text"
                className="form-input"
                list="club-list"
                value={cfg.toTeam}
                placeholder="Fenerbahçe"
                onChange={(e) => set("toTeam", e.target.value)}
              />
            </div>
          </div>
          <datalist id="club-list">
            {["Galatasaray","Fenerbahçe","Beşiktaş","Trabzonspor","Marseille","Napoli","Manchester United","Real Madrid","FC Barcelona","Juventus","PSG","Bayern München","Liverpool","Chelsea","Arsenal","Inter Milan","AC Milan","Borussia Dortmund","Atletico Madrid","Ajax"].map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <div className="form-group">
            <label className="form-label">Futbolcu Fotoğrafı Ekle (dosya)</label>
            <input
              type="file"
              accept="image/*"
              className="form-input"
              onChange={onFileUpload("player")}
              style={{ padding: 8 }}
            />
            <div className="form-hint">
              Arkaplanı transparan PNG tavsiye edilir. Boş bırakılırsa silüet çizilir.
              {cfg.customImageSrc ? " ✓ Fotoğraf eklendi." : ""}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Çıkış Takımı Logosu Ekle (dosya)</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={onFileUpload("from")}
                style={{ padding: 8 }}
              />
              <div className="form-hint">
                Futbolcunun ayrıldığı takımın logosu (sol arma).
                {cfg.fromLogoUrl ? " ✓ Eklendi." : ""}
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Varış Takımı Logosu Ekle (dosya)</label>
              <input
                type="file"
                accept="image/*"
                className="form-input"
                onChange={onFileUpload("to")}
                style={{ padding: 8 }}
              />
              <div className="form-hint">
                Transfer edildiği / spekülasyon yapılan takımın logosu (sağ arma).
                {cfg.logoUrl ? " ✓ Eklendi." : ""}
              </div>
            </div>
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
