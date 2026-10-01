"use client";

import type { ReactNode } from "react";
import { useStore } from "@/features/store/StoreProvider";
import type { Directory, Post } from "@/types";
import { PostCard } from "./PostCard";

interface Props {
  posts: Post[];
  dir: Directory;
  /** Prepend posts created locally: all of them, or only those in one community. */
  mineCommunity?: string;
  mineAll?: boolean;
  hideCommunity?: boolean;
  empty?: ReactNode;
}

export function PostList({ posts, dir, mineCommunity, mineAll, hideCommunity, empty }: Props) {
  const { myPosts } = useStore();
  const all = [...myPosts.filter((p) => mineAll || p.communitySlug === mineCommunity), ...posts];
  if (!all.length) return <>{empty}</>;
  return (
    <div>
      {all.map((p) => (
        <PostCard key={p.id} post={p} dir={dir} hideCommunity={hideCommunity} />
      ))}
    </div>
  );
}
