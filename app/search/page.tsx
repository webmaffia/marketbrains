import type { Metadata } from "next";
import { SearchView } from "@/features/search/SearchView";
import { getCommunities, getPosts, getUsers } from "@/lib/api";
import { getDirectory } from "@/lib/directory";

export const metadata: Metadata = { title: "Search" };

export default async function SearchPage() {
  const [communities, users, posts, dir] = await Promise.all([getCommunities(), getUsers(), getPosts(), getDirectory()]);
  return <SearchView communities={communities} users={users} posts={posts} dir={dir} />;
}
