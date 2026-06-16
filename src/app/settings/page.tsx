"use client";

import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Field, Input, Textarea, Button } from "@/components/ui";

export default function SettingsPage() {
  const { settings, updateSettings, resetAll, rumors, scripts, sources, toast } =
    useStudio();

  return (
    <>
      <PageHeader
        icon="⚙️"
        title="Ayarlar"
        subtitle="Kanal bilgileri senaryolarda otomatik kullanılır."
      />

      <Card className="mb-5 grid gap-4 sm:grid-cols-2">
        <Field label="Kanal adı">
          <Input
            value={settings.channelName}
            onChange={(e) => updateSettings({ channelName: e.target.value })}
          />
        </Field>
        <Field label="Sunucu / anlatıcı">
          <Input
            value={settings.host}
            onChange={(e) => updateSettings({ host: e.target.value })}
          />
        </Field>
        <div className="sm:col-span-2">
          <Field label="Kapanış cümlesi (CTA)">
            <Textarea
              rows={2}
              value={settings.cta}
              onChange={(e) => updateSettings({ cta: e.target.value })}
            />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Varsayılan hashtag'ler">
            <Input
              value={settings.hashtag}
              onChange={(e) => updateSettings({ hashtag: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm text-slate-400">
          Kayıtlı veri: <b className="text-slate-200">{rumors.length}</b> haber ·{" "}
          <b className="text-slate-200">{scripts.length}</b> senaryo ·{" "}
          <b className="text-slate-200">{sources.length}</b> kaynak
          <p className="mt-1 text-xs text-slate-600">
            Tüm veriler tarayıcında (localStorage) saklanır. $0 maliyet.
          </p>
        </div>
        <Button
          variant="danger"
          onClick={() => {
            if (confirm("Tüm veriler başlangıç durumuna sıfırlansın mı?")) {
              resetAll();
              toast("Veriler sıfırlandı.", "info");
            }
          }}
        >
          Verileri Sıfırla
        </Button>
      </Card>
    </>
  );
}
