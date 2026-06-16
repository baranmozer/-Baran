"use client";

import { useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Field, Input, Button } from "@/components/ui";
import { uid } from "@/lib/utils";

export default function SourcesPage() {
  const { sources, addSource, removeSource, toast } = useStudio();
  const [name, setName] = useState("");
  const [weight, setWeight] = useState(70);
  const [url, setUrl] = useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast("Kaynak adı gerekli.", "error");
      return;
    }
    addSource({
      id: uid("s"),
      name: name.trim(),
      weight: Number(weight),
      url: url.trim() || undefined,
    });
    setName("");
    setUrl("");
    setWeight(70);
    toast("Kaynak eklendi.");
  };

  return (
    <>
      <PageHeader
        icon="📋"
        title="Kaynaklar"
        subtitle="Güvendiğin haber kaynaklarını ve güvenilirlik ağırlıklarını yönet."
      />

      <Card className="mb-5">
        <form onSubmit={add} className="grid gap-4 sm:grid-cols-[1fr_160px_auto] sm:items-end">
          <Field label="Kaynak adı">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fabrizio Romano"
            />
          </Field>
          <Field label={`Ağırlık: %${weight}`}>
            <input
              type="range"
              min={0}
              max={100}
              value={weight}
              onChange={(e) => setWeight(Number(e.target.value))}
              className="w-full accent-radar-glow"
            />
          </Field>
          <Button type="submit">+ Ekle</Button>
          <div className="sm:col-span-3">
            <Field label="URL (opsiyonel)">
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://…"
              />
            </Field>
          </div>
        </form>
      </Card>

      <div className="space-y-2">
        {[...sources]
          .sort((a, b) => b.weight - a.weight)
          .map((s) => (
            <Card key={s.id} className="!p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-medium text-slate-100">{s.name}</div>
                  {s.url && (
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate text-xs text-radar-glow hover:underline"
                    >
                      {s.url}
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-24 overflow-hidden rounded-full bg-radar-line">
                      <div
                        className="h-full rounded-full bg-radar-glow"
                        style={{ width: `${s.weight}%` }}
                      />
                    </div>
                    <span className="w-10 text-right text-xs font-semibold text-slate-300">
                      %{s.weight}
                    </span>
                  </div>
                  <Button
                    variant="danger"
                    className="!px-2.5 !py-1 !text-xs"
                    onClick={() => {
                      removeSource(s.id);
                      toast("Kaynak silindi.", "info");
                    }}
                  >
                    Sil
                  </Button>
                </div>
              </div>
            </Card>
          ))}
      </div>
    </>
  );
}
