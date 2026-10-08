import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { NewsFeed } from "@/features/news/NewsFeed";
import { getCommunities, getNewsFeed } from "@/lib/api";

export const metadata: Metadata = { title: "News", description: "What happened, why it matters, who could be affected and what investors think." };

export default async function NewsPage() {
  const [entries, communities] = await Promise.all([getNewsFeed(7), getCommunities()]);
  const names = Object.fromEntries(communities.map((c) => [c.slug, c.name]));
  const marketSlugs = communities.filter((c) => c.kind === "market").map((c) => c.slug);
  return (
    <>
      <TopBar title="News" />
      <NewsFeed entries={entries} names={names} marketSlugs={marketSlugs} />
    </>
  );
}
