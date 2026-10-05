import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { MyProfile } from "@/features/profile/MyProfile";
import { getCommunities } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const [communities, dir] = await Promise.all([getCommunities(), getDirectory()]);
  return (
    <>
      <TopBar title="Profile" />
      <MyProfile communities={communities} dir={dir} />
    </>
  );
}
