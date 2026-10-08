import type { AffectedStock, NewsIntel, StockRelationship } from "@/types";

const MODEL = "gpt-4o-mini";

export const EVENT_TYPES = [
  "Earnings", "Revenue", "Profit", "Guidance", "Product Launch", "Acquisition", "Merger", "Partnership", "Regulation", "Government Policy",
  "Interest Rates", "Inflation", "Commodity", "Management Change", "Legal", "Contract", "Capacity Expansion", "Fundraising", "IPO",
  "Dividend", "Buyback", "Analyst Action", "Macro", "Geopolitical", "Other",
] as const;

/** One controlled list so sector chips stay consistent. Matches the sectors used on the stock communities. */
export const SECTORS = [
  "Banking", "Financial Services", "Insurance", "IT Services", "Pharma", "Healthcare", "Automobiles", "Consumer", "Consumer Internet", "Retail",
  "Metals", "Mining", "Oil & Gas", "Power", "Telecom", "Infrastructure", "Defence", "Aviation", "Materials", "Conglomerate", "Macro",
] as const;

const RELATIONSHIPS: StockRelationship[] = ["direct", "supplier", "customer", "competitor", "indirect", "sector"];

export interface KnownStock {
  ticker: string;
  name: string;
  slug: string;
}

export interface EnrichInput {
  id: string;
  headline: string;
  source: string;
  /** The article's own text, when it could be fetched. */
  article?: string;
}

export interface Enriched extends NewsIntel {
  id: string;
  /** True when the AI judged the story too generic or off topic to keep. */
  generic: boolean;
}

const SYSTEM = (stocks: KnownStock[]) => `You are the analyst desk of an investor community. For each news story you return a structured reading. Each story has a headline, a source and, when available, the article text.
Fields:
- is_generic: true if the story is not specifically about the main company or index, or adds no new information: a general market wrap, a price prediction or technical levels, a "stocks to buy or watch" list, a promotion, an explainer with no news, or a story about a different company. Otherwise false.
- summary: 70 to 110 words, plain and factual, in your own words. Write it so a reader gets the whole story without opening the article: what happened, who is involved, the key numbers (amounts, percentages, dates), the reason or cause, and what happens next if the article says. Attribute opinions and forecasts to whoever said them ("Brokerage X expects..."). If you only have a headline, write one or two sentences and add nothing you were not told.
- key_points: 3 to 5 short facts from the story (max 25 words each), each concrete: a figure, a date, a name, a decision. Fewer if the story has fewer facts. Empty if you only have a headline.
- why_it_matters: 2 to 4 short points (max 22 words each) on what this means for the business or for investors watching it. Be specific to this story, never generic. Explain relevance; do not forecast a price.
- event_type: one of ${EVENT_TYPES.join(", ")}.
- impact_direction: positive, negative, neutral or mixed, for the main company (the event's effect on its business, not on its share price).
- impact_strength: low, medium or high.
- affected_stocks: up to 6 {ticker, relationship}. relationship is direct, supplier, customer, competitor, indirect or sector. Use ONLY tickers from this list, and only where the story gives a clear, defensible link. The main company is "direct". When unsure, leave it out: ${stocks.map((s) => `${s.ticker} (${s.name})`).join("; ")}.
- affected_sectors: up to 3 from this list only: ${SECTORS.join(", ")}.
- signal_score: integer 0 to 100 for how significant the event is for the main company (a routine mention is under 30; a major earnings surprise, deal or regulatory action is 70 or more).
- signal_confidence: number 0 to 1 for how sure you are of this reading, lower when you only have a headline.
Rules: use only what the story says. Never invent numbers, quotes, names or events. Never address the reader with advice ("investors should..."), never tell readers to buy or sell, never give your own price targets or return forecasts, and never say a stock will rise or fall. You may report what others said, attributed to them.`;

const SCHEMA = {
  name: "news_intel",
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
          required: ["id", "is_generic", "summary", "key_points", "why_it_matters", "event_type", "impact_direction", "impact_strength", "affected_stocks", "affected_sectors", "signal_score", "signal_confidence"],
          properties: {
            id: { type: "string" },
            is_generic: { type: "boolean" },
            summary: { type: "string" },
            key_points: { type: "array", items: { type: "string" } },
            why_it_matters: { type: "array", items: { type: "string" } },
            event_type: { type: "string" },
            impact_direction: { type: "string", enum: ["positive", "negative", "neutral", "mixed"] },
            impact_strength: { type: "string", enum: ["low", "medium", "high"] },
            affected_stocks: {
              type: "array",
              items: { type: "object", additionalProperties: false, required: ["ticker", "relationship"], properties: { ticker: { type: "string" }, relationship: { type: "string" } } },
            },
            affected_sectors: { type: "array", items: { type: "string" } },
            signal_score: { type: "integer" },
            signal_confidence: { type: "number" },
          },
        },
      },
    },
  },
} as const;

/**
 * What we will not publish as our own words: directives, guarantees and our own forecasts.
 * Reporting what a brokerage said ("rated Buy by X", "target price of Rs 3,000") is news, so it is allowed.
 */
const ADVICE = /\b((you|investors?|traders?|readers?) (should|must|need to|ought to)|we recommend|we advise|accumulate|book profits?|guaranteed|multibagger|(will|is set to|is going to) (rise|fall|surge|crash|soar|tank|jump|double|go up|go down)|expected return)\b/i;

const words = (s: string) => s.trim().split(/\s+/).filter(Boolean).length;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Never trust raw model output: returns null when anything essential is missing or breaks a rule. */
export function validateEnrichment(raw: unknown, known: KnownStock[]): Enriched | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const generic = r.is_generic === true;
  const summary = typeof r.summary === "string" ? r.summary.trim() : "";
  const strings = (v: unknown, max: number) => (Array.isArray(v) ? v.filter((w): w is string => typeof w === "string").map((w) => w.trim()).filter(Boolean).slice(0, max) : []);
  // A point that talks to the reader ("investors should...") is dropped on its own; too few left rejects the story.
  const why = strings(r.why_it_matters, 4).filter((w) => !ADVICE.test(w));
  // A bullet that breaks the rules is dropped on its own; the summary breaking them rejects the whole item.
  const keyPoints = strings(r.key_points, 5).filter((k) => !ADVICE.test(k));
  if (!id) return null;
  if (!generic && (words(summary) < 8 || words(summary) > 150 || why.length < 2 || ADVICE.test(summary))) return null;

  const byTicker = new Map(known.map((k) => [k.ticker.toUpperCase(), k] as const));
  const seen = new Set<string>();
  const stocks: AffectedStock[] = [];
  for (const s of Array.isArray(r.affected_stocks) ? (r.affected_stocks as Record<string, unknown>[]) : []) {
    const k = byTicker.get(String(s?.ticker ?? "").toUpperCase());
    const rel = String(s?.relationship ?? "").toLowerCase() as StockRelationship;
    if (!k || seen.has(k.ticker) || !RELATIONSHIPS.includes(rel)) continue;
    seen.add(k.ticker);
    stocks.push({ ticker: k.ticker, relationship: rel, slug: k.slug, name: k.name });
    if (stocks.length === 6) break;
  }

  const sectorSet = new Set<string>(SECTORS);
  const sectors = (Array.isArray(r.affected_sectors) ? r.affected_sectors : []).filter((x): x is string => typeof x === "string" && sectorSet.has(x)).slice(0, 3);
  const eventType = EVENT_TYPES.includes(r.event_type as (typeof EVENT_TYPES)[number]) ? (r.event_type as string) : "Other";
  const dir = ["positive", "negative", "neutral", "mixed"].includes(String(r.impact_direction)) ? (r.impact_direction as NewsIntel["direction"]) : "neutral";
  const strength = ["low", "medium", "high"].includes(String(r.impact_strength)) ? (r.impact_strength as NewsIntel["strength"]) : "low";

  return {
    id,
    generic,
    summary,
    keyPoints,
    whyItMatters: why,
    eventType,
    direction: dir,
    strength,
    signalScore: Math.round(clamp(Number(r.signal_score) || 0, 0, 100)),
    signalConfidence: Math.round(clamp(Number(r.signal_confidence) || 0, 0, 1) * 100) / 100,
    stocks,
    sectors,
  };
}

/** One call for a handful of stories about the same asset. Throws on any API or parsing failure; items that fail validation are skipped. */
export async function enrichHeadlines(assetName: string, items: EnrichInput[], known: KnownStock[]): Promise<Enriched[]> {
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
        { role: "system", content: SYSTEM(known) },
        { role: "user", content: `Main company or index: ${assetName}\n\nStories:\n${JSON.stringify(items)}` },
      ],
    }),
    signal: AbortSignal.timeout(55000),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const content = (await res.json()).choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content");
  const ids = new Set(items.map((i) => i.id));
  const list = (JSON.parse(content) as { items?: unknown[] }).items ?? [];
  return list.map((x) => validateEnrichment(x, known)).filter((x): x is Enriched => !!x && ids.has(x.id));
}

// ---- duplicate coverage -------------------------------------------------------------------------------------------

const STOP = new Set("the a an and or of to in on for at by with from as is are was were be been it its this that after over amid into new says say said will could may stock stocks share shares india indian news today live update updates".split(" "));

export function tokens(headline: string, assetName: string): Set<string> {
  const own = new Set(assetName.toLowerCase().split(/\W+/));
  const out = new Set<string>();
  for (const w of headline.toLowerCase().replace(/[^a-z0-9% ]+/g, " ").split(/\s+/)) if (w.length > 2 && !STOP.has(w) && !own.has(w)) out.add(w);
  return out;
}

/** Overlap of two headlines' key words. High when two outlets describe the same event. */
export function similarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return Math.max(shared / (a.size + b.size - shared), shared / Math.min(a.size, b.size) - 0.15);
}

export const SAME_EVENT = 0.55;

/** The existing story this headline duplicates, or null when it is a new event. */
export function findDuplicate<T extends { id: string; headline: string }>(headline: string, assetName: string, recent: T[]): T | null {
  const mine = tokens(headline, assetName);
  let best: T | null = null;
  let bestScore = 0;
  for (const r of recent) {
    const score = similarity(mine, tokens(r.headline, assetName));
    if (score >= SAME_EVENT && score > bestScore) {
      best = r;
      bestScore = score;
    }
  }
  return best;
}

/** Collapses stories that share a cluster into one item, keeping every outlet in `sources`. Order is preserved. */
export function groupClusters<T extends { id: string; clusterId?: string; source: string; url?: string; ageMin: number }>(items: T[]): (T & { sources: { source: string; url?: string }[] })[] {
  const groups = new Map<string, T[]>();
  for (const n of items) {
    const k = n.clusterId ?? n.id;
    groups.set(k, [...(groups.get(k) ?? []), n]);
  }
  return [...groups.entries()].map(([k, list]) => {
    const head = list.find((n) => n.id === k) ?? [...list].sort((a, b) => b.ageMin - a.ageMin)[0];
    const seen = new Set<string>();
    const sources = list.filter((n) => (seen.has(n.source) ? false : (seen.add(n.source), true))).map((n) => ({ source: n.source, url: n.url }));
    return { ...head, sources };
  });
}
