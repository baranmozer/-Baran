"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavItem {
  href: string;
  icon: string;
  label: string;
}

const SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: "İçerik Üretimi",
    items: [
      { href: "/", icon: "🎬", label: "İçerik Merkezi" },
      { href: "/add-rumor", icon: "📰", label: "Haber Ekle" },
      { href: "/players", icon: "👤", label: "Futbolcu Ara" },
    ],
  },
  {
    title: "Video Araçları",
    items: [
      { href: "/script", icon: "📝", label: "Senaryo Yaz" },
      { href: "/thumbnail", icon: "🎨", label: "Thumbnail Yap" },
    ],
  },
  {
    title: "Sistem",
    items: [
      { href: "/sources", icon: "📋", label: "Kaynaklar" },
      { href: "/settings", icon: "⚙️", label: "Ayarlar" },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-radar-line bg-radar-panel">
      <div className="flex items-center gap-3 border-b border-radar-line px-5 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-radar-glow font-extrabold text-radar-bg">
          TR
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-bold text-slate-100">Transfer Radar</span>
          <span className="text-xs text-slate-500">YouTube Studio</span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {SECTIONS.map((sec) => (
          <div key={sec.title} className="mb-5">
            <div className="px-2 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              {sec.title}
            </div>
            {sec.items.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-radar-glow/15 font-medium text-radar-glow"
                      : "text-slate-300 hover:bg-radar-line/50 hover:text-slate-100"
                  }`}
                >
                  <span className="text-base">{item.icon}</span>
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-radar-line px-5 py-3 text-[11px] text-slate-600">
        Transfer Radar v1.0 • $0 Cost
      </div>
    </aside>
  );
}
