"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Field, Select, Button } from "@/components/ui";
import { generateScript, scriptToText } from "@/lib/scriptGenerator";
import type { Script } from "@/lib/types";

function ScriptInner() {
  const params = useSearchParams();
  const { rumors, sources, settings, addScript, updateRumor, toast } =
    useStudio();

  const initial = params.get("rumor") ?? rumors[0]?.id ?? "";
  const [rumorId, setRumorId] = useState(initial);
  const [script, setScript] = useState<Script | null>(null);

  const rumor = useMemo(
    () => rumors.find((r) => r.id === rumorId),
    [rumors, rumorId]
  );

  const handleGenerate = () => {
    if (!rumor) {
      toast("Önce bir haber seç.", "error");
      return;
    }
    const src = sources.find((s) => s.id === rumor.sourceId);
    const s = generateScript(rumor, settings, src);
    setScript(s);
    addScript(s);
    if (rumor.stage === "idea") updateRumor(rumor.id, { stage: "scripted" });
    toast("Senaryo üretildi!");
  };

  const copyAll = async () => {
    if (!script) return;
    try {
      await navigator.clipboard.writeText(scriptToText(script));
      toast("Senaryo panoya kopyalandı.");
    } catch {
      toast("Kopyalama başarısız.", "error");
    }
  };

  return (
    <>
      <PageHeader
        icon="📝"
        title="Senaryo Yaz"
        subtitle="Seçtiğin haberden otomatik YouTube video senaryosu üret."
      />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <Field label="Haber seç">
              <Select
                value={rumorId}
                onChange={(e) => setRumorId(e.target.value)}
              >
                {rumors.length === 0 && <option value="">Haber yok</option>}
                {rumors.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.player} → {r.toClub}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Button onClick={handleGenerate} disabled={!rumor}>
            ⚡ Senaryo Üret
          </Button>
        </div>
      </Card>

      {script && (
        <div className="space-y-4">
          <Card>
            <h3 className="mb-2 text-sm font-semibold text-radar-glow">
              🎬 Başlık Önerileri
            </h3>
            <ul className="space-y-1.5 text-sm text-slate-200">
              {script.titleOptions.map((t, i) => (
                <li key={i} className="rounded-lg bg-radar-bg px-3 py-2">
                  {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-radar-glow">
              🎙️ Giriş (Hook)
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {script.hook}
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-radar-glow">
              📝 Gelişme
            </h3>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-200">
              {script.body}
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-radar-glow">
              👋 Kapanış
            </h3>
            <p className="text-sm leading-relaxed text-slate-200">
              {script.outro}
            </p>
          </Card>

          <Card>
            <h3 className="mb-2 text-sm font-semibold text-radar-glow">
              🏷️ Etiketler
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {script.tags.map((t) => (
                <span
                  key={t}
                  className="rounded-full border border-radar-line px-2.5 py-0.5 text-xs text-slate-300"
                >
                  #{t}
                </span>
              ))}
            </div>
          </Card>

          <Button onClick={copyAll}>📋 Tümünü Kopyala</Button>
        </div>
      )}
    </>
  );
}

export default function ScriptPage() {
  return (
    <Suspense fallback={<div className="text-slate-500">Yükleniyor…</div>}>
      <ScriptInner />
    </Suspense>
  );
}
