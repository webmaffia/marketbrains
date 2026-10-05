import type { Metadata } from "next";
import { TopBar } from "@/components/layout/TopBar";
import { AdminNews } from "@/features/admin/AdminNews";
import { getAllNews, getCommunities } from "@/lib/api";

export const metadata: Metadata = { title: "Manage news", robots: { index: false } };

export default async function AdminNewsPage() {
  const [communities, news] = await Promise.all([getCommunities(), getAllNews()]);
  return (
    <>
      <TopBar title="Manage news" back fallbackHref="/profile" />
      <AdminNews communities={communities} news={news} />
    </>
  );
}
