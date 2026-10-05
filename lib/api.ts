/**
 * Data access layer backed by Supabase. Everything here is async and returns plain typed
 * objects. Reads are public (protected by row level security), so these run on the server
 * for pages and in the browser for per-user views alike.
 */
import { supabase } from "@/lib/supabase";
import { mapAsset, mapComment, mapCommunity, mapNews, mapPost, mapTopic, mapUser, POST_SELECT, USER_SELECT } from "@/lib/mappers";
import type { Asset, Comment, Community, NewsItem, Post, Topic, User } from "@/types";

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
  return check(await supabase.from("news").select("*").eq("community_slug", slug).order("created_at", { ascending: false }), "news").map(mapNews);
}

export async function getAllNews(): Promise<NewsItem[]> {
  return check(await supabase.from("news").select("*").order("created_at", { ascending: false }).limit(30), "news").map(mapNews);
}
