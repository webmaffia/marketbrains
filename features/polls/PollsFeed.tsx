"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { PostList } from "@/components/post/PostList";
import { useStore } from "@/features/store/StoreProvider";
import type { Directory, Post } from "@/types";

export function PollsFeed({ polls, dir }: { polls: Post[]; dir: Directory }) {
  const { myPosts } = useStore();
  const mine = myPosts.filter((p) => p.poll);
  const all = [...mine, ...polls];

  return (
    <PostList
      posts={all}
      dir={dir}
      empty={<EmptyState icon="poll" title="No polls yet" text="Polls posted by the community will show up here." />}
    />
  );
}
