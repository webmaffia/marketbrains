"use client";

import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { CommentThread } from "@/components/post/CommentThread";
import { PostCard } from "@/components/post/PostCard";
import { useStore } from "@/features/store/StoreProvider";
import type { Directory } from "@/types";

/** Detail view for posts created in this browser (mock data has no server record for them). */
export function LocalPostView({ postId, dir }: { postId: string; dir: Directory }) {
  const { myPosts, hydrated } = useStore();
  const post = myPosts.find((p) => p.id === postId);
  if (!post) {
    return hydrated ? (
      <EmptyState icon="comment" title="Discussion not found" text="This draft discussion only exists on the device that created it." action={<Button href="/">Back home</Button>} />
    ) : null;
  }
  return (
    <>
      <PostCard post={post} dir={dir} detail />
      <CommentThread postId={post.id} comments={[]} dir={dir} />
    </>
  );
}
