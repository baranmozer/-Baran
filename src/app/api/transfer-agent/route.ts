import Anthropic from "@anthropic-ai/sdk";
import type { Rumor, Source, Settings } from "@/lib/types";

// Claude destekli Transfer Agent — kaynakları + spekülasyonları birlikte
// değerlendirip doğal-dil bir analiz üretir. API key SUNUCUDA kalır.
export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  player: string;
  rumors: Rumor[];
  sources: Source[];
  settings?: Settings;
}

const TYPE_TR: Record<Rumor["type"], string> = {
  confirmed: "Kesin/KAP",
  strong: "Güçlü iddia",
  rumor: "Söylenti",
  denied: "Yalanlandı",
};

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message:
          "Anthropic API anahtarı ayarlı değil. Vercel → Settings → Environment Variables → ANTHROPIC_API_KEY ekleyip yeniden deploy et.",
      },
      { status: 200 }
    );
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ ok: false, message: "Geçersiz istek." }, { status: 400 });
  }

  const { player, rumors, sources } = body;
  const related = rumors.filter((r) => r.playerName === player);
  if (related.length === 0) {
    return Response.json(
      { ok: false, message: "Bu oyuncu hakkında haber yok." },
      { status: 200 }
    );
  }

  const dossier = related
    .map((r, i) => {
      const s = sources.find((x) => x.id === r.sourceId);
      return `Haber ${i + 1}:
- Kaynak: ${s ? `${s.name} (${s.handle}, güvenilirlik %${s.reliability})` : "bilinmiyor"}
- Hedef takım: ${r.team}
- İddia türü: ${TYPE_TR[r.type]}
- İçerik: ${r.content}`;
    })
    .join("\n\n");

  const system =
    "Sen bir futbol transfer analistisin. Türk spor gazetecilerinin haberlerini " +
    "ve güvenilirlik puanlarını dikkate alarak, spekülasyonları soğukkanlı biçimde " +
    "değerlendirirsin. Abartıdan kaçın, kaynak güvenilirliğini ön planda tut. " +
    "Yanıtı Türkçe ver ve şu başlıklarla yapılandır: " +
    "1) Gerçekleşme olasılığı (% ve tek cümle gerekçe), " +
    "2) Kaynak değerlendirmesi (her kaynağın ağırlığı), " +
    "3) Lehte ve aleyhte faktörler, " +
    "4) Sonuç ve YouTube videosu için tek cümlelik öneri.";

  const userMsg = `Oyuncu: ${player}\n\nEldeki haberler:\n\n${dossier}\n\nBu transferi değerlendir.`;

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 1500,
      thinking: { type: "adaptive" },
      system,
      messages: [{ role: "user", content: userMsg }],
    });
    const analysis = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ ok: true, analysis });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API hatası (${err.status}): ${err.message}`
        : "Beklenmeyen bir hata oluştu.";
    return Response.json({ ok: false, message }, { status: 200 });
  }
}
