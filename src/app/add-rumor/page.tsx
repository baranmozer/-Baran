"use client";

import { useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { RumorCard, EmptyState } from "@/components/cards";
import type { Priority, RumorType, Team } from "@/lib/types";

const PRIORITIES: { val: Priority; label: string }[] = [
  { val: "normal", label: "📌 Normal" },
  { val: "hot", label: "🔥 Acil Çekim" },
  { val: "low", label: "💤 Düşük" },
];

export default function AddRumorPage() {
  const { hydrated, players, sources, addRumor, getRumors, toast } = useStudio();
  const [content, setContent] = useState("");
  const [playerId, setPlayerId] = useState("");
  const [team, setTeam] = useState<Team>("GS");
  const [sourceId, setSourceId] = useState("");
  const [type, setType] = useState<RumorType>("rumor");
  const [priority, setPriority] = useState<Priority>("normal");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !playerId || !sourceId) {
      toast("Haber metni, futbolcu ve kaynak zorunlu.", "warning");
      return;
    }
    const player = players.find((p) => p.id === playerId);
    addRumor({
      content: content.trim(),
      playerId,
      playerName: player ? player.name : "Bilinmeyen",
      team,
      sourceId,
      type,
      priority,
    });
    toast("Haber başarıyla kaydedildi.", "success");
    setContent("");
    setPlayerId("");
    setType("rumor");
    setPriority("normal");
  };

  const recent = hydrated ? getRumors().slice(0, 5) : [];
  const srcOf = (id: string) => sources.find((s) => s.id === id);

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">➕ Haber Ekle</h1>
        <div className="page-subtitle">X'ten veya haber sitelerinden yeni bir iddiayı sisteme girin.</div>
      </div>

      <div className="two-col animate-scale-in">
        <div className="card">
          <form onSubmit={submit}>
            <div className="form-group">
              <label className="form-label">Transfer İddiası / Haber Metni</label>
              <textarea className="form-textarea" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Tweet veya haber metnini buraya yapıştırın..." required />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Futbolcu</label>
                <select className="form-select" value={playerId} onChange={(e) => setPlayerId(e.target.value)} required>
                  <option value="">-- Futbolcu Seç --</option>
                  {players.map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.currentTeam})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Hedef Takım</label>
                <select className="form-select" value={team} onChange={(e) => setTeam(e.target.value as Team)} required>
                  <option value="GS">Galatasaray</option>
                  <option value="FB">Fenerbahçe</option>
                  <option value="BJK">Beşiktaş</option>
                  <option value="TS">Trabzonspor</option>
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Kaynak (Muhabir)</label>
                <select className="form-select" value={sourceId} onChange={(e) => setSourceId(e.target.value)} required>
                  <option value="">-- Kaynak Seç --</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} (%{s.reliability})</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">İddia Türü</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value as RumorType)}>
                  <option value="rumor">Söylenti</option>
                  <option value="strong">Güçlü İddia</option>
                  <option value="confirmed">Kesin / KAP</option>
                  <option value="denied">Yalanlandı</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Öncelik (Video Aciliyeti)</label>
              <div className="radio-group">
                {PRIORITIES.map((p) => (
                  <div key={p.val} className={`radio-option ${priority === p.val ? "active" : ""}`} onClick={() => setPriority(p.val)}>
                    {p.label}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-24">
              <button type="submit" className="btn btn-primary w-full">Haberi Kaydet</button>
            </div>
          </form>
        </div>

        <div>
          <h3 className="card-title mb-16">Son Eklenenler</h3>
          <div>
            {recent.length === 0 ? (
              <EmptyState icon="📭" title="Haber Yok" text="Henüz haber eklenmemiş." />
            ) : (
              recent.map((r) => <RumorCard key={r.id} rumor={r} source={srcOf(r.sourceId)} />)
            )}
          </div>
        </div>
      </div>
    </>
  );
}
