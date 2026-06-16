// ── Thumbnail üretici (thumbnail.js ile birebir, Canvas API) ──

export const WIDTH = 1280;
export const HEIGHT = 720;

export interface ThumbTemplate {
  id: string;
  name: string;
  icon: string;
  bgType: "gradient" | "split";
  bgColors: [string, string];
  textColor: string;
  accentColor: string;
  overlay: string;
}

export const THUMB_TEMPLATES: Record<string, ThumbTemplate> = {
  breaking: { id: "breaking", name: "🔥 Transfer Bombası", icon: "🔥", bgType: "gradient", bgColors: ["#1a0000", "#ff0033"], textColor: "#ffffff", accentColor: "#FFD700", overlay: "fire" },
  confirmed: { id: "confirmed", name: "✅ Resmi Transfer", icon: "✅", bgType: "gradient", bgColors: ["#001a0a", "#00e676"], textColor: "#ffffff", accentColor: "#ffffff", overlay: "check" },
  denied: { id: "denied", name: "❌ Yalanlandı", icon: "❌", bgType: "gradient", bgColors: ["#1a1a2e", "#4a4a6a"], textColor: "#ffffff", accentColor: "#ff5252", overlay: "cross" },
  vs: { id: "vs", name: "🆚 Karşılaştırma", icon: "⚔️", bgType: "split", bgColors: ["#FF1744", "#1A237E"], textColor: "#ffffff", accentColor: "#FFD700", overlay: "vs" },
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
};

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function drawBackground(ctx: CanvasRenderingContext2D, t: ThumbTemplate, teamTheme: string) {
  let colors: [string, string] = [...t.bgColors];
  if ((t.id === "breaking" || t.id === "confirmed") && teamTheme) {
    if (teamTheme === "GS") colors = ["#800000", "#FF1744"];
    if (teamTheme === "FB") colors = ["#000033", "#1A237E"];
  }
  if (t.bgType === "split") {
    ctx.fillStyle = colors[0];
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(WIDTH, 0); ctx.lineTo(0, HEIGHT); ctx.fill();
    ctx.fillStyle = colors[1];
    ctx.beginPath();
    ctx.moveTo(WIDTH, 0); ctx.lineTo(WIDTH, HEIGHT); ctx.lineTo(0, HEIGHT); ctx.fill();
    ctx.strokeStyle = "#FFD700"; ctx.lineWidth = 10;
    ctx.beginPath(); ctx.moveTo(0, HEIGHT); ctx.lineTo(WIDTH, 0); ctx.stroke();
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

function drawPlaceholderSilhouette(ctx: CanvasRenderingContext2D, teamTheme: string) {
  ctx.save();
  const x = WIDTH - 450;
  const y = HEIGHT;
  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.shadowColor = "rgba(0,0,0,0.9)";
  ctx.shadowBlur = 50;
  ctx.beginPath();
  ctx.arc(x + 150, y - 500, 70, 0, Math.PI * 2);
  ctx.moveTo(x + 150, y - 430);
  ctx.bezierCurveTo(x + 300, y - 400, x + 350, y - 200, x + 350, y);
  ctx.lineTo(x - 50, y);
  ctx.bezierCurveTo(x - 50, y - 200, x, y - 400, x + 150, y - 430);
  ctx.fill();
  let glowColor = "#FF0033";
  if (teamTheme === "GS") glowColor = "#FFD700";
  if (teamTheme === "FB") glowColor = "#FFEB3B";
  ctx.strokeStyle = glowColor; ctx.lineWidth = 5; ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.font = "900 48px Inter, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FUTBOLCU", x + 150, y - 200);
  ctx.restore();
}

async function drawPlayerImage(ctx: CanvasRenderingContext2D, src: string | null, teamTheme: string) {
  if (src) {
    try {
      const img = await loadImage(src);
      const scale = Math.min((WIDTH * 0.6) / img.width, (HEIGHT * 0.9) / img.height);
      const drawW = img.width * scale;
      const drawH = img.height * scale;
      const x = WIDTH - drawW - 50;
      const y = HEIGHT - drawH;
      ctx.shadowColor = "rgba(0,0,0,0.8)";
      ctx.shadowBlur = 40;
      ctx.shadowOffsetX = -10;
      ctx.drawImage(img, x, y, drawW, drawH);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetX = 0;
    } catch {
      drawPlaceholderSilhouette(ctx, teamTheme);
    }
  } else {
    drawPlaceholderSilhouette(ctx, teamTheme);
  }
}

function drawText(ctx: CanvasRenderingContext2D, cfg: ThumbConfig, t: ThumbTemplate) {
  ctx.save();
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  const paddingX = 80;
  let currentY = 120;

  if (cfg.subtitle) {
    ctx.fillStyle = t.accentColor;
    ctx.font = "800 36px Inter, sans-serif";
    ctx.fillText(cfg.subtitle.toUpperCase(), paddingX, currentY);
    currentY += 50;
  }
  if (cfg.title) {
    ctx.fillStyle = t.textColor;
    ctx.shadowColor = "rgba(0,0,0,0.8)";
    ctx.shadowOffsetX = 4; ctx.shadowOffsetY = 4; ctx.shadowBlur = 10;
    ctx.font = "900 110px Inter, sans-serif";
    ctx.fillText(cfg.title.toUpperCase(), paddingX - 5, currentY);
    currentY += 120;
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0; ctx.shadowOffsetY = 0; ctx.shadowBlur = 0;
  }
  if (cfg.playerName) {
    ctx.font = "900 72px Inter, sans-serif";
    const m = ctx.measureText(cfg.playerName.toUpperCase());
    const boxWidth = m.width + 40;
    const boxHeight = 90;
    let boxColor = "#FF0000";
    if (cfg.teamTheme === "GS") boxColor = "#FFD700";
    if (cfg.teamTheme === "FB") boxColor = "#FFEB3B";
    ctx.fillStyle = boxColor;
    ctx.beginPath();
    ctx.roundRect(paddingX, currentY, boxWidth, boxHeight, 10);
    ctx.fill();
    ctx.fillStyle = cfg.teamTheme === "GS" || cfg.teamTheme === "FB" ? "#000000" : "#FFFFFF";
    ctx.fillText(cfg.playerName.toUpperCase(), paddingX + 20, currentY + 10);
  }
  ctx.restore();
}

function drawStatsBadge(ctx: CanvasRenderingContext2D, statsText: string, value: string) {
  ctx.save();
  const startX = 80;
  const startY = HEIGHT - 120;
  ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(startX, startY, 450, 60, 30);
  ctx.fill();
  ctx.stroke();
  ctx.font = "800 28px Inter, sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#00E676";
  ctx.textAlign = "left";
  ctx.fillText(`💶 ${value}`, startX + 25, startY + 30);
  ctx.fillStyle = "rgba(255,255,255,0.3)";
  ctx.fillRect(startX + 180, startY + 15, 2, 30);
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(statsText, startX + 200, startY + 30);
  ctx.restore();
}

function drawBranding(ctx: CanvasRenderingContext2D) {
  ctx.save();
  ctx.font = "800 24px Inter, sans-serif";
  ctx.fillStyle = "rgba(255, 255, 255, 0.5)";
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("TRANSFER RADAR", WIDTH - 40, HEIGHT - 30);
  ctx.fillStyle = "rgba(255, 0, 0, 0.6)";
  ctx.beginPath();
  ctx.roundRect(WIDTH - 290, HEIGHT - 55, 40, 28, 6);
  ctx.fill();
  ctx.fillStyle = "#FFF";
  ctx.beginPath();
  ctx.moveTo(WIDTH - 275, HEIGHT - 48);
  ctx.lineTo(WIDTH - 265, HEIGHT - 41);
  ctx.lineTo(WIDTH - 275, HEIGHT - 34);
  ctx.fill();
  ctx.restore();
}

export async function renderThumbnail(canvas: HTMLCanvasElement, cfg: ThumbConfig) {
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  const template = THUMB_TEMPLATES[cfg.templateId];
  if (!ctx || !template) return;
  drawBackground(ctx, template, cfg.teamTheme);
  drawOverlay(ctx);
  await drawPlayerImage(ctx, cfg.customImageSrc, cfg.teamTheme);
  drawText(ctx, cfg, template);
  if (cfg.showStats) drawStatsBadge(ctx, cfg.statsText, cfg.value);
  drawBranding(ctx);
}

export function downloadThumbnail(canvas: HTMLCanvasElement, filename = "thumbnail.png") {
  const link = document.createElement("a");
  link.download = filename;
  link.href = canvas.toDataURL("image/png");
  link.click();
}
