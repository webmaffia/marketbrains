"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { useStore } from "@/features/store/StoreProvider";
import type { Community, Directory, NewsItem, Post } from "@/types";
import { buildMixedFeed } from "./buildFeed";
import { MixedFeed } from "./MixedFeed";
import s from "./HomeFeed.module.scss";

type Tab = "for-you" | "trending" | "popular" | "following";
const tabs: { id: Tab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "popular", label: "Popular" },
  { id: "following", label: "Following" },
];
const heading: Record<Tab, string> = {
  "for-you": "Latest discussions",
  trending: "Trending now",
  popular: "Most popular",
  following: "From your circle",
};

const engagement = (p: Post) => p.likes + p.comments * 2;

export function HomeFeed({ posts, dir, communities, news }: { posts: Post[]; dir: Directory; communities: Community[]; news: NewsItem[] }) {
  const [tab, setTab] = useState<Tab>("for-you");
  const { joined, following, isLoggedIn, openAuth, myPosts } = useStore();

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

  const mineAll = tab === "for-you" || tab === "following";
  const combined = useMemo(() => (mineAll ? [...myPosts, ...list] : list), [mineAll, myPosts, list]);
  const items = useMemo(() => buildMixedFeed(combined, communities, news), [combined, communities, news]);

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
        {combined.length > 0 && <p className={s.heading}>{heading[tab]}</p>}
        {combined.length === 0 ? empty : <MixedFeed items={items} dir={dir} />}
      </div>
    </>
  );
}
