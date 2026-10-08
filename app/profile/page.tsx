import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { MyProfile } from "@/features/profile/MyProfile";
import { getCommunities } from "@/lib/api";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const communities = await getCommunities();
  return (
    <>
      <TopBar title="Profile" />
      <MyProfile communities={communities} />
    </>
  );
}
