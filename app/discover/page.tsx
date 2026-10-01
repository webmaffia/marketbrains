import type { Metadata } from "next";
import { SearchBar } from "@/components/ui/SearchBar";
import { TopBar } from "@/components/layout/TopBar";
import { DiscoverView } from "@/features/discover/DiscoverView";
import { assets } from "@/data/assets";
import { getCommunities } from "@/lib/api";

export const metadata: Metadata = {
  title: "Discover",
  description: "Find investor communities around NSE, BSE, NYSE, NASDAQ, crypto, sectors and themes.",
};

export default async function DiscoverPage() {
  const communities = await getCommunities();
  return (
    <>
      <TopBar title="Discover" />
      <div style={{ padding: "12px 16px 4px" }}>
        <SearchBar href="/search" placeholder="Search communities, people, topics" />
      </div>
      <DiscoverView communities={communities} assets={assets} />
    </>
  );
}
