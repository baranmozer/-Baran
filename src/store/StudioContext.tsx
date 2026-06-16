"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Player, Rumor, Script, Settings, Source } from "@/lib/types";
import {
  DEFAULT_SETTINGS,
  SEED_PLAYERS,
  SEED_RUMORS,
  SEED_SOURCES,
} from "@/lib/seed";

const KEY = "transfer-radar:studio:v1";

interface StudioState {
  rumors: Rumor[];
  players: Player[];
  sources: Source[];
  scripts: Script[];
  settings: Settings;
}

interface StudioContextValue extends StudioState {
  hydrated: boolean;
  addRumor: (r: Rumor) => void;
  updateRumor: (id: string, patch: Partial<Rumor>) => void;
  removeRumor: (id: string) => void;
  addScript: (s: Script) => void;
  addSource: (s: Source) => void;
  removeSource: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  resetAll: () => void;
  toast: (message: string, type?: ToastType) => void;
}

type ToastType = "success" | "error" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const initialState: StudioState = {
  rumors: SEED_RUMORS,
  players: SEED_PLAYERS,
  sources: SEED_SOURCES,
  scripts: [],
  settings: DEFAULT_SETTINGS,
};

const StudioContext = createContext<StudioContextValue | null>(null);

export function StudioProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<StudioState>(initialState);
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) setState({ ...initialState, ...JSON.parse(raw) });
    } catch {
      // yok say
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const toast = useCallback((message: string, type: ToastType = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200);
  }, []);

  const value = useMemo<StudioContextValue>(
    () => ({
      ...state,
      hydrated,
      toast,
      addRumor: (r) => setState((s) => ({ ...s, rumors: [r, ...s.rumors] })),
      updateRumor: (id, patch) =>
        setState((s) => ({
          ...s,
          rumors: s.rumors.map((r) => (r.id === id ? { ...r, ...patch } : r)),
        })),
      removeRumor: (id) =>
        setState((s) => ({
          ...s,
          rumors: s.rumors.filter((r) => r.id !== id),
        })),
      addScript: (sc) =>
        setState((s) => ({ ...s, scripts: [sc, ...s.scripts] })),
      addSource: (src) =>
        setState((s) => ({ ...s, sources: [...s.sources, src] })),
      removeSource: (id) =>
        setState((s) => ({
          ...s,
          sources: s.sources.filter((x) => x.id !== id),
        })),
      updateSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),
      resetAll: () => setState(initialState),
    }),
    [state, hydrated, toast]
  );

  return (
    <StudioContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </StudioContext.Provider>
  );
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const color: Record<ToastType, string> = {
    success: "#22c55e",
    error: "#ef4444",
    info: "#22d3ee",
  };
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="animate-[fadeIn_.2s_ease] rounded-lg border bg-radar-panel px-4 py-2.5 text-sm text-slate-100 shadow-lg"
          style={{ borderColor: color[t.type] }}
        >
          <span style={{ color: color[t.type] }} className="mr-1.5">
            ●
          </span>
          {t.message}
        </div>
      ))}
    </div>
  );
}

export function useStudio(): StudioContextValue {
  const ctx = useContext(StudioContext);
  if (!ctx) throw new Error("useStudio, StudioProvider içinde kullanılmalı");
  return ctx;
}
