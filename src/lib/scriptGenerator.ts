import type { Player, Rumor, Source } from "./types";
import { formatDate } from "./utils";

// ── Senaryo motoru (script-generator.js ile birebir) ──

export interface ScriptSection {
  id: string;
  title: string;
  time: string;
  template: string;
  text?: string;
}

interface Template {
  name: string;
  description: string;
  icon: string;
  estimatedDuration: string;
  sections: ScriptSection[];
}

export interface GeneratedScript {
  templateId: string;
  templateName: string;
  sections: ScriptSection[];
  totalWords: number;
  estimatedDuration: string;
  generatedAt: string;
  playerName: string;
  targetTeam: string;
}

const templates: Record<string, Template> = {
  "transfer-bomb": {
    name: "🔥 SON DAKİKA Transfer",
    description: "Hızlı, heyecanlı, tek transfer haberi",
    icon: "🔥",
    estimatedDuration: "1:30 - 2:00",
    sections: [
      { id: "intro", title: "GİRİŞ", time: "0:00 - 0:15", template: `Arkadaşlar herkese merhaba! Bugün BOMBA bir transfer haberiyle karşınızdayız! {playerName}, {currentTeam}'dan {targetTeam}'a geliyor mu? Gelin detaylara birlikte bakalım!` },
      { id: "news", title: "TRANSFER HABERİ", time: "0:15 - 0:35", template: `{sourceName} bu transfer iddiasını paylaştı. {rumorContent} Bu haberin güvenilirlik puanı: yüzde {reliability}. Şimdi gelin bu oyuncuyu yakından tanıyalım.` },
      { id: "stats", title: "OYUNCU İSTATİSTİKLERİ", time: "0:35 - 1:10", template: `{playerName}, bu sezon {matches} maçta forma giydi. {goals} gol ve {assists} asist yaptı. Maç başı ortalama puanı {rating} olarak kayıtlara geçti. Piyasa değeri şu an {marketValue} olarak görünüyor. Sözleşmesi {contractEnd} yılına kadar devam ediyor.` },
      { id: "last-matches", title: "SON MAÇ PERFORMANSI", time: "1:10 - 1:35", template: `Son maçlarına baktığımızda {playerName}'in formda olduğunu görebiliyoruz. {lastMatchSummary} Bu istatistikler {targetTeam} için gerçekten iyi bir takviye olacağını gösteriyor.` },
      { id: "outro", title: "KAPANIŞ", time: "1:35 - 2:00", template: `Sizce bu transfer gerçekleşir mi? Yorumlarda düşüncelerinizi paylaşın! Videoyu beğenmeyi ve kanala abone olmayı unutmayın. Transfer haberlerini kaçırmamak için bildirimleri açın. Bir sonraki videoda görüşmek üzere!` },
    ],
  },
  "player-analysis": {
    name: "📊 Futbolcu Analiz",
    description: "Detaylı istatistik analizi, uzun format",
    icon: "📊",
    estimatedDuration: "3:00 - 4:00",
    sections: [
      { id: "intro", title: "GİRİŞ", time: "0:00 - 0:20", template: `Herkese merhaba! Bugün {targetTeam}'ın transfer gündemine giren {playerName}'i detaylıca analiz ediyoruz. Gol istatistiklerinden, asist rakamlarına, piyasa değerinden kariyer geçmişine kadar her şeyi inceleyeceğiz.` },
      { id: "profile", title: "OYUNCU PROFİLİ", time: "0:20 - 0:50", template: `{playerName}, {age} yaşında {nationality} bir {position}. Şu an {currentTeam} forması giyiyor. Piyasa değeri {marketValue} ve sözleşmesi {contractEnd} yılına kadar devam ediyor.` },
      { id: "season-stats", title: "SEZON İSTATİSTİKLERİ", time: "0:50 - 1:40", template: `Bu sezona baktığımızda {playerName} gerçekten etkileyici rakamlar ortaya koyuyor. {matches} maçta {goals} gol attı ve {assists} asist yaptı. Maç başı ortalaması {rating} puan. {yellowCards} sarı kart ve {redCards} kırmızı kart gördü.` },
      { id: "last-matches", title: "SON 5 MAÇ ANALİZİ", time: "1:40 - 2:30", template: `Son 5 maçına tek tek bakalım: {detailedLastMatches} Genel olarak bakıldığında {playerName}'in {formComment}` },
      { id: "career", title: "KARİYER GEÇMİŞİ", time: "2:30 - 3:15", template: `Kariyer geçmişine baktığımızda: {careerSummary} Bu deneyim {targetTeam} için büyük bir avantaj olacaktır.` },
      { id: "verdict", title: "SONUÇ VE YORUM", time: "3:15 - 3:45", template: `Sonuç olarak {playerName}, {targetTeam} için iyi bir transfer olur mu? Bence istatistiklere bakıldığında bu oyuncu takıma ciddi bir katkı sağlayabilir. Piyasa değeri ve yaşı düşünüldüğünde makul bir yatırım olabilir.` },
      { id: "outro", title: "KAPANIŞ", time: "3:45 - 4:00", template: `Sizce {playerName} {targetTeam}'a gelir mi? Yorumlarda yazın! Beğenmeyi ve abone olmayı unutmayın. Bildirimleri açın ki hiçbir transfer haberini kaçırmayın!` },
    ],
  },
  "daily-roundup": {
    name: "🔄 Transfer Günlüğü",
    description: "Günün tüm transfer haberlerini birleştir",
    icon: "🔄",
    estimatedDuration: "4:00 - 6:00",
    sections: [
      { id: "intro", title: "GİRİŞ", time: "0:00 - 0:20", template: `Herkese merhaba! Transfer Radar'ın günlük bülteniyle karşınızdayız. Bugün {totalNews} önemli transfer haberi var. Galatasaray ve Fenerbahçe cephesinden sıcak gelişmeler... Hadi başlayalım!` },
      { id: "gs-news", title: "GALATASARAY TRANSFER GÜNDEMİ", time: "0:20 - 2:00", template: `Önce Galatasaray cephesine bakalım. {gsNewsSummary}` },
      { id: "fb-news", title: "FENERBAHÇE TRANSFER GÜNDEMİ", time: "2:00 - 3:30", template: `Şimdi de Fenerbahçe cephesine geçelim. {fbNewsSummary}` },
      { id: "summary", title: "ÖZET TABLO", time: "3:30 - 4:15", template: `Günün özetine bakacak olursak: {dailySummary}` },
      { id: "outro", title: "KAPANIŞ", time: "4:15 - 4:30", template: `Bugünlük bu kadar! Her gün yeni transfer haberleriyle buradayız. Beğenmeyi, abone olmayı ve bildirimleri açmayı unutmayın! Yarın görüşmek üzere!` },
    ],
  },
  "gs-vs-fb": {
    name: "⚔️ GS vs FB Transfer Savaşı",
    description: "İki takımın transfer yarışını karşılaştır",
    icon: "⚔️",
    estimatedDuration: "3:00 - 5:00",
    sections: [
      { id: "intro", title: "GİRİŞ", time: "0:00 - 0:20", template: `Herkese merhaba! Bugün ezeli rakipler Galatasaray ve Fenerbahçe'nin transfer savaşını masaya yatırıyoruz. Hangi takım daha iyi transferler yapıyor? Gelin birlikte inceleyelim!` },
      { id: "gs-side", title: "GALATASARAY CEPHESİ 🟡🔴", time: "0:20 - 1:30", template: `Galatasaray tarafına baktığımızda: {gsTransferSummary}` },
      { id: "fb-side", title: "FENERBAHÇE CEPHESİ 🟡🔵", time: "1:30 - 2:40", template: `Fenerbahçe tarafına bakacak olursak: {fbTransferSummary}` },
      { id: "comparison", title: "KARŞILAŞTIRMA", time: "2:40 - 3:30", template: `İki takımı karşılaştırdığımızda: Galatasaray {gsCount} transfer iddiasıyla gündemde, Fenerbahçe ise {fbCount} transfer iddiasıyla gündemde. {comparisonComment}` },
      { id: "outro", title: "KAPANIŞ", time: "3:30 - 4:00", template: `Sizce hangi takım bu transfer döneminde daha başarılı olacak? GS mi FB mi? Yorumlarda yazın! Beğenmeyi ve abone olmayı unutmayın!` },
    ],
  },
};

type Vars = Record<string, string | number>;

function fillTemplate(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (match, key) =>
    vars[key] !== undefined ? String(vars[key]) : match
  );
}

function lastMatchSummary(p: Player): string {
  if (!p.last5?.length) return "";
  const g = p.last5.reduce((s, m) => s + m.goals, 0);
  const a = p.last5.reduce((s, m) => s + m.assists, 0);
  const avg = (p.last5.reduce((s, m) => s + m.rating, 0) / p.last5.length).toFixed(1);
  return `Son 5 maçta ${g} gol ve ${a} asist yaptı, ortalama puanı ${avg} oldu.`;
}

function detailedLastMatches(p: Player): string {
  if (!p.last5) return "";
  return p.last5
    .map((m) => {
      const perf = m.goals > 0 ? `${m.goals} gol attı` : "gol atamadı";
      const assist = m.assists > 0 ? ` ve ${m.assists} asist yaptı` : "";
      return `${m.opponent} maçında ${perf}${assist}, puanı ${m.rating} oldu.`;
    })
    .join(" ");
}

function careerSummary(p: Player): string {
  if (!p.career) return "";
  return p.career
    .map((c) => `${c.team}'da ${c.years} yılları arasında ${c.matches} maçta ${c.goals} gol attı.`)
    .join(" ");
}

function formComment(p: Player): string {
  if (!p.last5) return "performansı hakkında yeterli veri yok.";
  const avg = p.last5.reduce((s, m) => s + m.rating, 0) / p.last5.length;
  if (avg >= 8.0) return "mükemmel formda olduğunu görebiliyoruz!";
  if (avg >= 7.0) return "gayet iyi bir performans sergilediğini söyleyebiliriz.";
  if (avg >= 6.5) return "orta düzey bir performans sergilediğini görüyoruz.";
  return "formunun pek iyi olmadığını söyleyebiliriz.";
}

function teamNewsSummary(rumors: Rumor[], sources: Source[]): string {
  if (rumors.length === 0) return "Bu cephede henüz önemli bir gelişme yok.";
  return rumors
    .map((r) => {
      const source = sources.find((s) => s.id === r.sourceId);
      const sourceName = source ? source.name : "Bir kaynak";
      return `${sourceName}'a göre ${r.playerName} gündeme geldi. ${r.content}`;
    })
    .join(" Diğer bir gelişme ise: ");
}

function duration(sections: ScriptSection[]): { totalWords: number; estimatedDuration: string } {
  const totalWords = sections.reduce((sum, s) => sum + (s.text ?? "").split(/\s+/).length, 0);
  const estimatedSeconds = Math.round(totalWords / 2.5); // ~2.5 kelime/sn (TR)
  const m = Math.floor(estimatedSeconds / 60);
  const sec = estimatedSeconds % 60;
  return { totalWords, estimatedDuration: `${m}:${sec.toString().padStart(2, "0")}` };
}

export function generateScript(
  templateId: string,
  rumor: Rumor | undefined,
  player: Player | undefined,
  source: Source | undefined
): GeneratedScript | null {
  const template = templates[templateId];
  if (!template) return null;

  const targetTeam = rumor ? (rumor.team === "GS" ? "Galatasaray" : "Fenerbahçe") : "takım";

  const vars: Vars = {
    playerName: player ? player.name : rumor ? rumor.playerName : "Oyuncu",
    age: player ? player.age : "?",
    nationality: player ? player.nationality : "",
    position: player ? player.position : "",
    currentTeam: player ? player.currentTeam : "",
    marketValue: player ? player.marketValue : "?",
    contractEnd: player ? player.contractEnd : "?",
    goals: player ? player.stats.goals : "?",
    assists: player ? player.stats.assists : "?",
    matches: player ? player.stats.matches : "?",
    rating: player ? player.stats.rating : "?",
    yellowCards: player ? player.stats.yellowCards : "?",
    redCards: player ? player.stats.redCards : "?",
    targetTeam,
    sourceName: source ? source.name : "Bir kaynak",
    reliability: source ? source.reliability : "?",
    rumorContent: rumor ? rumor.content : "",
    lastMatchSummary: player ? lastMatchSummary(player) : "",
    detailedLastMatches: player ? detailedLastMatches(player) : "",
    careerSummary: player ? careerSummary(player) : "",
    formComment: player ? formComment(player) : "",
  };

  const sections = template.sections.map((s) => ({ ...s, text: fillTemplate(s.template, vars) }));
  const { totalWords, estimatedDuration } = duration(sections);

  return {
    templateId,
    templateName: template.name,
    sections,
    totalWords,
    estimatedDuration,
    generatedAt: new Date().toISOString(),
    playerName: String(vars.playerName),
    targetTeam,
  };
}

export function generateDailyRoundup(
  rumors: Rumor[],
  _players: Player[],
  sources: Source[]
): GeneratedScript {
  const gsRumors = rumors.filter((r) => r.team === "GS");
  const fbRumors = rumors.filter((r) => r.team === "FB");

  const vars: Vars = {
    totalNews: rumors.length,
    gsNewsSummary: teamNewsSummary(gsRumors, sources),
    fbNewsSummary: teamNewsSummary(fbRumors, sources),
    dailySummary: `Galatasaray cephesinde ${gsRumors.length} gelişme, Fenerbahçe cephesinde ${fbRumors.length} gelişme yaşandı.`,
    gsCount: gsRumors.length,
    fbCount: fbRumors.length,
    gsTransferSummary: teamNewsSummary(gsRumors, sources),
    fbTransferSummary: teamNewsSummary(fbRumors, sources),
    comparisonComment: "Transfer sezonu heyecanı devam ediyor!",
  };

  const template = templates["daily-roundup"];
  const sections = template.sections.map((s) => ({ ...s, text: fillTemplate(s.template, vars) }));
  const { totalWords, estimatedDuration } = duration(sections);

  return {
    templateId: "daily-roundup",
    templateName: template.name,
    sections,
    totalWords,
    estimatedDuration,
    generatedAt: new Date().toISOString(),
    playerName: "Günlük Bülten",
    targetTeam: "GS & FB",
  };
}

export function getTemplateList() {
  return Object.entries(templates).map(([id, t]) => ({
    id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    estimatedDuration: t.estimatedDuration,
  }));
}

export function exportAsText(script: GeneratedScript): string {
  let text = `${script.templateName}\n`;
  text += `${"═".repeat(50)}\n`;
  text += `Futbolcu: ${script.playerName}\n`;
  text += `Takım: ${script.targetTeam}\n`;
  text += `Tahmini Süre: ${script.estimatedDuration}\n`;
  text += `Kelime Sayısı: ${script.totalWords}\n`;
  text += `Oluşturulma: ${formatDate(script.generatedAt)}\n`;
  text += `${"═".repeat(50)}\n\n`;
  script.sections.forEach((s) => {
    text += `[${s.time}] ${s.title}\n`;
    text += `${"-".repeat(40)}\n`;
    text += `${s.text}\n\n`;
  });
  return text;
}
