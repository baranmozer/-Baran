// ── Thumbnail üretici (Canvas API) — çoklu yerleşim (layout) destekli ──
import { logoFor } from "./logos";

export const WIDTH = 1280;
export const HEIGHT = 720;

// Her şablon bir "layout" (yerleşim) seçer; layout kompozisyonu belirler.
export type ThumbLayout =
  | "classic" // metin solda, oyuncu sağda (klasik)
  | "spotlight" // ortada spot ışık, başlık üstte ortalı
  | "bottombar" // oyuncu büyük, altta koyu şeritte başlık
  | "poster" // sinematik poster, dev başlık altta
  | "split" // çapraz ikiye bölünmüş, iki arma karşı karşıya
  | "ribbon"; // TV haber bandı (son dakika şeridi + alt bant)

export interface ThumbTemplate {
  id: string;
  name: string;
  icon: string;
  layout: ThumbLayout;
  bgType: "gradient" | "split" | "solid";
  bgColors: [string, string];
  textColor: string;
  accentColor: string;
  /** true ise GS/FB temasına göre arkaplan rengi değişmez (örn. yalanlandı, karşılaştırma). */
  lockColor?: boolean;
}

export const THUMB_TEMPLATES: Record<string, ThumbTemplate> = {
  breaking: {
    id: "breaking", name: "🔥 Transfer Bombası", icon: "🔥", layout: "classic",
    bgType: "gradient", bgColors: ["#1a0000", "#ff0033"], textColor: "#ffffff", accentColor: "#FFD700",
  },
  confirmed: {
    id: "confirmed", name: "✅ Resmi Transfer", icon: "✅", layout: "bottombar",
    bgType: "gradient", bgColors: ["#001a0a", "#00e676"], textColor: "#ffffff", accentColor: "#00E676",
  },
  spotlight: {
    id: "spotlight", name: "💥 Spot Işık", icon: "💥", layout: "spotlight",
    bgType: "gradient", bgColors: ["#0a0a1a", "#3b1d6e"], textColor: "#ffffff", accentColor: "#FFD700",
  },
  poster: {
    id: "poster", name: "🎬 Sinematik Poster", icon: "🎬", layout: "poster",
    bgType: "gradient", bgColors: ["#05060a", "#1a1f2e"], textColor: "#ffffff", accentColor: "#FF0033",
  },
  vs: {
    id: "vs", name: "⚔️ Karşılaştırma / Derbi", icon: "⚔️", layout: "split",
    bgType: "split", bgColors: ["#FF1744", "#1A237E"], textColor: "#ffffff", accentColor: "#FFD700", lockColor: true,
  },
  ribbon: {
    id: "ribbon", name: "📰 Haber Bandı (TV)", icon: "📰", layout: "ribbon",
    bgType: "gradient", bgColors: ["#0a0e1a", "#16223d"], textColor: "#ffffff", accentColor: "#FF0033",
  },
  denied: {
    id: "denied", name: "❌ Yalanlandı", icon: "❌", layout: "classic",
    bgType: "gradient", bgColors: ["#1a1a2e", "#4a4a6a"], textColor: "#ffffff", accentColor: "#ff5252", lockColor: true,
  },
};

export interface ThumbConfig {
  templateId: string;
  title: string;
  subtitle: string;
  playerName: string;
  teamTheme: "GS" | "FB" | "";
  value: string;
  showStats: boolean;
  statsText: string;
  customImageSrc: string | null;
  /** Çıkış (mevcut) takım — sol arma. */
  fromTeam: string;
  /** Varış (gideceği) takım — sağ arma. */
  toTeam: string;
  /** Çıkış takımı için opsiyonel gerçek logo URL'i (kayıt defterini geçersiz kılar). */
  fromLogoUrl: string | null;
  /** Varış takımı için opsiyonel gerçek logo URL'i (kayıt defterini geçersiz kılar). */
  logoUrl: string | null;
}

export const DEFAULT_THUMB_CONFIG: ThumbConfig = {
  templateId: "breaking",
  title: "SON DAKİKA",
  subtitle: "TRANSFER HABERİ",
  playerName: "VICTOR OSIMHEN",
  teamTheme: "GS",
  value: "€75M",
  showStats: true,
  statsText: "18 GOL | 5 ASİST",
  customImageSrc: null,
  fromTeam: "Napoli",
  toTeam: "Galatasaray",
  fromLogoUrl: null,
  logoUrl: null,
};

// Telifsiz, takım renkleriyle stilize arma rozetleri
interface Crest { label: string; bg: string; ring: string; text: string }
const CLUB_PRESETS: Record<string, Crest> = {
  GALATASARAY: { label: "GS", bg: "#A0001C", ring: "#FFD700", text: "#FFD700" },
  GS: { label: "GS", bg: "#A0001C", ring: "#FFD700", text: "#FFD700" },
  "FENERBAHÇE": { label: "FB", bg: "#0A1A6B", ring: "#FFEB3B", text: "#FFEB3B" },
  FB: { label: "FB", bg: "#0A1A6B", ring: "#FFEB3B", text: "#FFEB3B" },
  "BEŞİKTAŞ": { label: "BJK", bg: "#0A0A0A", ring: "#FFFFFF", text: "#FFFFFF" },
  BJK: { label: "BJK", bg: "#0A0A0A", ring: "#FFFFFF", text: "#FFFFFF" },
  TRABZONSPOR: { label: "TS", bg: "#1B3A8B", ring: "#6E1A2D", text: "#FFFFFF" },
  TS: { label: "TS", bg: "#1B3A8B", ring: "#6E1A2D", text: "#FFFFFF" },
  MARSEILLE: { label: "OM", bg: "#2FAEE0", ring: "#ffffff", text: "#ffffff" },
  NAPOLI: { label: "NAP", bg: "#12A0D7", ring: "#ffffff", text: "#ffffff" },
  "MANCHESTER UNITED": { label: "MUN", bg: "#DA291C", ring: "#FBE122", text: "#FBE122" },
  "REAL MADRID": { label: "RMA", bg: "#FEBE10", ring: "#00529F", text: "#00529F" },
  "FC BARCELONA": { label: "BAR", bg: "#A50044", ring: "#004D98", text: "#FFED02" },
  BARCELONA: { label: "BAR", bg: "#A50044", ring: "#004D98", text: "#FFED02" },
  JUVENTUS: { label: "JUV", bg: "#000000", ring: "#ffffff", text: "#ffffff" },
  PSG: { label: "PSG", bg: "#004170", ring: "#DA291C", text: "#ffffff" },
  "PARIS SAINT-GERMAIN": { label: "PSG", bg: "#004170", ring: "#DA291C", text: "#ffffff" },
  "BAYERN MÜNCHEN": { label: "BAY", bg: "#DC052D", ring: "#0066B2", text: "#ffffff" },
  BAYERN: { label: "BAY", bg: "#DC052D", ring: "#0066B2", text: "#ffffff" },
  LIVERPOOL: { label: "LIV", bg: "#C8102E", ring: "#00B2A9", text: "#ffffff" },
  CHELSEA: { label: "CHE", bg: "#034694", ring: "#DBA111", text: "#DBA111" },
  ARSENAL: { label: "ARS", bg: "#EF0107", ring: "#063672", text: "#ffffff" },
  "INTER MILAN": { label: "INT", bg: "#010E80", ring: "#000000", text: "#ffffff" },
  "AC MILAN": { label: "ACM", bg: "#FB090B", ring: "#000000", text: "#ffffff" },
  "BORUSSIA DORTMUND": { label: "BVB", bg: "#FDE100", ring: "#000000", text: "#000000" },
  "ATLETICO MADRID": { label: "ATM", bg: "#CB3524", ring: "#272E61", text: "#ffffff" },
  AJAX: { label: "AJX", bg: "#D2122E", ring: "#ffffff", text: "#ffffff" },
};

function clubCrest(name: string): Crest {
  const key = name.toLocaleUpperCase("tr").trim();
  if (CLUB_PRESETS[key]) return CLUB_PRESETS[key];
  const label = key.split(/\s+/).map((w) => w[0]).join("").slice(0, 3) || "?";
  return { label, bg: "#1f2430", ring: "#8b8ba8", text: "#ffffff" };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

// Başlığı verilen genişliğe sığacak şekilde font boyutunu küçültür.
function fitFont(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, startSize: number, weight = 900): number {
  let size = startSize;
  while (size > 28) {
    ctx.font = `${weight} ${size}px Inter, sans-serif`;
    if (ctx.measureText(text).width <= maxWidth) break;
    size -= 4;
  }
  return size;
}

// Takım temasına göre arkaplan renk çiftini döndürür.
function bgPair(t: ThumbTemplate, teamTheme: string): [string, string] {
  if (!t.lockColor && teamTheme) {
    if (teamTheme === "GS") return ["#5e0000", "#FF1744"];
    if (teamTheme === "FB") return ["#000a2e", "#1A3A8B"];
  }
  return [...t.bgColors];
}

function nameBoxColor(teamTheme: string): string {
  if (teamTheme === "GS") return "#FFD700";
  if (teamTheme === "FB") return "#FFEB3B";
  return "#FF0000";
}

// ── Arkaplan ──
function drawBackground(ctx: CanvasRenderingContext2D, t: ThumbTemplate, teamTheme: string) {
  const colors = bgPair(t, teamTheme);
  if (t.bgType === "split") {
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(WIDTH, 0); ctx.lineTo(0, HEIGHT); ctx.fill();
    ctx.fillStyle = colors[1];
    ctx.beginPath();
    ctx.moveTo(WIDTH, 0); ctx.lineTo(WIDTH, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();
    ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, HEIGHT); ctx.lineTo(WIDTH, 0); ctx.stroke();
  } else if (t.bgType === "solid") {
    ctx.fillStyle = colors[0];
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  } else {
    const grad = ctx.createRadialGradient(WIDTH * 0.7, HEIGHT * 0.5, 0, WIDTH * 0.5, HEIGHT * 0.5, WIDTH);
    grad.addColorStop(0, colors[1]);
    grad.addColorStop(1, colors[0]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
  }
}

function drawOverlay(ctx: CanvasRenderingContext2D) {
  ctx.save();
  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT / 2, WIDTH / 2, HEIGHT / 2, WIDTH);
  vignette.addColorStop(0, "rgba(0,0,0,0)");
  vignette.addColorStop(1, "rgba(0,0,0,0.6)");
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.strokeStyle = "rgba(255,255,255,0.05)";
  ctx.lineWidth = 2;
  for (let x = 0; x < WIDTH; x += 100) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, HEIGHT); ctx.stroke(); }
  for (let y = 0; y < HEIGHT; y += 100) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(WIDTH, y); ctx.stroke(); }
  ctx.restore();
}

// Merkezi parlak spot ışık (spotlight layout)
function drawSpotlight(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string) {
  ctx.save();
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, HEIGHT * 0.75);
  g.addColorStop(0, color + "55");
  g.addColorStop(0.5, color + "22");
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.restore();
}

// ── Oyuncu görseli (konumlandırılabilir) ──
type Anchor = "left" | "center" | "right";

function drawPlaceholderSilhouette(ctx: CanvasRenderingContext2D, teamTheme: string, centerX: number, hScale = 1) {
  ctx.save();
  const baseH = 500 * hScale;
  const y = HEIGHT;
  const x = centerX - 200;
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 50;
  ctx.beginPath();
  ctx.arc(x + 150, y - baseH, 70 * hScale, 0, Math.PI * 2);
  ctx.moveTo(x + 150, y - baseH + 70 * hScale);
  ctx.bezierCurveTo(x + 300, y - baseH * 0.8, x + 350, y - baseH * 0.4, x + 350, y);
  ctx.lineTo(x - 50, y);
  ctx.bezierCurveTo(x - 50, y - baseH * 0.4, x, y - baseH * 0.8, x + 150, y - baseH + 70 * hScale);
  ctx.fill();
  let glowColor = "#FF0033";
  if (teamTheme === "GS") glowColor = "#FFD700";
  if (teamTheme === "FB") glowColor = "#FFEB3B";
  ctx.strokeStyle = glowColor; ctx.lineWidth = 5; ctx.stroke();
  ctx.restore();
}

async function drawPlayer(
  ctx: CanvasRenderingContext2D,
  src: string | null,
  teamTheme: string,
  anchor: Anchor,
  wScale: number,
  hScale: number
) {
  const centerX = anchor === "left" ? WIDTH * 0.28 : anchor === "center" ? WIDTH * 0.5 : WIDTH * 0.74;
  if (!src) {
    drawPlaceholderSilhouette(ctx, teamTheme, centerX, hScale);
    return;
  }
  try {
    const img = await loadImage(src);
    const scale = Math.min((WIDTH * wScale) / img.width, (HEIGHT * hScale) / img.height);
    const drawW = img.width * scale;
    const drawH = img.height * scale;
    const x = centerX - drawW / 2;
    const y = HEIGHT - drawH;
    ctx.save();
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowBlur = 40;
    ctx.drawImage(img, x, y, drawW, drawH);
    ctx.restore();
  } catch {
    drawPlaceholderSilhouette(ctx, teamTheme, centerX, hScale);
  }
}

// ── Tek arma (logo veya stilize rozet) ──
async function drawCrestAt(
  ctx: CanvasRenderingContext2D, club: string, cx: number, cy: number, r: number, logoOverride?: string | null
) {
  if (!club) return;
  const logo = logoOverride || logoFor(club);
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.7)";
  ctx.shadowBlur = 24;
  if (logo) {
    try {
      const img = await loadImage(logo);
      ctx.fillStyle = "#ffffff";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r - 6, 0, Math.PI * 2); ctx.clip();
      const size = (r - 6) * 2;
      ctx.drawImage(img, cx - r + 6, cy - r + 6, size, size);
      ctx.restore(); ctx.restore();
      return;
    } catch { /* stilize rozete düş */ }
  }
  const crest = clubCrest(club);
  ctx.fillStyle = crest.bg;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = Math.max(6, r * 0.1);
  ctx.strokeStyle = crest.ring;
  ctx.beginPath(); ctx.arc(cx, cy, r - r * 0.07, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = crest.text;
  ctx.font = `900 ${crest.label.length > 2 ? r * 0.62 : r * 0.8}px Inter, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(crest.label, cx, cy + r * 0.04);
  ctx.restore();
}

// Çıkış ➜ varış ikili armasını verilen merkeze çizer.
async function drawTransferBadges(
  ctx: CanvasRenderingContext2D, fromTeam: string, toTeam: string,
  fromLogoUrl: string | null, toLogoUrl: string | null,
  cx = WIDTH - 110, cy = 165, r = 72
) {
  if (!fromTeam && !toTeam) return;
  if (!fromTeam) { await drawCrestAt(ctx, toTeam, cx - r / 1.4, cy, r * 1.2, toLogoUrl); return; }
  if (!toTeam) { await drawCrestAt(ctx, fromTeam, cx - r / 1.4, cy, r * 1.2, fromLogoUrl); return; }
  const toX = cx;
  const arrowCx = toX - r - 46;
  const fromX = arrowCx - 46 - r;
  await drawCrestAt(ctx, fromTeam, fromX, cy, r, fromLogoUrl);
  ctx.save();
  ctx.fillStyle = "#ffffff";
  ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 10;
  ctx.font = "900 64px Inter, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("➜", arrowCx, cy);
  ctx.restore();
  await drawCrestAt(ctx, toTeam, toX, cy, r, toLogoUrl);
}

function drawStatsBadge(ctx: CanvasRenderingContext2D, statsText: string, value: string, x: number, y: number) {
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(x, y, 450, 60, 30); ctx.fill(); ctx.stroke();
  ctx.font = "800 28px Inter, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#00E676"; ctx.textAlign = "left";
  ctx.fillText(`💶 ${value}`, x + 25, y + 30);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(x + 180, y + 15, 2, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(statsText, x + 200, y + 30);
  ctx.restore();
}

function drawBranding(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "800 24px Inter, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("TRANSFER RADAR", WIDTH - 40, HEIGHT - 30);
  ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
  ctx.beginPath(); ctx.roundRect(WIDTH - 290, HEIGHT - 55, 40, 28, 6); ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.moveTo(WIDTH - 275, HEIGHT - 48);
  ctx.lineTo(WIDTH - 265, HEIGHT - 41);
  ctx.lineTo(WIDTH - 275, HEIGHT - 34);
  ctx.fill();
  ctx.restore();
}

// İsim rozeti (renkli kutu içinde oyuncu adı)
function drawNameBox(ctx: CanvasRenderingContext2D, name: string, x: number, y: number, teamTheme: string, fontSize = 72, align: Anchor = "left") {
  if (!name) return;
  ctx.save();
  ctx.font = `900 ${fontSize}px Inter, sans-serif`;
  const txt = name.toLocaleUpperCase("tr");
  const m = ctx.measureText(txt);
  const boxW = m.width + 40;
  const boxH = fontSize + 18;
  const boxX = align === "center" ? x - boxW / 2 : align === "right" ? x - boxW : x;
  ctx.fillStyle = nameBoxColor(teamTheme);
  ctx.beginPath(); ctx.roundRect(boxX, y, boxW, boxH, 10); ctx.fill();
  ctx.fillStyle = teamTheme === "GS" || teamTheme === "FB" ? "#000000" : "#FFFFFF";
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText(txt, boxX + 20, y + 9);
  ctx.restore();
}

// ════════════════ YERLEŞİMLER (LAYOUTS) ════════════════

// 1) Klasik — metin solda, oyuncu sağda
async function layoutClassic(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "right", 0.6, 0.9);
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  let y = 100;
  if (cfg.subtitle) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 60px Inter, sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.subtitle.toLocaleUpperCase("tr"), 80, y);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    y += 80;
  }
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; ctx.shadowBlur = 10;
    const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), 720, 104);
    ctx.font = `900 ${size}px Inter, sans-serif`;
    ctx.fillText(cfg.title.toLocaleUpperCase("tr"), 75, y); y += size + 24;
    ctx.shadowColor = "transparent"; ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
  }
  ctx.restore();
  drawNameBox(ctx, cfg.playerName, 80, y, cfg.teamTheme, 72, "left");
  await drawTransferBadges(ctx, cfg.fromTeam, cfg.toTeam, cfg.fromLogoUrl, cfg.logoUrl);
  if (cfg.showStats) drawStatsBadge(ctx, cfg.statsText, cfg.value, 80, HEIGHT - 120);
}

// 2) Spot Işık — ortada oyuncu, başlık üstte ortalı, armalar köşelerde
async function layoutSpotlight(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  drawSpotlight(ctx, WIDTH / 2, HEIGHT * 0.55, t.accentColor);
  await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "center", 0.5, 0.92);
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  let y = 40;
  if (cfg.subtitle) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 56px Inter, sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.subtitle.toLocaleUpperCase("tr"), WIDTH / 2, y);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
    y += 76;
  }
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.85)"; ctx.shadowBlur = 14;
    const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), 820, 104);
    ctx.font = `900 ${size}px Inter, sans-serif`;
    ctx.fillText(cfg.title.toLocaleUpperCase("tr"), WIDTH / 2, y); y += size + 12;
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  }
  ctx.restore();
  drawNameBox(ctx, cfg.playerName, WIDTH / 2, HEIGHT - 130, cfg.teamTheme, 64, "center");
  // armalar üst köşelere (başlıkla çakışmasın diye dar başlık)
  if (cfg.fromTeam) await drawCrestAt(ctx, cfg.fromTeam, 140, 150, 90, cfg.fromLogoUrl);
  if (cfg.toTeam) await drawCrestAt(ctx, cfg.toTeam, WIDTH - 140, 150, 90, cfg.logoUrl);
  if (cfg.showStats) drawStatsBadge(ctx, cfg.statsText, cfg.value, WIDTH / 2 - 225, HEIGHT - 56);
}

// 3) Alt Şerit — oyuncu büyük, altta koyu şeritte başlık
async function layoutBottomBar(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "right", 0.55, 1.0);
  // alt koyu gradient şerit
  ctx.save();
  const barH = 230;
  const g = ctx.createLinearGradient(0, HEIGHT - barH, 0, HEIGHT);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(0.35, "rgba(0,0,0,0.75)");
  g.addColorStop(1, "rgba(0,0,0,0.95)");
  ctx.fillStyle = g;
  ctx.fillRect(0, HEIGHT - barH, WIDTH, barH);
  // accent çizgi
  ctx.fillStyle = t.accentColor;
  ctx.fillRect(0, HEIGHT - barH, WIDTH, 8);
  ctx.restore();
  // üst sol subtitle ribbon
  if (cfg.subtitle) {
    ctx.save();
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 52px Inter, sans-serif";
    const txt = cfg.subtitle.toLocaleUpperCase("tr");
    const w = ctx.measureText(txt).width + 56;
    ctx.fillRect(60, 64, w, 76);
    ctx.fillStyle = "#000";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(txt, 88, 103);
    ctx.restore();
  }
  // başlık alt şeritte
  ctx.save();
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), 800, 86);
    ctx.font = `900 ${size}px Inter, sans-serif`;
    ctx.fillText(cfg.title.toLocaleUpperCase("tr"), 70, HEIGHT - 120);
  }
  ctx.restore();
  drawNameBox(ctx, cfg.playerName, 70, HEIGHT - 88, cfg.teamTheme, 48, "left");
  await drawTransferBadges(ctx, cfg.fromTeam, cfg.toTeam, cfg.fromLogoUrl, cfg.logoUrl);
  if (cfg.showStats && cfg.value) {
    ctx.save();
    ctx.fillStyle = "#00E676";
    ctx.font = "900 40px Inter, sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`💶 ${cfg.value}`, WIDTH - 60, HEIGHT - 100);
    ctx.fillStyle = "#fff"; ctx.font = "800 26px Inter, sans-serif";
    ctx.fillText(cfg.statsText, WIDTH - 60, HEIGHT - 60);
    ctx.restore();
  }
}

// 4) Sinematik Poster — dev watermark arma + dev başlık altta solda
async function layoutPoster(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  // watermark arma (varış) — büyük ve soluk
  if (cfg.toTeam) {
    ctx.save();
    ctx.globalAlpha = 0.16;
    await drawCrestAt(ctx, cfg.toTeam, WIDTH * 0.62, HEIGHT * 0.45, 300, cfg.logoUrl);
    ctx.restore();
  }
  await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "right", 0.52, 0.95);
  // sol dikey accent stripe
  ctx.save();
  ctx.fillStyle = t.accentColor;
  ctx.fillRect(0, 0, 22, HEIGHT);
  ctx.restore();
  // alt karartma
  ctx.save();
  const g = ctx.createLinearGradient(0, HEIGHT - 360, 0, HEIGHT);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,0.92)");
  ctx.fillStyle = g;
  ctx.fillRect(0, HEIGHT - 360, WIDTH, 360);
  ctx.restore();
  ctx.save();
  ctx.textAlign = "left";
  if (cfg.subtitle) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 52px Inter, sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.subtitle.toLocaleUpperCase("tr"), 70, HEIGHT - 240);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  }
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 12;
    const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), 820, 100);
    ctx.font = `900 ${size}px Inter, sans-serif`;
    ctx.fillText(cfg.title.toLocaleUpperCase("tr"), 66, HEIGHT - 120);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  }
  if (cfg.playerName) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 40px Inter, sans-serif"; ctx.textBaseline = "alphabetic";
    const nm = cfg.playerName.toLocaleUpperCase("tr") + (cfg.value ? `  •  ${cfg.value}` : "");
    ctx.fillText(nm, 70, HEIGHT - 60);
  }
  ctx.restore();
  await drawTransferBadges(ctx, cfg.fromTeam, cfg.toTeam, cfg.fromLogoUrl, cfg.logoUrl, WIDTH - 110, 150, 64);
}

// 5) Bölünmüş — çapraz iki renk, iki arma karşı karşıya (derbi/karşılaştırma)
async function layoutSplit(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  // arka plan zaten split çizildi. Oyuncu ortada (varsa).
  if (cfg.customImageSrc) await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "center", 0.42, 0.85);
  // büyük armalar
  await drawCrestAt(ctx, cfg.fromTeam || "GS", WIDTH * 0.2, HEIGHT * 0.46, 140, cfg.fromLogoUrl);
  await drawCrestAt(ctx, cfg.toTeam || "FB", WIDTH * 0.8, HEIGHT * 0.46, 140, cfg.logoUrl);
  // orta VS
  ctx.save();
  ctx.fillStyle = "#fff";
  ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 16;
  ctx.font = "900 120px Inter, sans-serif";
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("VS", WIDTH / 2, HEIGHT * 0.46);
  ctx.restore();
  // başlık üstte ortalı
  ctx.save();
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  let y = 44;
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.8)"; ctx.shadowBlur = 12;
    const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), 1140, 84);
    ctx.font = `900 ${size}px Inter, sans-serif`;
    ctx.fillText(cfg.title.toLocaleUpperCase("tr"), WIDTH / 2, y); y += size + 14;
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  }
  if (cfg.subtitle) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 54px Inter, sans-serif";
    ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.subtitle.toLocaleUpperCase("tr"), WIDTH / 2, y);
    ctx.shadowColor = "transparent"; ctx.shadowBlur = 0;
  }
  ctx.restore();
  // alt isimler
  if (cfg.fromTeam) {
    ctx.save(); ctx.fillStyle = "#fff"; ctx.font = "900 42px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.fromTeam.toLocaleUpperCase("tr"), WIDTH * 0.2, HEIGHT - 70);
    ctx.restore();
  }
  if (cfg.toTeam) {
    ctx.save(); ctx.fillStyle = "#fff"; ctx.font = "900 42px Inter, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.shadowColor = "rgba(0,0,0,0.7)"; ctx.shadowBlur = 8;
    ctx.fillText(cfg.toTeam.toLocaleUpperCase("tr"), WIDTH * 0.8, HEIGHT - 70);
    ctx.restore();
  }
}

// 6) Haber Bandı (TV) — üstte son dakika şeridi, altta iki katlı haber bandı
async function layoutRibbon(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  await drawPlayer(ctx, cfg.customImageSrc, cfg.teamTheme, "right", 0.56, 0.96);
  // üst kırmızı son dakika şeridi
  ctx.save();
  ctx.fillStyle = "#D50000";
  ctx.fillRect(0, 32, WIDTH, 92);
  ctx.fillStyle = "#fff";
  ctx.font = "900 52px Inter, sans-serif";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText((cfg.subtitle || "SON DAKİKA").toLocaleUpperCase("tr"), 44, 80);
  // sağda canlı noktası
  ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(WIDTH - 175, 80, 13, 0, Math.PI * 2); ctx.fill();
  ctx.font = "800 32px Inter, sans-serif";
  ctx.fillText("CANLI", WIDTH - 148, 82);
  ctx.restore();
  // alt iki katlı bant
  ctx.save();
  const mainY = HEIGHT - 200, mainH = 120;
  ctx.fillStyle = "rgba(8,12,24,0.92)";
  ctx.fillRect(0, mainY, WIDTH, mainH);
  ctx.fillStyle = t.accentColor;
  ctx.fillRect(0, mainY, 16, mainH);
  // başlık ana bantta
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  const size = fitFont(ctx, cfg.title.toLocaleUpperCase("tr"), WIDTH - 120, 72);
  ctx.font = `900 ${size}px Inter, sans-serif`;
  ctx.fillText(cfg.title.toLocaleUpperCase("tr"), 50, mainY + mainH / 2);
  // alt şerit: oyuncu adı + değer
  const subY = mainY + mainH, subH = 60;
  ctx.fillStyle = t.accentColor;
  ctx.fillRect(0, subY, WIDTH, subH);
  ctx.fillStyle = "#000";
  ctx.font = "800 32px Inter, sans-serif";
  ctx.fillText(`${cfg.playerName.toLocaleUpperCase("tr")}${cfg.value ? "  •  " + cfg.value : ""}`, 50, subY + subH / 2);
  if (cfg.showStats && cfg.statsText) {
    ctx.textAlign = "right";
    ctx.fillText(cfg.statsText, WIDTH - 40, subY + subH / 2);
  }
  ctx.restore();
  await drawTransferBadges(ctx, cfg.fromTeam, cfg.toTeam, cfg.fromLogoUrl, cfg.logoUrl, WIDTH - 120, 200, 70);
}

const LAYOUTS: Record<ThumbLayout, (ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) => Promise<void>> = {
  classic: layoutClassic,
  spotlight: layoutSpotlight,
  bottombar: layoutBottomBar,
  poster: layoutPoster,
  split: layoutSplit,
  ribbon: layoutRibbon,
};

export async function renderThumbnail(canvas: HTMLCanvasElement, cfg: ThumbConfig) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  const template = THUMB_TEMPLATES[cfg.templateId];
  if (!ctx || !template) return;
  drawBackground(ctx, template, cfg.teamTheme);
  if (template.bgType !== "split") drawOverlay(ctx);
  await LAYOUTS[template.layout](ctx, cfg, template);
  drawBranding(ctx);
}

export function downloadThumbnail(canvas: HTMLCanvasElement, filename = "thumbnail.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
