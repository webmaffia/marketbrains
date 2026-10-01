import { getCommunities, getUsers } from "@/lib/api";
import type { Directory } from "@/types";

export async function getDirectory(): Promise<Directory> {
  const [users, communities] = await Promise.all([getUsers(), getCommunities()]);
  return {
    users: Object.fromEntries(users.map((u) => [u.id, u])),
    communities: Object.fromEntries(communities.map((c) => [c.slug, c])),
  };
}
