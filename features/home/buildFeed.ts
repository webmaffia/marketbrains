import type { Community, NewsItem, Post } from "@/types";

export interface SentimentSummary {
  community: Community;
  bull: number;
  bear: number;
  neutral: number;
  total: number;
}

export type FeedItem =
  | { key: string; kind: "post"; post: Post }
  | { key: string; kind: "suggested"; communities: Community[] }
  | { key: string; kind: "sentiment"; sentiment: SentimentSummary }
  | { key: string; kind: "news"; items: NewsItem[] };

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

/** Tallies each community's bull/bear/neutral posts so we can show a sentiment pulse without a dedicated data field. */
export function communitySentiments(posts: Post[], communities: Community[]): SentimentSummary[] {
  const bySlug = new Map<string, { bull: number; bear: number; neutral: number }>();
  for (const p of posts) {
    if (!p.stance) continue;
    const counts = bySlug.get(p.communitySlug) ?? { bull: 0, bear: 0, neutral: 0 };
    counts[p.stance] += 1;
    bySlug.set(p.communitySlug, counts);
  }
  const communityBySlug = new Map(communities.map((c) => [c.slug, c] as const));
  return [...bySlug.entries()]
    .map(([slug, counts]) => {
      const community = communityBySlug.get(slug);
      const total = counts.bull + counts.bear + counts.neutral;
      return community && total >= 2 ? { community, ...counts, total } : null;
    })
    .filter((v): v is SentimentSummary => v !== null)
    .sort((a, b) => b.total - a.total);
}

/**
 * Builds the pool of full-width "extra" cards (suggestions, sentiment, news), round-robined together.
 * Capped to `budget` so a small post list doesn't get buried under a pile of these at the tail.
 */
function buildExtras(communities: Community[], sentiments: SentimentSummary[], news: NewsItem[], budget: number): FeedItem[] {
  const sentimentSlugs = new Set(sentiments.map((s) => s.community.slug));
  const suggestChunks = chunk(
    communities.filter((c) => !sentimentSlugs.has(c.slug)),
    3,
  );
  const newsChunks = chunk(news, 3);

  const pools: FeedItem[][] = [
    suggestChunks.map((cs, i) => ({ key: `suggested-${i}`, kind: "suggested", communities: cs })),
    sentiments.map((s) => ({ key: `sentiment-${s.community.slug}`, kind: "sentiment", sentiment: s })),
    newsChunks.filter((n) => n.length).map((n, i) => ({ key: `news-${i}`, kind: "news", items: n })),
  ];
  const extras: FeedItem[] = [];
  for (let i = 0; extras.length < budget && pools.some((p) => p.length); i++) {
    const pool = pools[i % pools.length];
    const next = pool.shift();
    if (next) extras.push(next);
  }
  return extras;
}

/** Interleaves suggested communities, sentiment pulses and news digests through the post list, app-feed style. */
export function buildMixedFeed(posts: Post[], communities: Community[], news: NewsItem[]): FeedItem[] {
  const sentiments = communitySentiments(posts, communities);
  // Scale how many extra cards get pulled in to the feed length, so a short feed doesn't end in
  // a pile of leftover suggestion/sentiment/news cards with nowhere left to go.
  const budget = posts.length < 6 ? 4 : Math.max(1, Math.floor(posts.length / 4));
  const extras = buildExtras(communities, sentiments, news, budget);

  const items: FeedItem[] = [];

  // A young community has few posts, so lead with the day's news instead of burying it at the tail.
  if (posts.length < 6) {
    const lead = extras.filter((e) => e.kind === "news");
    const rest = extras.filter((e) => e.kind !== "news");
    items.push(...lead, ...posts.map((post): FeedItem => ({ key: `post-${post.id}`, kind: "post", post })), ...rest);
    return items;
  }

  let extraI = 0;
  let sincePlaced = 0; // posts placed since the last extra card

  posts.forEach((post) => {
    items.push({ key: `post-${post.id}`, kind: "post", post });
    sincePlaced++;
    if (sincePlaced >= 4 && extras[extraI]) {
      items.push(extras[extraI]);
      extraI++;
      sincePlaced = 0;
    }
  });
  // Any extras left over (feed ended before they fit) still render fine at the tail.
  while (extras[extraI]) items.push(extras[extraI++]);
  return items;
}
