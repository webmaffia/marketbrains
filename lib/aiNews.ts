const MODEL = "gpt-4o-mini";

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

/** One gpt-4o-mini call for all of a community's headlines. Throws on any API or parsing failure. */
export async function analyzeHeadlines(assetName: string, items: HeadlineIn[]): Promise<HeadlineOut[]> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  if (!items.length) return [];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.2,
      max_tokens: 2000,
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

export interface DiscussionOut {
  title: string;
  body: string;
  comment: string;
}

const DISCUSSION_SYSTEM = `You write a discussion starter for an investing community, based on one news headline about one asset.
Return:
- title: 8 to 120 characters. A neutral, specific question or statement that invites discussion. No hype, no emojis, no all caps.
- body: 2 to 3 plain sentences: what happened, why it may matter, and what to watch. End with a question for members.
- comment: starts with "Key points:" then 2 or 3 short lines each beginning with "- ", then a final line starting "Question for members:". Max 600 characters.
Rules: use only what the headline and summary say. Never invent numbers, quotes or events. No predictions, no price targets, no buy or sell advice.`;

const DISCUSSION_SCHEMA = {
  name: "news_discussion",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: ["title", "body", "comment"],
    properties: { title: { type: "string" }, body: { type: "string" }, comment: { type: "string" } },
  },
} as const;

/** One gpt-4o-mini call that turns a single headline into a discussion post plus a first comment. */
export async function writeDiscussion(assetName: string, headline: string, summary: string | null): Promise<DiscussionOut> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not set");
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.4,
      max_tokens: 900,
      response_format: { type: "json_schema", json_schema: DISCUSSION_SCHEMA },
      messages: [
        { role: "system", content: DISCUSSION_SYSTEM },
        { role: "user", content: `Asset: ${assetName}\nHeadline: ${headline}${summary ? `\nSummary: ${summary}` : ""}` },
      ],
    }),
    signal: AbortSignal.timeout(45000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const content = (await res.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  const out = JSON.parse(content) as DiscussionOut;
  const title = out.title.trim().slice(0, 140);
  if (title.length < 8) throw new Error("Title too short");
  return { title, body: out.body.trim().slice(0, 1500), comment: out.comment.trim().slice(0, 1200) };
}
