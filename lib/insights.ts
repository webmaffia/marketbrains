import type { Post, Stance } from "@/types";

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

export function buildInsights(name: string, posts: Post[], changePct?: number | null): Insights {
  // 1. Objectives: every discussion votes for the intents its text matches, weighted by engagement.
  const scores = new Map<string, { score: number; count: number }>();
  for (const p of posts) {
    const w = engagement(p);
    const hit = INTENTS.filter((i) => i.words.test(text(p)));
    for (const i of hit.length ? hit : []) {
      const cur = scores.get(i.id) ?? { score: 0, count: 0 };
      scores.set(i.id, { score: cur.score + w / hit.length, count: cur.count + 1 });
    }
  }
  const sum = [...scores.values()].reduce((a, b) => a + b.score, 0) || 1;
  const objectives = INTENTS.filter((i) => scores.has(i.id))
    .map((i) => ({ id: i.id, label: i.label, hint: i.hint, share: Math.round((scores.get(i.id)!.score / sum) * 100), count: scores.get(i.id)!.count }))
    .sort((a, b) => b.share - a.share)
    .slice(0, 3);

  // 2. Sentiment now versus before.
  const recentPosts = posts.filter((p) => p.ageMin <= 7 * DAY);
  const earlierPosts = posts.filter((p) => p.ageMin > 7 * DAY && p.ageMin <= 37 * DAY);
  const recent = outlook(recentPosts, "Last 7 days");
  const earlier = outlook(earlierPosts, "Before that");

  // 3. Milestones: the moments that shaped the conversation, newest first.
  const href = (p: Post) => `/community/${p.communitySlug}/post/${p.id}`;
  const ms: Milestone[] = [];
  const first = <T,>(a: T[]) => a[0];
  const byAge = (a: Post, b: Post) => a.ageMin - b.ageMin;

  const results = first(posts.filter((p) => p.type === "earnings").sort(byAge));
  if (results) ms.push({ id: "m-res", kind: "results", title: "Results discussed", detail: results.title, ageMin: results.ageMin, stance: results.stance, href: href(results) });

  const news = first(posts.filter((p) => p.type === "news").sort(byAge));
  if (news) ms.push({ id: "m-news", kind: "news", title: "News reaction", detail: news.title, ageMin: news.ageMin, stance: news.stance, href: href(news) });

  const poll = first(posts.filter((p) => p.poll).sort(byAge));
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

  const milestones = ms.sort((a, b) => a.ageMin - b.ageMin).slice(0, 5);

  // 4. What members think versus what the market actually did.
  let reality: Reality | null = null;
  if (changePct != null && recent.total >= 2) {
    const thinks = recent.net > 0.12 ? "bullish" : recent.net < -0.12 ? "bearish" : "mixed";
    const moved = changePct > 0.3 ? "up" : changePct < -0.3 ? "down" : "flat";
    const agree = (thinks === "bullish" && moved === "up") || (thinks === "bearish" && moved === "down") || (thinks === "mixed" && moved === "flat");
    const against = (thinks === "bullish" && moved === "down") || (thinks === "bearish" && moved === "up");
    const pct = `${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}%`;
    reality = agree
      ? { verdict: "aligned", title: "Members and market agree", text: `Members are ${thinks} and the price is ${moved === "flat" ? "flat" : moved} ${pct} today.` }
      : against
        ? { verdict: "diverging", title: "Members and market disagree", text: `Members are ${thinks}, but the price is ${moved} ${pct} today. Worth reading why before following the crowd.` }
        : { verdict: "unclear", title: "No clear signal yet", text: `Members are ${thinks}; the price moved ${pct} today.` };
  }

  // 5. Recurring worries and open questions.
  const seen = new Map<string, number>();
  for (const p of posts) for (const m of text(p).match(CONCERNS) ?? []) seen.set(m.toLowerCase(), (seen.get(m.toLowerCase()) ?? 0) + 1);
  const concerns = [...seen.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);
  const asks = posts.filter((p) => p.type === "question").sort((a, b) => engagement(b) - engagement(a)).slice(0, 3);

  // 6. One combined read of everything above.
  const parts: string[] = [];
  if (!posts.length) parts.push(`There is not enough discussion about ${name} to summarise yet.`);
  else {
    const total = outlook(posts, "All");
    parts.push(`${posts.length} discussions about ${name}${objectives[0] ? `, mainly members ${objectives[0].label.toLowerCase()}` : ""}.`);
    parts.push(`Overall mood is ${total.label.toLowerCase()} (${total.bull} bullish, ${total.neutral} neutral, ${total.bear} bearish).`);
    if (recent.total >= 2 && earlier.total >= 2) parts.push(recent.net > earlier.net + 0.12 ? "Sentiment is improving versus earlier." : recent.net < earlier.net - 0.12 ? "Sentiment is weakening versus earlier." : "Sentiment is steady.");
    if (concerns.length) parts.push(`Members keep raising ${concerns.slice(0, 3).join(", ")}.`);
    if (reality) parts.push(reality.text);
    if (asks.length) parts.push(`${asks.length} open ${asks.length === 1 ? "question is" : "questions are"} waiting for answers.`);
  }

  return { objectives, milestones, recent, earlier, reality, concerns, asks, summary: parts.join(" ") };
}
