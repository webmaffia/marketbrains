/** Row (snake_case, as stored in Supabase) -> app model (camelCase) mappers. */
import type { Asset, Comment, Community, NewsItem, Notification, Poll, Post, Topic, User } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const minutesSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));

export function mapUser(r: Row): User {
  return {
    id: r.id,
    username: r.username,
    name: r.name,
    bio: r.bio ?? "",
    hue: r.hue,
    reputation: r.reputation,
    tier: r.tier,
    followers: r.followers,
    following: r.following,
    contributions: { discussions: r.discussions, comments: r.comments, helpful: r.helpful },
    communities: (r.community_members ?? []).map((m: Row) => m.community_slug),
    verified: r.verified || undefined,
    avatarUrl: r.avatar_url ?? undefined,
    plan: r.plan,
    isAdmin: r.is_admin || undefined,
    socialLinks: r.social_links && Object.keys(r.social_links).length ? r.social_links : undefined,
  };
}

export function mapCommunity(r: Row): Community {
  return {
    slug: r.slug,
    name: r.name,
    kind: r.kind,
    region: r.region,
    tagline: r.tagline,
    hue: r.hue,
    members: r.members,
    discussions: r.discussions,
    assetId: r.asset_id ?? undefined,
    featured: r.featured || undefined,
    logoUrl: r.logo_url ?? undefined,
  };
}

export const mapAsset = (r: Row): Asset => ({
  id: r.id,
  ticker: r.ticker,
  name: r.name,
  exchange: r.exchange,
  region: r.region,
  sector: r.sector,
  about: r.about,
  themes: r.themes ?? [],
});

export const mapTopic = (r: Row): Topic => ({ slug: r.slug, name: r.name, kind: r.kind, description: r.description });

function mapPoll(postId: string, raw: Row | Row[] | null): Poll | undefined {
  const r = Array.isArray(raw) ? raw[0] : raw;
  if (!r) return undefined;
  const options = [...(r.options ?? [])].sort((a: Row, b: Row) => a.position - b.position);
  return {
    id: postId,
    question: r.question,
    endsInHours: r.ends_at ? Math.max(0, Math.ceil((new Date(r.ends_at).getTime() - Date.now()) / 3_600_000)) : undefined,
    options: options.map((o: Row) => ({ id: o.id, label: o.label, votes: o.votes })),
  };
}

export function mapPost(r: Row): Post {
  return {
    id: r.id,
    authorId: r.author_id,
    communitySlug: r.community_slug,
    topics: r.topics ?? [],
    type: r.type,
    stance: r.stance ?? undefined,
    title: r.title,
    body: r.body,
    ageMin: minutesSince(r.created_at),
    likes: r.likes,
    comments: r.comments,
    hasImage: r.has_image || undefined,
    imageUrl: r.image_url ?? undefined,
    poll: mapPoll(r.id, r.poll),
  };
}

export const mapComment = (r: Row): Comment => ({
  id: r.id,
  postId: r.post_id,
  authorId: r.author_id,
  parentId: r.parent_id ?? undefined,
  body: r.body,
  ageMin: minutesSince(r.created_at),
  likes: r.likes,
});

export const mapNews = (r: Row): NewsItem => ({
  id: r.id,
  communitySlug: r.community_slug,
  source: r.source,
  headline: r.headline,
  url: r.url ?? undefined,
  ageMin: minutesSince(r.created_at),
  discussionCount: r.discussion_count,
});

export const mapNotification = (r: Row): Notification => ({
  id: r.id,
  type: r.type,
  actorId: r.actor_id ?? undefined,
  actor: r.actor ? mapUser(r.actor) : undefined,
  text: r.text,
  href: r.href,
  ageMin: minutesSince(r.created_at),
  read: r.read,
});

/** PostgREST select strings shared between server pages and the client store. */
export const POST_SELECT = "*, poll:polls(question, ends_at, options:poll_options(id, label, votes, position))";
export const USER_SELECT = "*, community_members(community_slug)";
