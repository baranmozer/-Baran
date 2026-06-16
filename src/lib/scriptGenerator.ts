import type { Rumor, Settings, Source, Script } from "./types";
import { STATUS_LABELS, formatFee, uid } from "./utils";

export type ScriptTone = "serious" | "hype" | "funny";
export type ScriptLength = "short" | "long";

export interface ScriptOptions {
  tone: ScriptTone;
  length: ScriptLength;
}

export const TONE_LABELS: Record<ScriptTone, string> = {
  serious: "Ciddi / analiz",
  hype: "Hype / clickbait",
  funny: "Eğlenceli",
};

export const LENGTH_LABELS: Record<ScriptLength, string> = {
  short: "Kısa (Shorts/özet)",
  long: "Uzun (detaylı video)",
};

const DEFAULT_OPTIONS: ScriptOptions = { tone: "hype", length: "long" };

/**
 * Senaryo üreticisi — js/script-generator.js'in Next.js karşılığı.
 * Ton ve uzunluğa göre başlık, giriş (hook), gelişme, kapanış ve etiket üretir.
 * Tamamen şablon tabanlı, $0 maliyet.
 */
export function generateScript(
  rumor: Rumor,
  settings: Settings,
  source?: Source,
  options: ScriptOptions = DEFAULT_OPTIONS
): Script {
  const { player, fromClub, toClub, fee, reliability, note } = rumor;
  const feeText = formatFee(fee);
  const statusText = STATUS_LABELS[rumor.status];
  const srcText = source ? source.name : "kulis bilgisi";
  const { tone, length } = options;

  const titleOptions = buildTitles(tone, player, fromClub, toClub, feeText);
  const hook = buildHook(tone, settings, player, toClub, srcText);
  const body = buildBody(
    { player, fromClub, toClub, feeText, statusText, reliability, note, srcText },
    tone,
    length
  );
  const outro = buildOutro(tone, settings);
  const tags = buildTags(player, fromClub, toClub, settings);

  return {
    id: uid("scr"),
    rumorId: rumor.id,
    titleOptions,
    hook,
    body,
    outro,
    tags,
    createdAt: new Date().toISOString(),
  };
}

function buildTitles(
  tone: ScriptTone,
  player: string,
  fromClub: string,
  toClub: string,
  feeText: string
): string[] {
  if (tone === "serious") {
    return [
      `${player} - ${toClub} transferi: tüm detaylar`,
      `${player} neden ${toClub}'a gidiyor? | Analiz`,
      `${toClub}'ın ${player} planı ve ${feeText} bütçesi`,
    ];
  }
  if (tone === "funny") {
    return [
      `${player} ${toClub}'a mı?! Menajeri yine sahnede 😅`,
      `${fromClub} taraftarı bunu duyunca... 🤣 | ${player}`,
      `${player} transferi: "${feeText}" diyenlere gülüyoruz`,
    ];
  }
  // hype
  return [
    `🚨 SON DAKİKA: ${player} ${toClub}'a mı GELİYOR?`,
    `BOMBA İDDİA 💣 ${player} ${fromClub}'dan ${toClub}'a!`,
    `${player} transferinde FLAŞ gelişme! | ${feeText} 🔥`,
  ];
}

function buildHook(
  tone: ScriptTone,
  settings: Settings,
  player: string,
  toClub: string,
  srcText: string
): string {
  const intro = `Selam ${settings.channelName} ailesi, ben ${settings.host}.`;
  if (tone === "serious") {
    return `${intro} Bugün ${player} ve ${toClub} arasında konuşulan transferi ${srcText} kaynaklı bilgilerle, soğukkanlı şekilde masaya yatırıyoruz.`;
  }
  if (tone === "funny") {
    return `${intro} Oturun bir kahve alın, çünkü ${player} transferi yine olay! ${srcText} bunu yazdı, biz de gülmekten transferi yorumlayamadık ama deneyeceğiz. 😄`;
  }
  return `${intro} Gündemi sallayan bir transfer var: ${player}! ${srcText}'e göre ${toClub} düğmeye bastı. Detaylar bu videoda, kaçırmayın! 🔥`;
}

interface BodyInput {
  player: string;
  fromClub: string;
  toClub: string;
  feeText: string;
  statusText: string;
  reliability: number;
  note?: string;
  srcText: string;
}

function buildBody(d: BodyInput, tone: ScriptTone, length: ScriptLength): string {
  const relComment =
    d.reliability >= 75
      ? "Bu iş neredeyse bitti diyebiliriz, güvenilirlik çok yüksek."
      : d.reliability >= 50
      ? "Görüşmeler ciddi ama henüz kesinleşmiş değil."
      : "Şimdilik söylenti seviyesinde, temkinli yaklaşmakta fayda var.";

  const lines = [
    `📌 Özet: ${d.player}, ${d.fromClub} formasından ${d.toClub} formasına geçebilir.`,
    `💰 Konuşulan bonservis: ${d.feeText}.`,
    `📡 Durum: ${d.statusText}. Güvenilirlik: %${d.reliability}. ${relComment}`,
    d.note ? `🗣️ Kulis: ${d.note}` : "",
    `🔎 Kaynak: ${d.srcText}.`,
  ];

  if (length === "long") {
    lines.push(
      `🎯 ${d.toClub} açısından: Bu transfer kadro dengesini ve hücum gücünü doğrudan etkiler.`,
      `📉 ${d.fromClub} açısından: Oyuncunun ayrılığı boşluk yaratır, yerine kim gelir?`,
      `👥 Taraftar tepkisi: Sosyal medya şimdiden ikiye bölünmüş durumda.`
    );
  }

  lines.push(
    tone === "funny"
      ? "Sizce bu transfer olur mu, yoksa yine menajer şovu mu? Yorumlara yazın! 😎"
      : "Peki sizce bu transfer gerçekleşir mi? Yorumlarda buluşalım."
  );

  return lines.filter(Boolean).join("\n\n");
}

function buildOutro(tone: ScriptTone, settings: Settings): string {
  const base = settings.cta;
  if (tone === "hype") return `${base} Çan işaretine basmayı da unutmayın, bir sonraki bomba kaçmasın! 🔔`;
  if (tone === "funny") return `${base} Beğenmezseniz menajere söylerim! 😜`;
  return base;
}

function buildTags(
  player: string,
  fromClub: string,
  toClub: string,
  settings: Settings
): string[] {
  const slug = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  return Array.from(
    new Set(
      [
        slug(player),
        slug(toClub),
        slug(fromClub),
        "transfer",
        "sondakika",
        ...settings.hashtag.split(/\s+/).map((h) => h.replace("#", "")),
      ].filter(Boolean)
    )
  );
}

/** Senaryoyu tek bir kopyalanabilir metne dönüştürür. */
export function scriptToText(s: Script): string {
  return [
    "🎬 BAŞLIK ÖNERİLERİ",
    ...s.titleOptions.map((t, i) => `${i + 1}. ${t}`),
    "",
    "🎙️ GİRİŞ",
    s.hook,
    "",
    "📝 GELİŞME",
    s.body,
    "",
    "👋 KAPANIŞ",
    s.outro,
    "",
    "🏷️ ETİKETLER",
    s.tags.map((t) => `#${t}`).join(" "),
  ].join("\n");
}
