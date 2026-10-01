import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { FollowingView } from "@/features/following/FollowingView";
import { getCommunities, getUsers } from "@/lib/api";

export const metadata: Metadata = { title: "Following" };

export default async function FollowingPage() {
  const [communities, users] = await Promise.all([getCommunities(), getUsers()]);
  return (
    <>
      <TopBar title="Following" />
      <div style={{ paddingTop: 12 }}>
        <FollowingView communities={communities} users={users} />
      </div>
    </>
  );
}
