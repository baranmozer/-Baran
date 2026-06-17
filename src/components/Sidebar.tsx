"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS: { title: string; items: { href: string; icon: string; label: string }[] }[] = [
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
      { href: "/agent", icon: "🕵️", label: "Transfer Agent" },
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
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(href) ||
        (href === "/players" && pathname.startsWith("/player"));

  // Sayfa değişince mobil menüyü kapat
  useEffect(() => setOpen(false), [pathname]);

  return (
    <>
      <button className="sidebar-toggle" onClick={() => setOpen(true)} aria-label="Menü">
        <span>☰</span>
      </button>
      <div className={`sidebar-overlay ${open ? "active" : ""}`} onClick={() => setOpen(false)} />
      <aside className={`sidebar ${open ? "open" : ""}`} id="sidebar">
      <div className="sidebar-brand">
        <div className="brand-icon">📡</div>
        <div className="brand-text">
          <span className="brand-name">Transfer Radar</span>
          <span className="brand-sub">YouTube Studio</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {SECTIONS.map((sec) => (
          <div key={sec.title}>
            <div className="nav-section-title">{sec.title}</div>
            {sec.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive(item.href) ? "active" : ""}`}
              >
                <span className="nav-icon">{item.icon}</span> {item.label}
              </Link>
            ))}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="version">Transfer Radar v1.0 • $0 Cost</div>
      </div>
      </aside>
    </>
  );
}
