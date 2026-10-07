"use client";

import { useEffect, useState } from "react";
import { PostList } from "@/components/post/PostList";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/features/store/StoreProvider";
import { getPostsByIds } from "@/lib/api";
import type { Directory, Post } from "@/types";

/** The member's bookmarked discussions, newest first. Unsaving a post removes it from the list straight away. */
export function SavedList({ dir }: { dir: Directory }) {
  const { hydrated, isLoggedIn, saved, openAuth } = useStore();
  const [posts, setPosts] = useState<Post[] | null>(null);
  const [failed, setFailed] = useState(false);

  // Fetch once the saved ids are known; later unsaves are filtered out below without another request.
  const none = saved.length === 0;
  useEffect(() => {
    if (!hydrated || !isLoggedIn || none) return;
    let cancelled = false;
    getPostsByIds(saved)
      .then((p) => !cancelled && (setPosts(p), setFailed(false)))
      .catch(() => !cancelled && setFailed(true));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, isLoggedIn, none]);

  if (!hydrated) return null;
  if (!isLoggedIn) {
    return <EmptyState icon="bookmark" title="Sign in to see saved posts" text="Bookmark discussions to read them later." action={<Button onClick={() => openAuth("Sign in to see your saved posts")}>Sign in</Button>} />;
  }
  if (failed) return <EmptyState icon="bookmark" title="Couldn't load saved posts" text="Check your connection and try again." action={<Button onClick={() => location.reload()}>Retry</Button>} />;
  if (saved.length === 0) return <EmptyState icon="bookmark" title="Nothing saved yet" text="Tap the bookmark on any discussion to keep it here." action={<Button href="/">Browse discussions</Button>} />;
  if (posts === null) return null;

  const list = posts.filter((p) => saved.includes(p.id));
  return <PostList posts={list} dir={dir} empty={<EmptyState icon="bookmark" title="Nothing saved yet" text="Tap the bookmark on any discussion to keep it here." />} />;
}
