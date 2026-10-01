"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { PostList } from "@/components/post/PostList";
import { useStore } from "@/features/store/StoreProvider";
import type { Directory, Post } from "@/types";

type Tab = "for-you" | "trending" | "popular" | "following";
const tabs: { id: Tab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
  { id: "following", label: "Following" },
];

const engagement = (p: Post) => p.likes + p.comments * 2;

export function HomeFeed({ posts, dir }: { posts: Post[]; dir: Directory }) {
  const [tab, setTab] = useState<Tab>("for-you");
  const { joined, following, isLoggedIn, openAuth } = useStore();

  const list = useMemo(() => {
    switch (tab) {
      case "trending":
        // Recent + engaged: engagement decayed by age.
        return [...posts].sort((a, b) => engagement(b) / (1 + b.ageMin / 240) - engagement(a) / (1 + a.ageMin / 240));
      case "popular":
        return [...posts].sort((a, b) => engagement(b) - engagement(a));
      case "following":
        return posts.filter((p) => following.includes(p.authorId) || joined.includes(p.communitySlug));
      default: {
        if (!isLoggedIn) return posts;
        // Boost posts from joined communities / followed people, keep recency otherwise.
        const score = (p: Post) => (joined.includes(p.communitySlug) ? 2 : 0) + (following.includes(p.authorId) ? 2 : 0);
        return [...posts].sort((a, b) => score(b) - score(a) || a.ageMin - b.ageMin);
      }
    }
  }, [tab, posts, joined, following, isLoggedIn]);

  const empty =
    tab === "following" && !isLoggedIn ? (
      <EmptyState icon="users" title="Your circle lives here" text="Sign in to see discussions from people and communities you follow." action={<Button onClick={() => openAuth("Sign in to see your following feed")}>Sign in</Button>} />
    ) : (
      <EmptyState icon="users" title="Nothing here yet" text="Follow a few communities or people to fill this feed." action={<Button href="/discover">Discover communities</Button>} />
    );

  return (
    <>
      <SegmentTabs tabs={tabs} value={tab} onChange={setTab} label="Feed" idPrefix="feed" />
      <div role="tabpanel" aria-labelledby={`feed-${tab}`} key={tab}>
        <PostList posts={list} dir={dir} mineAll={tab === "for-you" || tab === "following"} empty={empty} />
      </div>
    </>
  );
}
