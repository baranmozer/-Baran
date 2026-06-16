"use client";

import { useEffect, useRef, useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Field, Input, Select, Button } from "@/components/ui";

const THEMES = [
  { id: "bomba", label: "Bomba (kırmızı)", from: "#7f1d1d", to: "#dc2626", accent: "#fde047" },
  { id: "radar", label: "Radar (camgöbeği)", from: "#0a0e14", to: "#0e7490", accent: "#22d3ee" },
  { id: "official", label: "Resmi (yeşil)", from: "#064e3b", to: "#16a34a", accent: "#bbf7d0" },
  { id: "dark", label: "Gece", from: "#0f172a", to: "#1e293b", accent: "#f8fafc" },
];

export default function ThumbnailPage() {
  const { rumors, updateRumor, toast } = useStudio();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [badge, setBadge] = useState("SON DAKİKA");
  const [headline, setHeadline] = useState("BOMBA TRANSFER!");
  const [player, setPlayer] = useState("OSIMHEN");
  const [club, setClub] = useState("GALATASARAY");
  const [theme, setTheme] = useState(THEMES[0]);
  const [linkRumor, setLinkRumor] = useState("");

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = 1280;
    const H = 720;

    // arka plan degrade
    const grad = ctx.createLinearGradient(0, 0, W, H);
    grad.addColorStop(0, theme.from);
    grad.addColorStop(1, theme.to);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, H);

    // kullanıcı görseli (varsa) sağ tarafa
    if (imgRef.current) {
      const img = imgRef.current;
      const iw = W * 0.45;
      const ih = H;
      const ratio = Math.max(iw / img.width, ih / img.height);
      const dw = img.width * ratio;
      const dh = img.height * ratio;
      ctx.drawImage(img, W - dw, H - dh + 40, dw, dh);
      // sol tarafı okunur kılmak için degrade maske
      const mask = ctx.createLinearGradient(0, 0, W, 0);
      mask.addColorStop(0, theme.from);
      mask.addColorStop(0.6, `${theme.from}cc`);
      mask.addColorStop(1, "transparent");
      ctx.fillStyle = mask;
      ctx.fillRect(0, 0, W, H);
    }

    // radar köşe süsü
    ctx.strokeStyle = `${theme.accent}55`;
    for (let r = 80; r < 360; r += 90) {
      ctx.beginPath();
      ctx.arc(80, H - 70, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // rozet
    ctx.fillStyle = theme.accent;
    ctx.fillRect(70, 70, ctx.measureText(badge).width + 240, 64);
    ctx.font = "bold 44px Inter, Arial";
    ctx.fillStyle = "#0a0e14";
    ctx.textBaseline = "middle";
    ctx.fillText(`⚡ ${badge}`, 92, 104);

    // başlık (kelimeleri sar)
    ctx.fillStyle = "#ffffff";
    ctx.font = "900 92px Inter, Arial";
    ctx.shadowColor = "rgba(0,0,0,0.6)";
    ctx.shadowBlur = 12;
    wrapText(ctx, headline.toUpperCase(), 70, 240, W * 0.6, 92);
    ctx.shadowBlur = 0;

    // oyuncu + kulüp şeridi
    ctx.fillStyle = theme.accent;
    ctx.font = "bold 70px Inter, Arial";
    ctx.fillText(player.toUpperCase(), 70, H - 150);
    ctx.fillStyle = "#ffffff";
    ctx.font = "600 40px Inter, Arial";
    ctx.fillText(`➜ ${club.toUpperCase()}`, 70, H - 80);

    // marka
    ctx.fillStyle = `${theme.accent}`;
    ctx.font = "bold 30px Inter, Arial";
    ctx.textAlign = "right";
    ctx.fillText("TRANSFER RADAR", W - 40, 50);
    ctx.textAlign = "left";
  };

  // her değişimde yeniden çiz
  useEffect(draw, [badge, headline, player, club, theme]);

  const onUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const img = new Image();
    img.onload = () => {
      imgRef.current = img;
      draw();
    };
    img.src = URL.createObjectURL(file);
  };

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.download = `thumbnail-${player.toLowerCase() || "transfer"}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
    if (linkRumor) {
      updateRumor(linkRumor, { stage: "thumbnail" });
      toast("Thumbnail indirildi ve habere bağlandı.");
    } else {
      toast("Thumbnail indirildi.");
    }
  };

  return (
    <>
      <PageHeader
        icon="🎨"
        title="Thumbnail Yap"
        subtitle="Tek tıkla 1280×720 YouTube kapağı üret, PNG indir."
      />

      <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
        <Card className="space-y-4">
          <Field label="Rozet">
            <Input value={badge} onChange={(e) => setBadge(e.target.value)} />
          </Field>
          <Field label="Başlık">
            <Input
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </Field>
          <Field label="Oyuncu">
            <Input value={player} onChange={(e) => setPlayer(e.target.value)} />
          </Field>
          <Field label="Kulüp">
            <Input value={club} onChange={(e) => setClub(e.target.value)} />
          </Field>
          <Field label="Tema">
            <Select
              value={theme.id}
              onChange={(e) =>
                setTheme(THEMES.find((t) => t.id === e.target.value) ?? THEMES[0])
              }
            >
              {THEMES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Oyuncu görseli (opsiyonel)">
            <input
              type="file"
              accept="image/*"
              onChange={onUpload}
              className="text-xs text-slate-400 file:mr-3 file:rounded-md file:border-0 file:bg-radar-line file:px-3 file:py-1.5 file:text-slate-200"
            />
          </Field>
          <Field label="Habere bağla (opsiyonel)">
            <Select
              value={linkRumor}
              onChange={(e) => setLinkRumor(e.target.value)}
            >
              <option value="">— bağlama —</option>
              {rumors.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.player} → {r.toClub}
                </option>
              ))}
            </Select>
          </Field>
          <Button onClick={download} className="w-full">
            ⬇️ PNG İndir
          </Button>
        </Card>

        <Card>
          <canvas
            ref={canvasRef}
            width={1280}
            height={720}
            className="w-full rounded-lg border border-radar-line"
          />
          <p className="mt-2 text-center text-xs text-slate-500">
            Önizleme · 1280×720 (YouTube standart)
          </p>
        </Card>
      </div>
    </>
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const words = text.split(" ");
  let line = "";
  let yy = y;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lineHeight;
    } else {
      line = test;
    }
  }
  ctx.fillText(line, x, yy);
}
