import Anthropic from "@anthropic-ai/sdk";
import type { Player, Rumor, Source } from "@/lib/types";
import { getMode } from "@/lib/agentSkills";

// Claude destekli Transfer Agent — modlar + web arama + tool use.
// API key SUNUCUDA kalır.
export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  mode: string;
  player?: string;
  team?: string;
  web?: boolean;
  rumors: Rumor[];
  sources: Source[];
  players: Player[];
}

const TYPE_TR: Record<Rumor["type"], string> = {
  confirmed: "Kesin/KAP",
  strong: "Güçlü iddia",
  rumor: "Söylenti",
  denied: "Yalanlandı",
};

function buildDossier(related: Rumor[], sources: Source[]): string {
  return related
    .map((r, i) => {
      const s = sources.find((x) => x.id === r.sourceId);
      return `Haber ${i + 1}:
- Kaynak: ${s ? `${s.name} (${s.handle}, güvenilirlik %${s.reliability})` : "bilinmiyor"}
- Oyuncu: ${r.playerName} | Hedef: ${r.team} | Tür: ${TYPE_TR[r.type]}
- İçerik: ${r.content}`;
    })
    .join("\n\n");
}

// ── İstemci tarafı (custom) araçlar ──
function runCustomTool(
  name: string,
  input: Record<string, unknown>,
  players: Player[],
  sources: Source[]
): string {
  const q = String(input.name ?? "").toLocaleLowerCase("tr");
  if (name === "get_player_stats") {
    const p = players.find((x) => x.name.toLocaleLowerCase("tr").includes(q));
    if (!p) return `"${input.name}" veritabanında bulunamadı.`;
    return JSON.stringify({
      name: p.name, age: p.age, position: p.position, currentTeam: p.currentTeam,
      marketValue: p.marketValue, contractEnd: p.contractEnd, stats: p.stats,
    });
  }
  if (name === "get_source_reliability") {
    const s = sources.find((x) => x.name.toLocaleLowerCase("tr").includes(q));
    if (!s) return `"${input.name}" kaynağı bulunamadı.`;
    return JSON.stringify({ name: s.name, handle: s.handle, team: s.team, reliability: s.reliability });
  }
  return `Bilinmeyen araç: ${name}`;
}

const CUSTOM_TOOLS = [
  {
    name: "get_player_stats",
    description: "Veritabanından bir futbolcunun istatistiklerini (gol, asist, maç, piyasa değeri, yaş, sözleşme) getirir.",
    input_schema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Futbolcu adı" } },
      required: ["name"],
    },
  },
  {
    name: "get_source_reliability",
    description: "Bir haber kaynağının (muhabir) güvenilirlik puanını ve takım alanını getirir.",
    input_schema: {
      type: "object" as const,
      properties: { name: { type: "string", description: "Kaynak/muhabir adı" } },
      required: ["name"],
    },
  },
];

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        ok: false,
        message:
          "ANTHROPIC_API_KEY ayarlı değil. Lokalde proje köküne '.env.local' oluşturup " +
          "ANTHROPIC_API_KEY=... satırını ekle, sonra sunucuyu yeniden başlat (npm run dev). " +
          "(Bir host kullanıyorsan ortam değişkenlerine ekle.)",
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

  const { mode: modeId, player, team, web, rumors, sources, players } = body;
  const mode = getMode(modeId);

  // Kapsama göre ilgili haberleri seç
  let related = rumors;
  let subject = "Tüm gündem";
  if (mode.scope === "player" && player) {
    related = rumors.filter((r) => r.playerName === player);
    subject = player;
  } else if (mode.scope === "team" && team) {
    related = rumors.filter((r) => r.team === team);
    const teamNames: Record<string, string> = { GS: "Galatasaray", FB: "Fenerbahçe", BJK: "Beşiktaş", TS: "Trabzonspor" };
    subject = teamNames[team] ?? team;
  }

  if (related.length === 0) {
    return Response.json(
      { ok: false, message: "Bu kapsam için kayıtlı haber yok." },
      { status: 200 }
    );
  }

  const userMsg =
    `Konu: ${subject}\n\nEldeki haberler:\n\n${buildDossier(related, sources)}\n\n` +
    `Yukarıdaki göreve göre değerlendir.`;

  // Araçlar: opsiyonel web arama (server-side) + custom araçlar
  const tools: Anthropic.Messages.ToolUnion[] = [
    ...(web ? [{ type: "web_search_20260209", name: "web_search", max_uses: 4 } as Anthropic.Messages.ToolUnion] : []),
    ...(CUSTOM_TOOLS as unknown as Anthropic.Messages.ToolUnion[]),
  ];

  try {
    const client = new Anthropic({ apiKey });
    const messages: Anthropic.MessageParam[] = [{ role: "user", content: userMsg }];
    let final: Anthropic.Message | null = null;

    for (let i = 0; i < 6; i++) {
      const resp = await client.messages.create({
        model: "claude-opus-4-8",
        max_tokens: 2000,
        thinking: { type: "adaptive" },
        system: mode.skill,
        tools,
        messages,
      });
      final = resp;

      if (resp.stop_reason === "pause_turn") {
        // Sunucu aracı (web_search) devam ediyor — aynı içeriği geri gönder
        messages.push({ role: "assistant", content: resp.content });
        continue;
      }

      if (resp.stop_reason === "tool_use") {
        messages.push({ role: "assistant", content: resp.content });
        const results: Anthropic.ToolResultBlockParam[] = [];
        for (const block of resp.content) {
          if (block.type === "tool_use") {
            const out = runCustomTool(
              block.name,
              block.input as Record<string, unknown>,
              players,
              sources
            );
            results.push({ type: "tool_result", tool_use_id: block.id, content: out });
          }
        }
        messages.push({ role: "user", content: results });
        continue;
      }
      break; // end_turn
    }

    const analysis = (final?.content ?? [])
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return Response.json({ ok: true, analysis: analysis || "(boş yanıt)" });
  } catch (err) {
    const message =
      err instanceof Anthropic.APIError
        ? `Claude API hatası (${err.status}): ${err.message}`
        : "Beklenmeyen bir hata oluştu.";
    return Response.json({ ok: false, message }, { status: 200 });
  }
}
