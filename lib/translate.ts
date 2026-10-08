const MODEL = "gpt-4o-mini";

export interface TranslateInput {
  id: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  whyItMatters: string[];
}

export interface Hindi {
  id: string;
  headline: string;
  summary: string;
  keyPoints: string[];
  whyItMatters: string[];
}

const SYSTEM = `You translate financial news into clear, natural Hindi (Devanagari) for Indian retail investors.
Rules:
- Translate faithfully. Add nothing, remove nothing, and never change a fact.
- Keep every number, percentage, date and currency amount exactly as written (use Rs or the rupee sign as in the original).
- Keep company names, tickers and index names (TCS, HDFC Bank, NIFTY 50) in their usual form. Use the common Hindi term where one exists for words like profit (मुनाफा), revenue (राजस्व), shares (शेयर), quarter (तिमाही).
- Plain, everyday Hindi. Not literary, not heavy Sanskrit.
- Return the same number of key_points and why_it_matters as you were given, in the same order.`;

const SCHEMA = {
  name: "hindi_news",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["items"],
    properties: {
      items: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["id", "headline", "summary", "key_points", "why_it_matters"],
          properties: {
            id: { type: "string" },
            headline: { type: "string" },
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            why_it_matters: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
  },
} as const;

const DEVANAGARI = /[ऀ-ॿ]/;

/** A translation is only kept when it is real Hindi and has the same shape as the English it came from. */
export function validateHindi(raw: unknown, source: TranslateInput): Hindi | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const text = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const list = (v: unknown) => (Array.isArray(v) ? v.map(text).filter(Boolean) : []);
  const headline = text(r.headline);
  const summary = text(r.summary);
  const keyPoints = list(r.key_points);
  const why = list(r.why_it_matters);
  if (!DEVANAGARI.test(headline) || !DEVANAGARI.test(summary)) return null;
  if (keyPoints.length !== source.keyPoints.length || why.length !== source.whyItMatters.length) return null;
  if ([...keyPoints, ...why].some((t) => !DEVANAGARI.test(t))) return null;
  return { id: source.id, headline, summary, keyPoints, whyItMatters: why };
}

/** One call for a few stories. Throws on any API or parsing failure; items that fail validation are skipped. */
export async function translateStories(items: TranslateInput[]): Promise<Hindi[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (!items.length) return [];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 4500,
      response_format: { type: "json_schema", json_schema: SCHEMA },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: JSON.stringify(items.map((i) => ({ id: i.id, headline: i.headline, summary: i.summary, key_points: i.keyPoints, why_it_matters: i.whyItMatters }))),
        },
      ],
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const content = (await res.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  const byId = new Map(items.map((i) => [i.id, i] as const));
  return ((JSON.parse(content) as { items?: Record<string, unknown>[] }).items ?? [])
    .map((x) => {
      const src = byId.get(String(x?.id));
      return src ? validateHindi(x, src) : null;
    })
    .filter((x): x is Hindi => !!x);
}
