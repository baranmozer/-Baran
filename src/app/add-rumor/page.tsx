"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Field, Input, Select, Textarea, Button } from "@/components/ui";
import { STATUS_LABELS, uid } from "@/lib/utils";
import type { RumorStatus } from "@/lib/types";

export default function AddRumorPage() {
  const router = useRouter();
  const { sources, addRumor, toast } = useStudio();

  const [form, setForm] = useState({
    player: "",
    fromClub: "",
    toClub: "",
    fee: "",
    reliability: 50,
    status: "rumor" as RumorStatus,
    sourceId: sources[0]?.id ?? "",
    note: "",
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.player.trim() || !form.toClub.trim()) {
      toast("Oyuncu ve gideceği kulüp zorunlu.", "error");
      return;
    }
    addRumor({
      id: uid("r"),
      player: form.player.trim(),
      fromClub: form.fromClub.trim() || "Bilinmiyor",
      toClub: form.toClub.trim(),
      fee: form.fee === "" ? null : Number(form.fee),
      reliability: Number(form.reliability),
      status: form.status,
      sourceId: form.sourceId || undefined,
      note: form.note.trim() || undefined,
      stage: "idea",
      createdAt: new Date().toISOString(),
    });
    toast("Haber eklendi! İçerik kuyruğuna gönderildi.");
    router.push("/");
  };

  return (
    <>
      <PageHeader
        icon="📰"
        title="Haber Ekle"
        subtitle="Yeni bir transfer haberini içerik kuyruğuna ekle."
      />

      <Card>
        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Oyuncu *">
            <Input
              value={form.player}
              onChange={(e) => set("player", e.target.value)}
              placeholder="Victor Osimhen"
            />
          </Field>
          <Field label="Kaynak">
            <Select
              value={form.sourceId}
              onChange={(e) => set("sourceId", e.target.value)}
            >
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} (%{s.weight})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mevcut kulüp">
            <Input
              value={form.fromClub}
              onChange={(e) => set("fromClub", e.target.value)}
              placeholder="Napoli"
            />
          </Field>
          <Field label="Gideceği kulüp *">
            <Input
              value={form.toClub}
              onChange={(e) => set("toClub", e.target.value)}
              placeholder="Galatasaray"
            />
          </Field>
          <Field label="Bonservis (milyon €) — boş: bilinmiyor">
            <Input
              type="number"
              min={0}
              value={form.fee}
              onChange={(e) => set("fee", e.target.value)}
              placeholder="75"
            />
          </Field>
          <Field label="Durum">
            <Select
              value={form.status}
              onChange={(e) => set("status", e.target.value as RumorStatus)}
            >
              {(Object.keys(STATUS_LABELS) as RumorStatus[]).map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </Select>
          </Field>
          <div className="sm:col-span-2">
            <Field label={`Güvenilirlik: %${form.reliability}`}>
              <input
                type="range"
                min={0}
                max={100}
                value={form.reliability}
                onChange={(e) => set("reliability", Number(e.target.value))}
                className="w-full accent-radar-glow"
              />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="Kulis / not">
              <Textarea
                rows={3}
                value={form.note}
                onChange={(e) => set("note", e.target.value)}
                placeholder="Oyuncu Türkiye'ye dönmek istiyor…"
              />
            </Field>
          </div>
          <div className="flex gap-2 sm:col-span-2">
            <Button type="submit">Haberi Kaydet</Button>
            <Button type="button" variant="ghost" onClick={() => router.back()}>
              Vazgeç
            </Button>
          </div>
        </form>
      </Card>
    </>
  );
}
