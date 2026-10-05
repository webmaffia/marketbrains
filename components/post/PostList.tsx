"use client";

import type { ReactNode } from "react";
import type { Directory, Post } from "@/types";
import { PostCard } from "./PostCard";
import s from "./PostList.module.scss";

interface Props {
  posts: Post[];
  dir: Directory;
  hideCommunity?: boolean;
  empty?: ReactNode;
}

export function PostList({ posts, dir, hideCommunity, empty }: Props) {
  if (!posts.length) return <>{empty}</>;
  return (
    <div className={s.feed}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} dir={dir} hideCommunity={hideCommunity} />
      ))}
    </div>
  );
}
