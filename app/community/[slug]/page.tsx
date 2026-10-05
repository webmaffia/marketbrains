import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { CommunityView } from "@/features/community/CommunityView";
import { getAsset, getCommunity, getLeaderboard, getSentimentVotes, getNews, getPostsByCommunity, getUsers } from "@/lib/api";
import { getDirectory } from "@/lib/directory";
import { getQuote } from "@/lib/prices";

export async function generateMetadata({ params }: PageProps<"/community/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c) return {};
  const title = `${c.name} community`;
  const description = `${c.tagline} Join ${c.members.toLocaleString("en-US")} members discussing ${c.name} on MarketBrains.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", url: `/community/${slug}` },
    twitter: { card: "summary", title, description },
    alternates: { canonical: `/community/${slug}` },
  };
}

export default async function CommunityPage({ params }: PageProps<"/community/[slug]">) {
  const { slug } = await params;
  const community = await getCommunity(slug);
  if (!community) notFound();
  const asset = await getAsset(community.assetId);
  const [quote, posts, news, users, dir, votes, leaders] = await Promise.all([
    getQuote(asset),
    getPostsByCommunity(slug),
    getNews(slug),
    getUsers(),
    getDirectory(),
    getSentimentVotes(slug),
    getLeaderboard("month", slug, 3).catch(() => []),
  ]);
  // Mood = members' one-tap views + the stance on discussions from the last 90 days.
  const sentiment = { ...votes };
  for (const p of posts) if (p.stance && p.ageMin <= 90 * 24 * 60) sentiment[p.stance] += 1;
  const members = users.filter((u) => u.communities.includes(slug));
  return (
    <>
      <TopBar title={community.name} back fallbackHref="/discover" />
      <CommunityView community={community} asset={asset} quote={quote} sentiment={sentiment} leaders={leaders} posts={posts} news={news} members={members} dir={dir} />
    </>
  );
}
