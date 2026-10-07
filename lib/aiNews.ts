const MODEL = "gpt-5-mini-2025-08-07";

export const TOPICS = ["Regulation", "Earnings", "Partnership", "Security", "Adoption", "Price move", "Legal", "Macro", "Product", "Other"] as const;

export interface HeadlineIn {
  id: string;
  headline: string;
  source: string;
}

export interface HeadlineOut {
  id: string;
  score: number;
  tone: "bull" | "bear" | "neutral";
  topic: string;
  summary: string;
}

const SYSTEM = `You read financial news headlines about one asset and rate how each affects its likely market sentiment.
For every headline return:
- score: integer from -100 (very bearish) to 100 (very bullish) for the asset named. 0 means no clear effect.
- tone: "bull" if score > 20, "bear" if score < -20, otherwise "neutral".
- topic: the single best match from the allowed list.
- summary: one plain sentence (max 140 characters) saying what happened and why it matters.
Rules: judge only what the headline says. Questions, opinion pieces and speculation ("could", "may") score near 0. Do not invent facts and do not give investment advice.`;

const SCHEMA = {
  name: "news_analysis",
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
          required: ["id", "score", "tone", "topic", "summary"],
          properties: {
            id: { type: "string" },
            score: { type: "integer" },
            tone: { type: "string", enum: ["bull", "bear", "neutral"] },
            topic: { type: "string", enum: [...TOPICS] },
            summary: { type: "string" },
          },
        },
      },
    },
  },
} as const;

/** One gpt-5-mini call for all of a community's headlines. Throws on any API or parsing failure. */
export async function analyzeHeadlines(assetName: string, items: HeadlineIn[]): Promise<HeadlineOut[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (!items.length) return [];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      reasoning_effort: "minimal",
      max_completion_tokens: 4000,
      response_format: { type: "json_schema", json_schema: SCHEMA },
      messages: [
        { role: "system", content: SYSTEM },
        { role: "user", content: `Asset: ${assetName}\n\nHeadlines:\n${JSON.stringify(items.map((i) => ({ id: i.id, headline: i.headline, source: i.source })))}` },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);

  const json = await res.json();
  const content = json.choices?.[0]?.message?.content;
  if (!content) throw new Error(`OpenAI returned no content (finish: ${json.choices?.[0]?.finish_reason})`);

  const known = new Set(items.map((i) => i.id));
  return (JSON.parse(content).items as HeadlineOut[])
    .filter((o) => known.has(o.id))
    .map((o) => {
      const score = Math.max(-100, Math.min(100, Math.round(o.score)));
      return { id: o.id, score, tone: score > 20 ? "bull" : score < -20 ? "bear" : "neutral", topic: o.topic, summary: o.summary.slice(0, 200) };
    });
}
