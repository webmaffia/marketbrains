import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { AdminCommunities } from "@/features/admin/AdminCommunities";
import { getCommunities } from "@/lib/api";

export const metadata: Metadata = { title: "Manage communities", robots: { index: false } };

export default async function AdminCommunitiesPage() {
  const communities = await getCommunities();
  return (
    <>
      <TopBar title="Manage communities" back fallbackHref="/profile" />
      <AdminCommunities communities={communities} />
    </>
  );
}
