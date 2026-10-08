import type { Metadata } from "next";
import { SearchView } from "@/features/search/SearchView";
import { getCommunities, getUsers } from "@/lib/api";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const [communities, users] = await Promise.all([getCommunities(), getUsers()]);
  return <SearchView communities={communities} users={users} />;
}
