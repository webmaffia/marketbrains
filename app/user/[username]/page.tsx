import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { UserProfile } from "@/components/user/UserProfile";
import { getCommunities, getPublicContact, getUser } from "@/lib/api";

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
  const [communities, contact] = await Promise.all([getCommunities(), getPublicContact(user.id)]);
  return (
    <>
      <TopBar title={`@${user.username}`} back />
      <UserProfile user={user} communities={communities.filter((c) => user.communities.includes(c.slug))} contact={contact} />
    </>
  );
}
