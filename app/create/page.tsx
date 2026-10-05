import type { Metadata } from "next";
import { CreateGate } from "@/features/composer/CreateGate";
import { PostComposer } from "@/features/composer/PostComposer";
import { getCommunities, getNewsItem, getTopics, getUsers } from "@/lib/api";

export const metadata: Metadata = { title: "New discussion", robots: { index: false } };

export default async function CreatePage({ searchParams }: PageProps<"/create">) {
  const { community, news: newsId } = await searchParams;
  const [communities, topics, users] = await Promise.all([getCommunities(), getTopics(), getUsers()]);
  const news = typeof newsId === "string" ? await getNewsItem(newsId) : undefined;
  const def = news?.communitySlug ?? (typeof community === "string" && communities.some((c) => c.slug === community) ? community : undefined);
  return (
    <CreateGate>
      <PostComposer communities={communities} topics={topics} users={users} defaultCommunity={def} news={news} />
    </CreateGate>
  );
}
