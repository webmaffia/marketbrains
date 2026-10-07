import type { NewsItem } from "@/types";

export type Tone = "bull" | "bear" | "neutral";

/** Weighted word lists, -3 (very bearish) to +3 (very bullish). Phrases are matched before single words. */
const LEXICON: [RegExp, number][] = [
  [/\b(up|gains?|rises?|jumps?|climbs?|surges?) (by |over |more than )?\d+(\.\d+)?%/i, 2],
  [/\b(down|drops?|falls?|fell|slides?|slid|sinks?|sank|slumps?|plunges?|loses?|lost) (by |over |more than )?\d+(\.\d+)?%/i, -2],
  [/\ball.?time high\b|\brecord (high|profit|revenue|inflows?)\b/i, 3],
  [/\b(surge[sd]?|soar(s|ed|ing)?|skyrocket\w*|rocket\w*|boom(s|ing)?|booming)\b/i, 3],
  [/\b(rall(y|ies|ied)|jump(s|ed)?|breakout|outperform\w*|upgrade[sd]?|beat(s)? (estimates|expectations)|bullish|inflows?|approv(al|es|ed))\b/i, 2],
  [/\b(gain(s|ed)?|rise[sn]?|rising|climb(s|ed)?|raises?|hikes? (dividend|guidance)|growth|grow(s|ing)?|profit\w*|wins?|won|boost\w*|strong|recover\w*|rebound\w*|expands?|partnership|adopt(s|ion|ed)?|launch(es|ed)?|positive|optimis\w*)\b/i, 1],
  [/\b(crash(es|ed)?|collapse[sd]?|plunge[sd]?|tank(s|ed)?|bankrupt\w*|fraud|hack(ed|s)?|exploit(ed)?|rug.?pull|shut(s|ting)? down|delist\w*)\b/i, -3],
  [/\b(slump(s|ed)?|tumble[sd]?|sink(s)?|sank|downgrade[sd]?|miss(es|ed)? (estimates|expectations)|bearish|outflows?|sell-?off|lawsuit|sue[sd]?|probe[sd]?|investigat\w*|ban(s|ned)?|fine[sd]?|layoffs?)\b/i, -2],
  [/\b(fall(s|en)?|fell|drop(s|ped)?|decline[sd]?|loss(es)?|weak\w*|slow(s|er|down|ing)?|cut(s)?|fear(s)?|warn(s|ed|ing)?|risk(s)?|concern(s)?|pressure|struggle[sd]?|negative|worry|worries|uncertain\w*|volatil\w*|trouble)\b/i, -1],
];

const NEGATION = /\b(not|no|never|fails? to|unable to|without|despite|avoids?|averts?|ends?|halts?)\b\s+(\w+\s+){0,2}$/i;

/** What the story is about, so members see why a headline matters, not only its direction. */
const EVENTS: [string, RegExp][] = [
  ["Regulation", /\b(sec|sebi|rbi|regulat\w*|ban|bill|law|policy|compliance|etf|approval|court|tax)\b/i],
  ["Earnings", /\b(earnings?|results?|quarter|q[1-4]|revenue|profit|guidance|margin|eps)\b/i],
  ["Partnership", /\b(partner\w*|deal|acquir\w*|acquisition|merger|collaborat\w*|contract|order)\b/i],
  ["Security", /\b(hack\w*|exploit\w*|breach|attack|stolen|vulnerab\w*|outage)\b/i],
  ["Adoption", /\b(adopt\w*|launch\w*|rollout|integrat\w*|users|institution\w*|treasury|staking)\b/i],
  ["Price move", /\b(price|rall(y|ies)|surge\w*|plunge\w*|drops?|falls?|jumps?|high|low|support|resistance)\b/i],
  ["Legal", /\b(lawsuit|sue[sd]?|probe|investigat\w*|fraud|fine[sd]?)\b/i],
  ["Macro", /\b(fed|inflation|interest rates?|gdp|jobs|recession|tariffs?|dollar|yields?)\b/i],
];

export interface ScoredHeadline {
  id: string;
  headline: string;
  source: string;
  url?: string;
  ageMin: number;
  /** -1 (very bearish) to +1 (very bullish). */
  score: number;
  tone: Tone;
  events: string[];
  /** One-line AI explanation of what happened and why it matters. */
  summary?: string;
  ai: boolean;
}

function scoreText(text: string): number {
  let sum = 0;
  let hits = 0;
  for (const [re, w] of LEXICON) {
    const g = new RegExp(re.source, "gi");
    for (const m of text.matchAll(g)) {
      const before = text.slice(Math.max(0, (m.index ?? 0) - 30), m.index ?? 0);
      sum += NEGATION.test(before) ? -w * 0.8 : w;
      hits += 1;
    }
  }
  if (!hits) return 0;
  let score = Math.tanh(sum / 3);
  // Questions and hedges ("Will X surge?", "could", "may") are speculation, not news.
  if (/\?\s*$/.test(text) || /\b(could|may|might|will .* (surge|crash)|why|should)\b/i.test(text)) score *= 0.45;
  return score;
}

/** Prefers the AI analysis saved by the daily job; falls back to the word-based read for headlines not analysed yet. */
export function scoreHeadline(n: NewsItem): ScoredHeadline {
  const ai = n.analysis;
  const score = ai ? ai.score / 100 : scoreText(n.headline);
  const events = ai?.topic && ai.topic !== "Other" ? [ai.topic] : ai ? [] : EVENTS.filter(([, re]) => re.test(n.headline)).map(([k]) => k).slice(0, 2);
  return { id: n.id, headline: n.headline, source: n.source, url: n.url, ageMin: n.ageMin, score, tone: score > 0.2 ? "bull" : score < -0.2 ? "bear" : "neutral", events, summary: ai?.summary, ai: !!ai };
}

export interface NewsMeter {
  /** -1 to +1, recency-weighted. */
  value: number;
  label: string;
  confidence: "low" | "medium" | "high";
  bull: number;
  bear: number;
  neutral: number;
  total: number;
  items: ScoredHeadline[];
  /** The headlines moving the meter most. */
  drivers: ScoredHeadline[];
  /** Most common story types, with how many headlines. */
  themes: { name: string; count: number }[];
  /** How many headlines were read by the AI rather than by word matching. */
  aiCount: number;
}

const moodLabel = (v: number) => (v > 0.45 ? "Very bullish" : v > 0.15 ? "Leaning bullish" : v < -0.45 ? "Very bearish" : v < -0.15 ? "Leaning bearish" : "Mixed");

/** Reads every headline, weights fresher ones more (half-life 12h) and returns one meter value. */
export function buildNewsMeter(news: NewsItem[]): NewsMeter | null {
  if (news.length < 2) return null;
  const items = news.map(scoreHeadline);
  let num = 0;
  let den = 0;
  for (const i of items) {
    const w = Math.pow(0.5, i.ageMin / 720);
    // Neutral headlines still count as weight so one loud story cannot dominate a quiet day.
    num += i.score * w;
    den += w;
  }
  const value = den ? Math.max(-1, Math.min(1, (num / den) * 1.6)) : 0;
  const bull = items.filter((i) => i.tone === "bull").length;
  const bear = items.filter((i) => i.tone === "bear").length;
  const neutral = items.length - bull - bear;
  const decisive = bull + bear;
  const confidence = items.length >= 8 && decisive >= 4 ? "high" : items.length >= 4 && decisive >= 2 ? "medium" : "low";
  const counts = new Map<string, number>();
  for (const i of items) for (const e of i.events) counts.set(e, (counts.get(e) ?? 0) + 1);
  const themes = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([name, count]) => ({ name, count }));
  const drivers = [...items].filter((i) => i.tone !== "neutral").sort((a, b) => Math.abs(b.score) - Math.abs(a.score)).slice(0, 3);
  return { value, label: moodLabel(value), confidence, bull, bear, neutral, total: items.length, items, drivers, themes, aiCount: items.filter((i) => i.ai).length };
}

