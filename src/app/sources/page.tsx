"use client";

import { useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { SourceCard } from "@/components/cards";
import type { Source } from "@/lib/types";

export default function SourcesPage() {
  const { sources, addSource, toast } = useStudio();
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [team, setTeam] = useState<Source["team"]>("GS");
  const [reliability, setReliability] = useState(70);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !handle.trim()) {
      toast("Ad ve X handle zorunlu.", "warning");
      return;
    }
    const avatar = name.trim().split(" ").map((n) => n[0]).join("").substring(0, 2).toLocaleUpperCase("tr");
    addSource({ name: name.trim(), handle: handle.trim(), team, reliability: Number(reliability), avatar });
    toast("Kaynak eklendi.", "success");
    setName("");
    setHandle("");
    setReliability(70);
  };

  const gs = sources.filter((s) => s.team === "GS");
  const fb = sources.filter((s) => s.team === "FB");
  const genel = sources.filter((s) => s.team === "Genel");

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">📋 Kaynaklar & Muhabirler</h1>
        <div className="page-subtitle">Takip edilen X hesapları ve güvenilirlik puanları.</div>
      </div>

      <div className="two-col animate-scale-in">
        <div>
          <h3 className="card-title mb-16">Galatasaray Muhabirleri</h3>
          <div className="flex-col gap-16 mb-32">
            {gs.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
          <h3 className="card-title mb-16">Fenerbahçe Muhabirleri</h3>
          <div className="flex-col gap-16">
            {fb.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>
        </div>

        <div>
          <h3 className="card-title mb-16">Genel Muhabirler (Yabancı)</h3>
          <div className="flex-col gap-16 mb-32">
            {genel.map((s) => <SourceCard key={s.id} source={s} />)}
          </div>

          <div className="card">
            <h3 className="card-title mb-16">➕ Yeni Kaynak Ekle</h3>
            <form onSubmit={submit}>
              <div className="form-group">
                <label className="form-label">Ad Soyad</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">X Handle (@)</label>
                  <input type="text" className="form-input" value={handle} onChange={(e) => setHandle(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Takım Alanı</label>
                  <select className="form-select" value={team} onChange={(e) => setTeam(e.target.value as Source["team"])} required>
                    <option value="GS">Galatasaray</option>
                    <option value="FB">Fenerbahçe</option>
                    <option value="Genel">Genel/Yabancı</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Güvenilirlik Puanı (0-100)</label>
                <input type="number" className="form-input" min={0} max={100} value={reliability} onChange={(e) => setReliability(Number(e.target.value))} required />
              </div>
              <button type="submit" className="btn btn-primary w-full mt-16">Kaynağı Ekle</button>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
