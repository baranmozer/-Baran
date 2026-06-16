"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useStudio } from "@/store/StudioContext";
import { PageHeader, Card, Input, Button } from "@/components/ui";
import { POSITION_LABELS, formatFee, uid } from "@/lib/utils";

export default function PlayersPage() {
  const router = useRouter();
  const { players, addRumor, toast } = useStudio();
  const [q, setQ] = useState("");

  const results = useMemo(() => {
    const needle = q.trim().toLocaleLowerCase("tr");
    if (!needle) return players;
    return players.filter((p) =>
      `${p.name} ${p.club} ${p.nationality}`
        .toLocaleLowerCase("tr")
        .includes(needle)
    );
  }, [players, q]);

  const quickRumor = (name: string, club: string) => {
    addRumor({
      id: uid("r"),
      player: name,
      fromClub: club,
      toClub: "?",
      fee: null,
      reliability: 30,
      status: "rumor",
      stage: "idea",
      createdAt: new Date().toISOString(),
    });
    toast(`${name} için taslak haber oluşturuldu.`);
    router.push("/add-rumor");
  };

  return (
    <>
      <PageHeader
        icon="👤"
        title="Futbolcu Ara"
        subtitle="Veritabanındaki oyuncuları ara, hızlıca haber taslağı oluştur."
      />

      <div className="mb-5">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="İsim, kulüp veya ülke ara…"
        />
      </div>

      {results.length === 0 ? (
        <Card className="text-slate-500">Eşleşen oyuncu yok.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {results.map((p) => (
            <Card key={p.id} className="!p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-slate-100">{p.name}</h3>
                  <p className="text-xs text-slate-400">
                    {POSITION_LABELS[p.position]} · {p.club}
                  </p>
                </div>
                <span className="text-sm font-bold text-radar-glow">
                  {formatFee(p.marketValue)}
                </span>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-radar-line pt-3 text-xs text-slate-500">
                <span>
                  {p.age} yaş · {p.nationality}
                </span>
                <Button
                  variant="ghost"
                  className="!px-3 !py-1 !text-xs"
                  onClick={() => quickRumor(p.name, p.club)}
                >
                  + Haber taslağı
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
