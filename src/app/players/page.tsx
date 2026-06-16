"use client";

import { useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { PlayerCard, EmptyState } from "@/components/cards";

export default function PlayersPage() {
  const { searchPlayers } = useStudio();
  const [query, setQuery] = useState("");
  const players = searchPlayers(query);

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">👤 Futbolcu Veritabanı</h1>
        <div className="page-subtitle">İstatistikler, performans verileri ve videoya hazır analiz kartları.</div>
      </div>

      <div className="search-bar animate-scale-in">
        <span className="search-icon">🔍</span>
        <input
          type="text"
          className="form-input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="İsim, takım veya mevki ile futbolcu ara..."
        />
      </div>

      {players.length === 0 ? (
        <EmptyState icon="🕵️‍♂️" title="Futbolcu Bulunamadı" text="Bu isimle eşleşen futbolcu veritabanında yok." />
      ) : (
        <div className="player-grid">
          {players.map((p) => (
            <PlayerCard key={p.id} player={p} />
          ))}
        </div>
      )}
    </>
  );
}
