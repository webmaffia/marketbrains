"use client";

import type { ReactNode } from "react";
import { useStore } from "@/features/store/StoreProvider";
import type { Directory, Post } from "@/types";
import { PostCard } from "./PostCard";
import s from "./PostList.module.scss";

interface Props {
  posts: Post[];
  dir: Directory;
  hideCommunity?: boolean;
  /** Profile pages show a person's posts even if they are muted. */
  showMuted?: boolean;
  empty?: ReactNode;
}

export function PostList({ posts: all, dir, hideCommunity, showMuted, empty }: Props) {
  const { muted } = useStore();
  const posts = showMuted ? all : all.filter((p) => !muted.includes(p.authorId));
  if (!posts.length) return <>{empty}</>;
  return (
    <div className={s.feed}>
      {posts.map((p) => (
        <PostCard key={p.id} post={p} dir={dir} hideCommunity={hideCommunity} />
      ))}
    </div>
  );
}
