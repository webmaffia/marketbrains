"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { PostList } from "@/components/post/PostList";
import type { Directory, Post } from "@/types";

export function PollsFeed({ polls, dir }: { polls: Post[]; dir: Directory }) {
  return (
    <PostList
      posts={polls}
      dir={dir}
      empty={<EmptyState icon="poll" title="No polls yet" text="Polls posted by the community will show up here." />}
    />
  );
}
