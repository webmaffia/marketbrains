import type { NewsItem, Post, Stance } from "@/types";
import { buildNewsMeter, WEEK_MIN } from "@/lib/newsSentiment";

/** Sections built from community data stay hidden until there is at least this much to read. */
export const MIN_DATA = 10;

const DAY = 24 * 60;
const engagement = (p: Post) => 1 + p.likes + p.comments * 2;

export interface Objective {
  id: string;
  label: string;
  hint: string;
  share: number;
  count: number;
}

export interface Milestone {
  id: string;
  kind: "results" | "news" | "poll" | "peak" | "shift" | "question";
  title: string;
  detail: string;
  ageMin: number;
  stance?: Stance;
  href?: string;
  /** True when href leaves the site (a news article). */
  external?: boolean;
}

export interface Outlook {
  window: string;
  net: number;
  bull: number;
  bear: number;
  neutral: number;
  total: number;
  label: string;
}

export interface Reality {
  verdict: "aligned" | "diverging" | "unclear";
  title: string;
  text: string;
}

export interface Insights {
  objectives: Objective[];
  milestones: Milestone[];
  recent: Outlook;
  earlier: Outlook;
  /** Tone of the news headlines, read from the words used. Not a member opinion. */
  newsTone: Outlook | null;
  reality: Reality | null;
  concerns: string[];
  asks: Post[];
  summary: string;
}

/** What members are trying to get done, inferred from the words in their discussions. */
const INTENTS: { id: string; label: string; hint: string; words: RegExp }[] = [
  { id: "entry", label: "Deciding to buy or sell", hint: "Entry, exit, targets and position sizing", words: /\b(buy|sell|entry|exit|target|stop.?loss|accumulate|add|book|profit|position|breakout|support|resistance|hold)\b/i },
  { id: "results", label: "Understanding results", hint: "Earnings, margins, guidance and management commentary", words: /\b(results?|earnings?|q[1-4]|quarter|revenue|margin|profit|eps|guidance|management|call|growth)\b/i },
  { id: "news", label: "Tracking news and catalysts", hint: "Announcements, deals, policy and events moving the price", words: /\b(news|announce|launch|deal|order|policy|regulat|rbi|sebi|fed|rate|approval|merger|acquisition|ban|etf)\b/i },
  { id: "value", label: "Judging long-term value", hint: "Valuation, moat, fundamentals and holding for years", words: /\b(valuation|pe|p\/e|moat|long.?term|fundamental|undervalued|overvalued|dividend|compounder|fair value|years?)\b/i },
  { id: "risk", label: "Managing risk", hint: "Downside, volatility, debt and what could go wrong", words: /\b(risk|fall|crash|drop|debt|downside|volatil|weak|concern|fear|correction|loss|worried?|trap)\b/i },
  { id: "learn", label: "Learning and clarifying", hint: "Questions, explanations and how things work", words: /\b(why|how|what|explain|understand|should i|can someone|help|beginner|confused)\b|\?/i },
];

const CONCERNS = /\b(debt|valuation|competition|regulat\w*|margin pressure|slowdown|delay\w*|volatil\w*|dilution|inflation|rate hike|weak demand|downgrade|lawsuit|selling pressure)\b/gi;


const text = (p: Post) => `${p.title} ${p.body}`;

function outlook(posts: Post[], window: string): Outlook {
  const c = { bull: 0, bear: 0, neutral: 0 };
  for (const p of posts) if (p.stance) c[p.stance] += 1;
  const total = c.bull + c.bear + c.neutral;
  const net = total ? (c.bull - c.bear) / total : 0;
  const label = total < 2 ? "Not enough views" : net > 0.4 ? "Very bullish" : net > 0.12 ? "Leaning bullish" : net < -0.4 ? "Very bearish" : net < -0.12 ? "Leaning bearish" : "Mixed";
  return { window, net, ...c, total, label };
}

/** Headline tone, from the same news meter shown on the News tab. */
function headlineTone(news: NewsItem[]): Outlook | null {
  const m = buildNewsMeter(news, WEEK_MIN);
  if (!m) return null;
  return { window: "News headlines", net: m.value, bull: m.bull, bear: m.bear, neutral: m.neutral, total: m.total, label: m.label };
}

export function buildInsights(name: string, posts: Post[], news: NewsItem[], changePct?: number | null): Insights {
  // 1. Objectives: every discussion and headline votes for the intents its text matches; discussions are weighted by engagement.
  const scores = new Map<string, { score: number; count: number }>();
  const vote = (hit: typeof INTENTS, weight: number) => {
    for (const i of hit) {
      const cur = scores.get(i.id) ?? { score: 0, count: 0 };
      scores.set(i.id, { score: cur.score + weight / hit.length, count: cur.count + 1 });
    }
  };
  for (const p of posts) vote(INTENTS.filter((i) => i.words.test(text(p))), engagement(p));
  for (const n of news) vote(INTENTS.filter((i) => i.words.test(n.headline)), 2);
  const sum = [...scores.values()].reduce((a, b) => a + b.score, 0) || 1;
  const objectives = INTENTS.filter((i) => scores.has(i.id))
    .map((i) => ({ id: i.id, label: i.label, hint: i.hint, share: Math.round((scores.get(i.id)!.score / sum) * 100), count: scores.get(i.id)!.count }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 3);

  // 2. Sentiment now versus before, plus the tone of the headlines.
  const recent = outlook(posts.filter((p) => p.ageMin <= 7 * DAY), "Members, last 7 days");
  const earlier = outlook(posts.filter((p) => p.ageMin > 7 * DAY && p.ageMin <= 37 * DAY), "Members, before that");
  const newsTone = headlineTone(news);

  // 3. Milestones: the moments that shaped the conversation, newest first.
  const href = (p: Post) => `/community/${p.communitySlug}/post/${p.id}`;
  const ms: Milestone[] = [];
  const byAge = (a: Post, b: Post) => a.ageMin - b.ageMin;

  const results = posts.filter((p) => p.type === "earnings").sort(byAge)[0];
  if (results) ms.push({ id: "m-res", kind: "results", title: "Results discussed", detail: results.title, ageMin: results.ageMin, stance: results.stance, href: href(results) });

  const reaction = posts.filter((p) => p.type === "news").sort(byAge)[0];
  if (reaction) ms.push({ id: "m-react", kind: "news", title: "News reaction", detail: reaction.title, ageMin: reaction.ageMin, stance: reaction.stance, href: href(reaction) });

  for (const n of [...news].sort((a, b) => a.ageMin - b.ageMin).slice(0, 2)) {
    ms.push({ id: `m-${n.id}`, kind: "news", title: `Headline · ${n.source}`, detail: n.headline, ageMin: n.ageMin, href: n.url, external: true });
  }

  const poll = posts.filter((p) => p.poll).sort(byAge)[0];
  if (poll?.poll) {
    const top = [...poll.poll.options].sort((a, b) => b.votes - a.votes)[0];
    const votes = poll.poll.options.reduce((a, o) => a + o.votes, 0);
    ms.push({ id: "m-poll", kind: "poll", title: "Members voted", detail: `${poll.poll.question}${top && votes ? ` Leading: ${top.label} (${Math.round((top.votes / votes) * 100)}%)` : ""}`, ageMin: poll.ageMin, href: href(poll) });
  }

  const peak = [...posts].sort((a, b) => engagement(b) - engagement(a))[0];
  if (peak && peak.likes + peak.comments > 0) ms.push({ id: "m-peak", kind: "peak", title: "Most talked about", detail: `${peak.title} (${peak.likes} likes, ${peak.comments} comments)`, ageMin: peak.ageMin, stance: peak.stance, href: href(peak) });

  if (recent.total >= 2 && earlier.total >= 2 && Math.abs(recent.net - earlier.net) >= 0.25) {
    const up = recent.net > earlier.net;
    ms.push({ id: "m-shift", kind: "shift", title: up ? "Mood turned more bullish" : "Mood turned more bearish", detail: `${earlier.label} before, ${recent.label.toLowerCase()} this week`, ageMin: 0 });
  }

  const milestones = ms.sort((a, b) => a.ageMin - b.ageMin).slice(0, 6);

  // 4. What people think versus what the market actually did. Falls back to headline tone when no members have voiced a view.
  let reality: Reality | null = null;
  const view = recent.total >= 2 ? { net: recent.net, who: "Members" } : newsTone ? { net: newsTone.net, who: "Headlines" } : null;
  if (changePct != null && view) {
    const thinks = view.net > 0.12 ? "bullish" : view.net < -0.12 ? "bearish" : "mixed";
    const moved = changePct > 0.3 ? "up" : changePct < -0.3 ? "down" : "flat";
    const agree = (thinks === "bullish" && moved === "up") || (thinks === "bearish" && moved === "down") || (thinks === "mixed" && moved === "flat");
    const against = (thinks === "bullish" && moved === "down") || (thinks === "bearish" && moved === "up");
    const pct = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
    const who = view.who;
    reality = agree
      ? { verdict: "aligned", title: `${who} and market agree`, text: `${who} read ${thinks} and the price is ${moved === "flat" ? "flat" : moved} ${pct} today.` }
      : against
        ? { verdict: "diverging", title: `${who} and market disagree`, text: `${who} read ${thinks}, but the price is ${moved} ${pct} today. Worth checking why before following the crowd.` }
        : { verdict: "unclear", title: "No clear signal yet", text: `${who} read ${thinks}; the price moved ${pct} today.` };
  }

  // 5. Recurring worries and open questions.
  const seen = new Map<string, number>();
  const count = (s: string) => {
    for (const m of s.match(CONCERNS) ?? []) seen.set(m.toLowerCase(), (seen.get(m.toLowerCase()) ?? 0) + 1);
  };
  for (const p of posts) count(text(p));
  for (const n of news) count(n.headline);
  const concerns = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  const asks = posts.filter((p) => p.type === "question").sort((a, b) => engagement(b) - engagement(a)).slice(0, 3);

  // 6. One combined read of everything above.
  const parts: string[] = [];
  if (!posts.length && !news.length) parts.push(`There is not enough activity about ${name} to summarise yet.`);
  else {
    const counts = [posts.length && `${posts.length} ${posts.length === 1 ? "discussion" : "discussions"}`, news.length && `${news.length} news ${news.length === 1 ? "story" : "stories"}`].filter(Boolean).join(" and ");
    parts.push(`${counts} about ${name}${objectives[0] ? `, centred on ${objectives[0].label.toLowerCase()}` : ""}.`);
    const all = outlook(posts, "All");
    if (all.total >= 2) parts.push(`Members are ${all.label.toLowerCase()} (${all.bull} bullish, ${all.neutral} neutral, ${all.bear} bearish).`);
    if (newsTone) parts.push(`News sentiment is ${newsTone.label.toLowerCase()} (${newsTone.bull} positive, ${newsTone.neutral} neutral, ${newsTone.bear} negative).`);
    if (recent.total >= 2 && earlier.total >= 2) parts.push(recent.net > earlier.net + 0.12 ? "Member sentiment is improving versus earlier." : recent.net < earlier.net - 0.12 ? "Member sentiment is weakening versus earlier." : "Member sentiment is steady.");
    if (concerns.length) parts.push(`Recurring concerns: ${concerns.slice(0, 3).join(", ")}.`);
    if (reality) parts.push(reality.text);
    if (asks.length) parts.push(`${asks.length} open ${asks.length === 1 ? "question is" : "questions are"} waiting for answers.`);
    if (!posts.length) parts.push("No member discussion yet, so this reflects the news only.");
  }

  return { objectives, milestones, recent, earlier, newsTone, reality, concerns, asks, summary: parts.join(" ") };
}
