/**
 * Data access layer. Everything here is async and returns plain typed objects,
 * so swapping the mock arrays for real HTTP calls only touches this file.
 */
import { assets } from "@/data/assets";
import { communities } from "@/data/communities";
import { comments, news, notifications, posts } from "@/data/posts";
import { topics } from "@/data/topics";
import { users } from "@/data/users";
import type { Asset, Comment, Community, NewsItem, Notification, Post, Topic, User } from "@/types";

export async function getUsers(): Promise<User[]> {
  return users;
}
export async function getUser(idOrUsername: string): Promise<User | undefined> {
  return users.find((u) => u.id === idOrUsername || u.username === idOrUsername);
}
export async function getCommunities(): Promise<Community[]> {
  return communities;
}
export async function getCommunity(slug: string): Promise<Community | undefined> {
  return communities.find((c) => c.slug === slug);
}
export async function getAsset(id?: string): Promise<Asset | undefined> {
  return assets.find((a) => a.id === id);
}
export async function getTopics(): Promise<Topic[]> {
  return topics;
}
export async function getPosts(): Promise<Post[]> {
  return posts;
}
export async function getPost(id: string): Promise<Post | undefined> {
  return posts.find((p) => p.id === id);
}
export async function getPolls(): Promise<Post[]> {
  return posts.filter((p) => !!p.poll);
}
export async function getPostsByCommunity(slug: string): Promise<Post[]> {
  return posts.filter((p) => p.communitySlug === slug || p.topics.includes(slug));
}
export async function getPostsByUser(userId: string): Promise<Post[]> {
  return posts.filter((p) => p.authorId === userId);
}
export async function getComments(postId: string): Promise<Comment[]> {
  return comments.filter((c) => c.postId === postId);
}
export async function getNotifications(): Promise<Notification[]> {
  return notifications;
}
export async function getNews(slug: string): Promise<NewsItem[]> {
  return news.filter((n) => n.communitySlug === slug);
}
export async function getAllNews(): Promise<NewsItem[]> {
  return news;
}
