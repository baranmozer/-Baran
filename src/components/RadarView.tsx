"use client";

import { useState } from "react";
import type { Rumor } from "@/lib/types";
import { STATUS_META, formatFee } from "@/lib/utils";

/**
 * Radar görselleştirmesi (kendi eklentim):
 * Her haber, güvenilirliğine göre merkeze olan uzaklıkla yerleştirilir.
 * Merkeze yakın = kesinleşmiş; dış halka = söylenti. Dönen tarama çizgisi
 * klasik radar hissi verir. Kanalın "radar" temasıyla birebir uyumlu.
 */
export function RadarView({ rumors }: { rumors: Rumor[] }) {
  const [hover, setHover] = useState<Rumor | null>(null);
  const size = 320;
  const c = size / 2;
  const maxR = c - 28;

  const points = rumors.map((t, i) => {
    const angle = (i / Math.max(rumors.length, 1)) * Math.PI * 2;
    const r = maxR * (1 - t.reliability / 100) * 0.92 + 6;
    return {
      t,
      x: c + r * Math.cos(angle - Math.PI / 2),
      y: c + r * Math.sin(angle - Math.PI / 2),
      color: STATUS_META[t.status].color,
    };
  });

  const rings = [0.33, 0.66, 1];

  return (
    <div className="rounded-xl border border-radar-line bg-radar-panel p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-200">📡 Radar</h2>
        <span className="text-xs text-slate-500">
          merkez = kesin · dış = söylenti
        </span>
      </div>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {rings.map((rr, idx) => (
            <circle
              key={idx}
              cx={c}
              cy={c}
              r={maxR * rr}
              fill="none"
              stroke="#1e2a3a"
              strokeWidth={1}
            />
          ))}
          <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke="#1e2a3a" />
          <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke="#1e2a3a" />

          <g
            className="origin-center animate-sweep"
            style={{ transformBox: "fill-box" } as React.CSSProperties}
          >
            <defs>
              <linearGradient id="sweep" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d={`M ${c} ${c} L ${c} ${c - maxR} A ${maxR} ${maxR} 0 0 1 ${
                c + maxR * Math.sin(0.6)
              } ${c - maxR * Math.cos(0.6)} Z`}
              fill="url(#sweep)"
            />
          </g>

          {points.map((p) => (
            <g
              key={p.t.id}
              onMouseEnter={() => setHover(p.t)}
              onMouseLeave={() => setHover(null)}
              className="cursor-pointer"
            >
              <circle
                cx={p.x}
                cy={p.y}
                r={hover?.id === p.t.id ? 7 : 5}
                fill={p.color}
                className="transition-all"
              />
              <circle cx={p.x} cy={p.y} r={10} fill={p.color} opacity={0.18} />
            </g>
          ))}
        </svg>

        {hover && (
          <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-lg border border-radar-line bg-radar-bg/95 px-3 py-1.5 text-center text-xs shadow-lg">
            <div className="font-semibold text-slate-100">{hover.player}</div>
            <div className="text-slate-400">
              {hover.toClub} · {formatFee(hover.fee)} · %{hover.reliability}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
