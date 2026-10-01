import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { UserProfile } from "@/components/user/UserProfile";
import { getCommunities, getPostsByUser, getUser, getUsers } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export async function generateStaticParams() {
  return (await getUsers()).map((u) => ({ username: u.username }));
}

export async function generateMetadata({ params }: PageProps<"/user/[username]">): Promise<Metadata> {
  const { username } = await params;
  const user = await getUser(decodeURIComponent(username));
  if (!user) return {};
  return {
    title: `${user.name} (@${user.username})`,
    description: user.bio,
    openGraph: { title: `${user.name} on MarketBrains`, description: user.bio, type: "profile" },
  };
}

export default async function UserPage({ params }: PageProps<"/user/[username]">) {
  const { username } = await params;
  const user = await getUser(decodeURIComponent(username));
  if (!user) notFound();
  const [posts, communities, dir] = await Promise.all([getPostsByUser(user.id), getCommunities(), getDirectory()]);
  return (
    <>
      <TopBar title={`@${user.username}`} back />
      <UserProfile user={user} posts={posts} communities={communities.filter((c) => user.communities.includes(c.slug))} dir={dir} isSelf={user.id === "u_javed"} />
    </>
  );
}
