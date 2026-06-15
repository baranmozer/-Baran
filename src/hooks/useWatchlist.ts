"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "transfer-radari:watchlist";

// Takip listesi — localStorage'da saklanır (eklemem: kullanıcı favori transferleri işaretler).
export function useWatchlist() {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setIds(new Set(JSON.parse(raw) as string[]));
    } catch {
      // sessizce yok say
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(Array.from(ids)));
  }, [ids, hydrated]);

  const toggle = useCallback((id: string) => {
    setIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, toggle, has, count: ids.size, hydrated };
}
