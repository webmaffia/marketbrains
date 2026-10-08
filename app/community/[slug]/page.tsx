import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { CommunityView } from "@/features/community/CommunityView";
import { getAsset, getCommunity, getNews, getSentimentVotes, getUsers } from "@/lib/api";
import { getQuote } from "@/lib/prices";

export async function generateMetadata({ params }: PageProps<"/community/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCommunity(slug);
  if (!c) return {};
  const title = `${c.name} community`;
  const description = `${c.tagline} Follow the news and community mood for ${c.name} on MarketBrains.`;
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
  const [quote, news, users, sentiment] = await Promise.all([getQuote(asset), getNews(slug), getUsers(), getSentimentVotes(slug)]);
  const members = users.filter((u) => u.communities.includes(slug));
  return (
    <>
      <TopBar title={community.name} back fallbackHref="/discover" />
      <CommunityView community={community} asset={asset} quote={quote} sentiment={sentiment} news={news} members={members} />
    </>
  );
}
