import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { MyProfile } from "@/features/profile/MyProfile";
import { ME_ID } from "@/data/users";
import { getCommunities, getPostsByUser, getUser } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [me, posts, communities, dir] = await Promise.all([getUser(ME_ID), getPostsByUser(ME_ID), getCommunities(), getDirectory()]);
  return (
    <>
      <TopBar title="Profile" />
      <MyProfile user={me!} posts={posts} communities={communities.filter((c) => me!.communities.includes(c.slug))} dir={dir} />
    </>
  );
}
