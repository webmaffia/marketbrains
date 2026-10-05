"use client";

import { useMemo, useState, type ReactNode } from "react";
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

export function HomeFeed({
  posts,
  dir,
  communities,
  news,
  banner,
}: {
  posts: Post[];
  dir: Directory;
  communities: Community[];
  news: NewsItem[];
  /** Rendered below the sticky tab bar, above the feed — scrolls away with the rest of the content. */
  banner: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>("for-you");
  const { joined, following, muted, isLoggedIn, openAuth } = useStore();

  const visible = useMemo(() => posts.filter((p) => !muted.includes(p.authorId)), [posts, muted]);

  const list = useMemo(() => {
    switch (tab) {
      case "trending":
        // Recent + engaged: engagement decayed by age.
        return [...visible].sort((a, b) => engagement(b) / (1 + b.ageMin / 240) - engagement(a) / (1 + a.ageMin / 240));
      case "popular":
        return [...visible].sort((a, b) => engagement(b) - engagement(a));
      case "following":
        return visible.filter((p) => following.includes(p.authorId) || joined.includes(p.communitySlug));
      default: {
        if (!isLoggedIn) return visible;
        // Boost posts from joined communities / followed people, keep recency otherwise.
        const score = (p: Post) => (joined.includes(p.communitySlug) ? 2 : 0) + (following.includes(p.authorId) ? 2 : 0);
        return [...visible].sort((a, b) => score(b) - score(a) || a.ageMin - b.ageMin);
      }
    }
  }, [tab, visible, joined, following, isLoggedIn]);

  const items = useMemo(() => buildMixedFeed(list, communities, news), [list, communities, news]);

  const empty =
    tab === "following" && !isLoggedIn ? (
      <EmptyState icon="users" title="Your circle lives here" text="Sign in to see discussions from people and communities you follow." action={<Button onClick={() => openAuth("Sign in to see your following feed")}>Sign in</Button>} />
    ) : (
      <EmptyState icon="users" title="Nothing here yet" text="Follow a few communities or people to fill this feed." action={<Button href="/discover">Discover communities</Button>} />
    );

  return (
    <>
      <div className={s.tabsBar}>
        <SegmentTabs tabs={tabs} value={tab} onChange={setTab} label="Feed" idPrefix="feed" variant="pill" />
      </div>
      {tab === "for-you" && banner}
      <div role="tabpanel" aria-labelledby={`feed-${tab}`} key={tab}>
        {list.length > 0 && <p className={s.heading}>{heading[tab]}</p>}
        {list.length === 0 ? empty : <MixedFeed items={items} dir={dir} />}
      </div>
    </>
  );
}
