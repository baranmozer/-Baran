"use client";

import { useState } from "react";
import type { Transfer } from "@/lib/types";
import { STATUS_META, formatFee } from "@/lib/utils";

/**
 * Radar görselleştirmesi (kendi eklemem):
 * Her transfer, durumuna göre bir açıya ve güvenilirliğine göre merkeze olan
 * uzaklığa yerleştirilir. Merkeze yakın nokta = yüksek güvenilirlik / kesinleşmiş.
 * Dönen "tarama" çizgisi klasik radar hissi verir.
 */
export function RadarView({ transfers }: { transfers: Transfer[] }) {
  const [hover, setHover] = useState<Transfer | null>(null);
  const size = 360;
  const c = size / 2;
  const maxR = c - 30;

  // Transferleri durum gruplarına göre eşit açılara dağıt, içinde güvenilirliğe göre yarıçap.
  const points = transfers.map((t, i) => {
    const angle = (i / Math.max(transfers.length, 1)) * Math.PI * 2;
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
          merkez = kesin · dış halka = söylenti
        </span>
      </div>
      <div className="relative mx-auto" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="overflow-visible">
          {/* halkalar */}
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
          {/* eksenler */}
          <line x1={c} y1={c - maxR} x2={c} y2={c + maxR} stroke="#1e2a3a" />
          <line x1={c - maxR} y1={c} x2={c + maxR} y2={c} stroke="#1e2a3a" />

          {/* dönen tarama konisi */}
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

          {/* noktalar */}
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
              <circle
                cx={p.x}
                cy={p.y}
                r={10}
                fill={p.color}
                opacity={0.18}
              />
            </g>
          ))}
        </svg>

        {hover && (
          <div className="pointer-events-none absolute left-1/2 top-1 -translate-x-1/2 rounded-lg border border-radar-line bg-radar-bg/95 px-3 py-1.5 text-center text-xs shadow-lg">
            <div className="font-semibold text-slate-100">{hover.player}</div>
            <div className="text-slate-400">
              {hover.to.name} · {formatFee(hover.fee)} · %{hover.reliability}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
