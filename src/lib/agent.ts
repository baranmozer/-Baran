import type { Rumor, Source } from "./types";

// ── Transfer Agent (sezgisel/heuristic değerlendirme) ──
// Bir oyuncu hakkındaki tüm haberleri + kaynak güvenilirliklerini birleştirip
// transferin gerçekleşme olasılığını ve gerekçesini üretir. API'siz, $0.

export interface SourceSignal {
  source: Source | undefined;
  rumor: Rumor;
  typeScore: number; // habere türünden gelen ham puan
  weight: number; // kaynak güvenilirliği 0-1
}

export interface AgentVerdict {
  player: string;
  probability: number; // 0-100
  confidence: "Düşük" | "Orta" | "Yüksek";
  label: string;
  positives: string[];
  negatives: string[];
  signals: SourceSignal[];
  summary: string;
}

const TYPE_SCORE: Record<Rumor["type"], number> = {
  confirmed: 95,
  strong: 70,
  rumor: 45,
  denied: 8,
};

const TYPE_TR: Record<Rumor["type"], string> = {
  confirmed: "kesin",
  strong: "güçlü iddia",
  rumor: "söylenti",
  denied: "yalanlama",
};

function labelFor(p: number): string {
  if (p >= 80) return "🟢 Çok olası — bu iş bitmek üzere";
  if (p >= 60) return "🟢 Olası — ciddi görüşmeler var";
  if (p >= 40) return "🟡 Belirsiz — temkinli yaklaş";
  if (p >= 20) return "🟠 Zayıf ihtimal";
  return "🔴 Düşük ihtimal / yalanlanmış";
}

/**
 * Bir oyuncu için tüm ilgili haberleri değerlendirir.
 * Skor = kaynak güvenilirliğiyle ağırlıklandırılmış tür puanlarının ortalaması,
 * çok sayıda güvenilir kaynak hemfikirse yukarı, yalanlama varsa aşağı çekilir.
 */
export function evaluateTransfer(
  playerName: string,
  rumors: Rumor[],
  sources: Source[]
): AgentVerdict {
  const related = rumors.filter((r) => r.playerName === playerName);
  const signals: SourceSignal[] = related.map((r) => {
    const source = sources.find((s) => s.id === r.sourceId);
    return {
      source,
      rumor: r,
      typeScore: TYPE_SCORE[r.type],
      weight: (source?.reliability ?? 40) / 100,
    };
  });

  if (signals.length === 0) {
    return {
      player: playerName,
      probability: 0,
      confidence: "Düşük",
      label: "Veri yok",
      positives: [],
      negatives: ["Bu oyuncu hakkında kayıtlı haber yok."],
      signals: [],
      summary: "Değerlendirme için yeterli veri yok.",
    };
  }

  // Ağırlıklı ortalama
  const totalW = signals.reduce((s, x) => s + x.weight, 0) || 1;
  let prob = signals.reduce((s, x) => s + x.typeScore * x.weight, 0) / totalW;

  // Mutabakat bonusu: 2+ farklı kaynak olumlu (denied değil) ise
  const positiveSignals = signals.filter((x) => x.rumor.type !== "denied");
  const uniqueSources = new Set(positiveSignals.map((x) => x.source?.id)).size;
  if (uniqueSources >= 2) prob = Math.min(100, prob + 6 * (uniqueSources - 1));

  // Yalanlama cezası
  const denials = signals.filter((x) => x.rumor.type === "denied");
  if (denials.length) prob = Math.max(0, prob - 12 * denials.length);

  // Yüksek güvenilir kaynak (>=88) confirmed verdiyse zemin yükselt
  const strongConfirm = signals.find(
    (x) => x.rumor.type === "confirmed" && (x.source?.reliability ?? 0) >= 88
  );
  if (strongConfirm) prob = Math.max(prob, 90);

  prob = Math.round(Math.max(0, Math.min(100, prob)));

  // Güven seviyesi: kaynak sayısı + ortalama güvenilirlik
  const avgRel = signals.reduce((s, x) => s + x.weight * 100, 0) / signals.length;
  const confidence: AgentVerdict["confidence"] =
    signals.length >= 2 && avgRel >= 80
      ? "Yüksek"
      : avgRel >= 65 || signals.length >= 2
      ? "Orta"
      : "Düşük";

  const positives: string[] = [];
  const negatives: string[] = [];

  for (const x of signals) {
    const sName = x.source?.name ?? "Bilinmeyen kaynak";
    const rel = x.source?.reliability ?? 40;
    const line = `${sName} (%${rel}) → ${TYPE_TR[x.rumor.type]}`;
    if (x.rumor.type === "denied") negatives.push(line);
    else if (x.typeScore >= 60) positives.push(line);
    else negatives.push(line);
  }
  if (uniqueSources >= 2)
    positives.push(`${uniqueSources} bağımsız kaynak transferi doğruluyor.`);
  if (denials.length) negatives.push(`${denials.length} yalanlama mevcut.`);

  const summary =
    `${playerName} için ${signals.length} haber değerlendirildi. ` +
    `Kaynak güvenilirlikleri ağırlıklandırılınca gerçekleşme olasılığı %${prob} ` +
    `(${confidence.toLowerCase()} güven). ${labelFor(prob).replace(/^[^ ]+ /, "")}.`;

  return {
    player: playerName,
    probability: prob,
    confidence,
    label: labelFor(prob),
    positives,
    negatives,
    signals,
    summary,
  };
}
