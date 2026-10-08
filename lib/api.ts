/**
 * Data access layer backed by Supabase. Everything here is async and returns plain typed
 * objects. Reads are public (protected by row level security), so these run on the server
 * for pages and in the browser for per-user views alike.
 */
import { BOT_ID } from "@/lib/bot";
import { mapLeaderboardRow, type Period } from "@/lib/leaderboard";
import { groupClusters } from "@/lib/newsIntel";

/** Stories the filter marked generic stay in the database (so they are not fetched again) but are never shown. */
const visible = <T extends { hidden?: boolean }>(items: T[]) => items.filter((n) => !n.hidden);
import { supabase } from "@/lib/supabase";
import { mapAsset, mapComment, mapCommunity, mapNews, mapPost, mapTopic, mapUser, POST_SELECT, USER_SELECT } from "@/lib/mappers";
import type { Asset, Comment, Community, LeaderboardEntry, NewsItem, Post, PublicContact, SentimentCounts, Topic, User } from "@/types";

const FEED_LIMIT = 200;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

function check<T>(res: { data: T | null; error: { message: string } | null }, what: string): T {
  if (res.error) throw new Error(`Failed to load ${what}: ${res.error.message}`);
  return res.data as T;
}

export async function getUsers(): Promise<User[]> {
  const rows = check(await supabase.from("profiles").select(USER_SELECT).order("reputation", { ascending: false }), "people");
  return rows.map(mapUser);
}

export async function getUser(idOrUsername: string): Promise<User | undefined> {
  const byName = check(await supabase.from("profiles").select(USER_SELECT).eq("username", idOrUsername).maybeSingle(), "profile");
  if (byName) return mapUser(byName);
  const byId = check(await supabase.from("profiles").select(USER_SELECT).eq("id", idOrUsername).maybeSingle(), "profile");
  return byId ? mapUser(byId) : undefined;
}

export async function getCommunities(): Promise<Community[]> {
  const rows = check(await supabase.from("communities").select("*").order("members", { ascending: false }), "communities");
  return rows.map(mapCommunity);
}

export async function getCommunity(slug: string): Promise<Community | undefined> {
  if (!SLUG.test(slug)) return undefined;
  const row = check(await supabase.from("communities").select("*").eq("slug", slug).maybeSingle(), "community");
  return row ? mapCommunity(row) : undefined;
}

export async function getAssets(): Promise<Asset[]> {
  return check(await supabase.from("assets").select("*"), "assets").map(mapAsset);
}

export async function getAsset(id?: string): Promise<Asset | undefined> {
  if (!id) return undefined;
  const row = check(await supabase.from("assets").select("*").eq("id", id).maybeSingle(), "asset");
  return row ? mapAsset(row) : undefined;
}

export async function getTopics(): Promise<Topic[]> {
  return check(await supabase.from("topics").select("*").order("name"), "topics").map(mapTopic);
}

const postsQuery = () => supabase.from("posts").select(POST_SELECT).order("created_at", { ascending: false });

export async function getPosts(): Promise<Post[]> {
  return check(await postsQuery().limit(FEED_LIMIT), "discussions").map(mapPost);
}

export async function getPost(id: string): Promise<Post | undefined> {
  const row = check(await supabase.from("posts").select(POST_SELECT).eq("id", id).maybeSingle(), "discussion");
  return row ? mapPost(row) : undefined;
}

export async function getPostsByIds(ids: string[]): Promise<Post[]> {
  if (!ids.length) return [];
  return check(await postsQuery().in("id", ids.slice(0, FEED_LIMIT)), "saved posts").map(mapPost);
}

export async function getPolls(): Promise<Post[]> {
  const rows = check(await supabase.from("posts").select(POST_SELECT.replace("poll:polls(", "poll:polls!inner(")).order("created_at", { ascending: false }).limit(FEED_LIMIT), "polls");
  return rows.map(mapPost);
}

export async function getPostsByCommunity(slug: string): Promise<Post[]> {
  if (!SLUG.test(slug)) return [];
  return check(await postsQuery().or(`community_slug.eq.${slug},topics.cs.{${slug}}`).limit(FEED_LIMIT), "discussions").map(mapPost);
}

export async function getPostsByUser(userId: string): Promise<Post[]> {
  return check(await postsQuery().eq("author_id", userId).limit(FEED_LIMIT), "discussions").map(mapPost);
}

export async function getComments(postId: string): Promise<Comment[]> {
  return check(await supabase.from("comments").select("*").eq("post_id", postId).order("created_at"), "comments").map(mapComment);
}

export async function getNews(slug: string): Promise<NewsItem[]> {
  return groupClusters(visible(check(await supabase.from("news").select("*").eq("community_slug", slug).order("created_at", { ascending: false }), "news").map(mapNews)));
}

export async function getNewsItem(id: string): Promise<NewsItem | undefined> {
  const row = check(await supabase.from("news").select("*").eq("id", id).maybeSingle(), "news");
  return row ? mapNews(row) : undefined;
}

/** Everything published in the last `days` days, across all communities (for the market-wide meter). */
export async function getNewsSince(days: number): Promise<NewsItem[]> {
  const since = new Date(Date.now() - days * 86_400_000).toISOString();
  return groupClusters(visible(check(await supabase.from("news").select("*").gte("created_at", since).order("created_at", { ascending: false }).limit(1000), "news").map(mapNews)));
}

export async function getAllNews(): Promise<NewsItem[]> {
  return groupClusters(visible(check(await supabase.from("news").select("*").order("created_at", { ascending: false }).limit(60), "news").map(mapNews))).slice(0, 30);
}

/** A news event together with the discussion (and poll) opened for it, if any. */
export interface NewsEntry {
  news: NewsItem;
  post?: Post;
}

async function withPosts(items: NewsItem[]): Promise<NewsEntry[]> {
  if (!items.length) return [];
  const rows = check(await supabase.from("posts").select(POST_SELECT).in("news_id", items.map((n) => n.id)).order("created_at", { ascending: false }), "discussions");
  const byNews = new Map<string, Post>();
  for (const r of rows as Record<string, unknown>[]) if (!byNews.has(r.news_id as string)) byNews.set(r.news_id as string, mapPost(r));
  return items.map((news) => ({ news, post: byNews.get(news.id) }));
}

/** The news feed: recent events, one entry per event, newest first. */
export async function getNewsFeed(days = 7): Promise<NewsEntry[]> {
  return withPosts((await getNewsSince(days)).slice(0, 120));
}

/** One event for its detail page, with every outlet that covered it. */
export async function getNewsEntry(id: string): Promise<NewsEntry | undefined> {
  const row = check(await supabase.from("news").select("*").eq("id", id).maybeSingle(), "news") as Record<string, string> | null;
  if (!row) return undefined;
  const clusterId = row.cluster_id ?? row.id;
  const siblings = check(await supabase.from("news").select("*").or(`id.eq.${clusterId},cluster_id.eq.${clusterId}`).order("created_at"), "news").map(mapNews);
  const head = groupClusters(siblings)[0] ?? mapNews(row);
  return (await withPosts([head]))[0];
}

/** Contact details a member chose to make public. Private fields never leave the database. */
export async function getPublicContact(userId: string): Promise<PublicContact> {
  const { data } = await supabase.rpc("public_contact", { p_user: userId });
  const row = Array.isArray(data) ? data[0] : data;
  return { email: row?.email ?? undefined, phone: row?.phone ?? undefined };
}


/** Ranked contributors for a period, optionally limited to one community. */
export async function getLeaderboard(period: Period, community?: string, limit = 50): Promise<LeaderboardEntry[]> {
  const rows = check(await supabase.rpc("leaderboard", { p_period: period, p_community: community ?? null, p_limit: limit }), "the leaderboard");
  return (rows as Record<string, unknown>[]).map(mapLeaderboardRow).filter((r) => r.userId !== BOT_ID);
}

/** Members' one-tap views for a community (bullish / neutral / bearish). */
export async function getSentimentVotes(slug: string): Promise<SentimentCounts> {
  const { data } = await supabase.rpc("sentiment_counts", { p_slug: slug });
  const row = Array.isArray(data) ? data[0] : data;
  return { bull: row?.bull ?? 0, bear: row?.bear ?? 0, neutral: row?.neutral ?? 0 };
}

