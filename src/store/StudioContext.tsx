"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Player, Rumor, Source, Settings, Stats } from "@/lib/types";
import {
  DEFAULT_PLAYERS,
  DEFAULT_SETTINGS,
  DEFAULT_SOURCES,
  buildDefaultRumors,
} from "@/lib/seed";
import { uid } from "@/lib/utils";

const KEY = "transfer-radar:store:v4";

interface StoreState {
  rumors: Rumor[];
  players: Player[];
  sources: Source[];
  settings: Settings;
}

type ToastType = "success" | "error" | "warning" | "info";
interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

interface StoreValue extends StoreState {
  hydrated: boolean;
  getStats: () => Stats;
  getRumors: (filter?: "all" | "GS" | "FB" | "starred" | "pending") => Rumor[];
  addRumor: (r: Omit<Rumor, "id" | "createdAt" | "starred" | "videoCreated">) => void;
  deleteRumor: (id: string) => void;
  toggleStar: (id: string) => boolean;
  markVideoCreated: (id: string) => void;
  searchPlayers: (q: string) => Player[];
  getPlayer: (id: string) => Player | undefined;
  getSource: (id: string) => Source | undefined;
  addSource: (s: Omit<Source, "id" | "newsCount" | "lastDate">) => void;
  deleteSource: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exportAll: () => string;
  importAll: (json: string) => boolean;
  resetAll: () => void;
  toast: (message: string, type?: ToastType) => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function freshState(): StoreState {
  return {
    rumors: buildDefaultRumors(),
    players: DEFAULT_PLAYERS,
    sources: DEFAULT_SOURCES,
    settings: DEFAULT_SETTINGS,
  };
}

export function StudioProvider({ children }: { children: React.ReactNode }) {
  // Server ve ilk client render aynı olsun diye boş başla; hydrate sonrası doldur.
  const [state, setState] = useState<StoreState>({
    rumors: [],
    players: DEFAULT_PLAYERS,
    sources: DEFAULT_SOURCES,
    settings: DEFAULT_SETTINGS,
  });
  const [hydrated, setHydrated] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        setState({ ...freshState(), ...JSON.parse(raw) });
      } else {
        setState(freshState());
      }
    } catch {
      setState(freshState());
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, hydrated]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3000);
  }, []);

  const value = useMemo<StoreValue>(() => {
    const getRumorsSorted = () =>
      [...state.rumors].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      ...state,
      hydrated,
      toast,

      getRumors: (filter = "all") => {
        const rumors = getRumorsSorted();
        if (filter === "GS") return rumors.filter((r) => r.team === "GS");
        if (filter === "FB") return rumors.filter((r) => r.team === "FB");
        if (filter === "starred") return rumors.filter((r) => r.starred);
        if (filter === "pending") return rumors.filter((r) => !r.videoCreated);
        return rumors;
      },

      getStats: () => {
        const rumors = state.rumors;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return {
          totalRumors: rumors.length,
          todayRumors: rumors.filter((r) => new Date(r.createdAt) >= today).length,
          pendingVideos: rumors.filter((r) => !r.videoCreated).length,
          completedVideos: rumors.filter((r) => r.videoCreated).length,
          gsRumors: rumors.filter((r) => r.team === "GS").length,
          fbRumors: rumors.filter((r) => r.team === "FB").length,
          hotRumors: rumors.filter((r) => r.priority === "hot" && !r.videoCreated).length,
          starredRumors: rumors.filter((r) => r.starred).length,
        };
      },

      addRumor: (r) =>
        setState((s) => {
          const rumor: Rumor = {
            ...r,
            id: uid("r"),
            createdAt: new Date().toISOString(),
            starred: false,
            videoCreated: false,
          };
          const sources = s.sources.map((src) =>
            src.id === rumor.sourceId
              ? { ...src, newsCount: (src.newsCount || 0) + 1, lastDate: new Date().toISOString() }
              : src
          );
          return { ...s, rumors: [rumor, ...s.rumors], sources };
        }),

      deleteRumor: (id) =>
        setState((s) => ({ ...s, rumors: s.rumors.filter((r) => r.id !== id) })),

      toggleStar: (id) => {
        let result = false;
        setState((s) => ({
          ...s,
          rumors: s.rumors.map((r) => {
            if (r.id === id) {
              result = !r.starred;
              return { ...r, starred: !r.starred };
            }
            return r;
          }),
        }));
        return result;
      },

      markVideoCreated: (id) =>
        setState((s) => ({
          ...s,
          rumors: s.rumors.map((r) => (r.id === id ? { ...r, videoCreated: true } : r)),
        })),

      searchPlayers: (q) => {
        if (!q) return state.players;
        const needle = q.toLocaleLowerCase("tr");
        return state.players.filter((p) =>
          `${p.name} ${p.currentTeam} ${p.position} ${p.nationality}`
            .toLocaleLowerCase("tr")
            .includes(needle)
        );
      },

      getPlayer: (id) => state.players.find((p) => p.id === id),
      getSource: (id) => state.sources.find((s) => s.id === id),

      addSource: (src) =>
        setState((s) => ({
          ...s,
          sources: [...s.sources, { ...src, id: uid("s"), newsCount: 0, lastDate: null }],
        })),

      deleteSource: (id) =>
        setState((s) => ({ ...s, sources: s.sources.filter((x) => x.id !== id) })),

      updateSettings: (patch) =>
        setState((s) => ({ ...s, settings: { ...s.settings, ...patch } })),

      exportAll: () =>
        JSON.stringify(
          { ...state, exportDate: new Date().toISOString() },
          null,
          2
        ),

      importAll: (json) => {
        try {
          const data = JSON.parse(json);
          setState((s) => ({
            rumors: data.rumors ?? s.rumors,
            players: data.players ?? s.players,
            sources: data.sources ?? s.sources,
            settings: data.settings ?? s.settings,
          }));
          return true;
        } catch {
          return false;
        }
      },

      resetAll: () => setState(freshState()),
    };
  }, [state, hydrated, toast]);

  return (
    <StoreContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} />
    </StoreContext.Provider>
  );
}

function ToastContainer({ toasts }: { toasts: ToastItem[] }) {
  const icon: Record<ToastType, string> = {
    success: "✅",
    error: "❌",
    warning: "⚠️",
    info: "ℹ️",
  };
  return (
    <div id="toast-container" className="toast-container">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <span className="toast-icon">{icon[t.type]}</span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}

export function useStudio(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStudio StudioProvider içinde kullanılmalı");
  return ctx;
}
