import type { Rumor, Settings, Source, Script } from "./types";
import { STATUS_LABELS, formatFee, uid } from "./utils";

/**
 * Senaryo üreticisi — js/script-generator.js'in Next.js karşılığı.
 * Bir habere göre YouTube videosu için başlık önerileri, giriş (hook),
 * gelişme metni, kapanış ve etiketler üretir. Tamamen şablon tabanlı, $0 maliyet.
 */
export function generateScript(
  rumor: Rumor,
  settings: Settings,
  source?: Source
): Script {
  const { player, fromClub, toClub, fee, reliability, note } = rumor;
  const feeText = formatFee(fee);
  const statusText = STATUS_LABELS[rumor.status];
  const srcText = source ? source.name : "kulis bilgisi";

  const titleOptions = [
    `🚨 SON DAKİKA: ${player} ${toClub}'a mı geliyor?`,
    `${player} transferinde flaş gelişme! | ${toClub} ${feeText}`,
    `BOMBA İDDİA 💣 ${player} ${fromClub}'dan ${toClub}'a!`,
  ];

  const reliabilityComment =
    reliability >= 75
      ? "Bu iş neredeyse bitti diyebiliriz, güvenilirlik çok yüksek."
      : reliability >= 50
      ? "Görüşmeler ciddi ama henüz kesinleşmiş değil."
      : "Şimdilik bir söylenti seviyesinde, temkinli yaklaşmakta fayda var.";

  const hook = `Selam ${settings.channelName} ailesi! Ben ${settings.host}. ` +
    `Bugün gündemde çok konuşulacak bir transfer var: ${player}. ` +
    `${srcText}'e göre ${toClub} bu transferi bitirmek için düğmeye bastı. ` +
    `Detaylar bu videoda!`;

  const body = [
    `📌 Transferin özeti: ${player}, ${fromClub} formasından ${toClub} formasına geçebilir.`,
    `💰 Konuşulan bonservis: ${feeText}.`,
    `📡 Durum: ${statusText}. Güvenilirlik: %${reliability}. ${reliabilityComment}`,
    note ? `🗣️ Kulis: ${note}` : "",
    `🔎 Kaynak: ${srcText}.`,
    `Peki sizce bu transfer gerçekleşir mi? Yorumlarda buluşalım.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  const outro = `${settings.cta}`;

  const tags = Array.from(
    new Set([
      player.toLowerCase().replace(/\s+/g, ""),
      toClub.toLowerCase().replace(/\s+/g, ""),
      fromClub.toLowerCase().replace(/\s+/g, ""),
      "transfer",
      "sondakika",
      ...settings.hashtag.split(/\s+/).map((h) => h.replace("#", "")),
    ])
  ).filter(Boolean);

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
