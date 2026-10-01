export type Region = "india" | "us" | "crypto" | "global";
export type Plan = "free" | "pro";
export type Stance = "bull" | "bear" | "neutral";
export type PostType = "opinion" | "question" | "discussion" | "news" | "earnings" | "poll";

export interface User {
  id: string;
  username: string;
  name: string;
  bio: string;
  hue: number;
  reputation: number;
  tier: string;
  followers: number;
  following: number;
  contributions: { discussions: number; comments: number; helpful: number };
  communities: string[];
  verified?: boolean;
}

export interface Asset {
  id: string;
  ticker: string;
  name: string;
  exchange: "NSE" | "BSE" | "NYSE" | "NASDAQ" | "CRYPTO";
  region: Region;
  sector: string;
  about: string;
  themes: string[];
}

export type TopicKind = "sector" | "theme" | "topic";
export interface Topic {
  slug: string;
  name: string;
  kind: TopicKind;
  description: string;
}

export type CommunityKind = "asset" | "market" | "sector" | "theme" | "topic";
export interface Community {
  slug: string;
  name: string;
  kind: CommunityKind;
  region: Region;
  tagline: string;
  hue: number;
  members: number;
  discussions: number;
  assetId?: string;
  featured?: boolean;
}

export interface PollOption {
  id: string;
  label: string;
  votes: number;
}
export interface Poll {
  id: string;
  question: string;
  options: PollOption[];
  endsInHours: number;
}

export interface Post {
  id: string;
  authorId: string;
  communitySlug: string;
  topics: string[];
  type: PostType;
  stance?: Stance;
  title: string;
  body: string;
  ageMin: number;
  likes: number;
  comments: number;
  poll?: Poll;
  hasImage?: boolean;
}

export interface Comment {
  id: string;
  postId: string;
  authorId: string;
  parentId?: string;
  body: string;
  ageMin: number;
  likes: number;
}

export type NotificationType = "like" | "comment" | "reply" | "follow" | "mention" | "community";
export interface Notification {
  id: string;
  type: NotificationType;
  actorId?: string;
  text: string;
  href: string;
  ageMin: number;
  read?: boolean;
}

export interface NewsItem {
  id: string;
  communitySlug: string;
  source: string;
  headline: string;
  ageMin: number;
  discussionCount: number;
}

/** Lookup tables handed to client components so they can resolve ids without importing mock data. */
export interface Directory {
  users: Record<string, User>;
  communities: Record<string, Community>;
}
