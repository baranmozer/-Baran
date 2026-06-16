"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/store/StudioContext";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSettings, exportAll, importAll, resetAll, toast } = useStudio();
  const fileRef = useRef<HTMLInputElement>(null);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    updateSettings({
      channelName: (form.elements.namedItem("channel") as HTMLInputElement).value,
      apiKey: (form.elements.namedItem("api") as HTMLInputElement).value,
    });
    toast("Ayarlar kaydedildi.", "success");
  };

  const exportData = () => {
    const blob = new Blob([exportAll()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transfer-radar-yedek-${new Date().toISOString().split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast("Yedek dosyası indirildi.", "success");
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (importAll(String(ev.target?.result))) {
        toast("Veriler başarıyla geri yüklendi.", "success");
      } else {
        toast("Geçersiz yedek dosyası.", "error");
      }
    };
    reader.readAsText(file);
  };

  const reset = () => {
    if (confirm("DİKKAT! Tüm haberleriniz, kaynaklarınız ve ayarlarınız silinecek. Fabrika ayarlarına dönmek istediğinize emin misiniz?")) {
      resetAll();
      toast("Sistem sıfırlandı.", "info");
      setTimeout(() => router.push("/"), 800);
    }
  };

  return (
    <>
      <div className="page-header animate-fade-in">
        <h1 className="page-title">⚙️ Ayarlar</h1>
        <div className="page-subtitle">Kanal ayarları ve veri yönetimi.</div>
      </div>

      <div className="two-col animate-scale-in">
        <div className="card">
          <h3 className="card-title mb-16">Kanal Ayarları</h3>
          <form onSubmit={save}>
            <div className="form-group">
              <label className="form-label">YouTube Kanal Adı</label>
              <input type="text" name="channel" className="form-input" defaultValue={settings.channelName} />
            </div>
            <div className="form-group">
              <label className="form-label">API-Football Key (Opsiyonel)</label>
              <input type="password" name="api" className="form-input" defaultValue={settings.apiKey} placeholder="Gerçek zamanlı veri çekmek isterseniz" />
              <div className="form-hint">RapidAPI üzerinden alınan key. Yoksa lokal veriler kullanılır.</div>
            </div>
            <button type="submit" className="btn btn-primary mt-16">Ayarları Kaydet</button>
          </form>
        </div>

        <div className="card">
          <h3 className="card-title mb-16">Veri Yönetimi</h3>
          <p className="text-muted" style={{ fontSize: 14, marginBottom: 20 }}>
            Tüm verileriniz tarayıcınızda (localStorage) saklanmaktadır. Verilerinizi kaybetmemek için dışa aktarabilirsiniz.
          </p>
          <div className="flex-col gap-16">
            <button className="btn btn-secondary w-full" onClick={exportData}>📦 Tüm Verileri Yedekle (JSON İndir)</button>
            <div style={{ position: "relative" }}>
              <button className="btn btn-secondary w-full" onClick={() => fileRef.current?.click()}>📥 Yedekten Geri Yükle</button>
              <input ref={fileRef} type="file" style={{ display: "none" }} accept=".json" onChange={importData} />
            </div>
            <div className="section-divider" style={{ margin: "8px 0" }} />
            <button className="btn btn-ghost w-full" style={{ color: "var(--error)", border: "1px solid rgba(255,0,0,0.2)" }} onClick={reset}>
              ⚠️ Tüm Verileri Sıfırla (Fabrika Ayarlarına Dön)
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
