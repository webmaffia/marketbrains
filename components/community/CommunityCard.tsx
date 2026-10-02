"use client";

import Link from "next/link";
import { useState } from "react";
import { communityInitials, compact } from "@/lib/format";
import type { Community } from "@/types";
import { FollowButton } from "@/components/user/FollowButton";
import s from "./CommunityCard.module.scss";

export function CommunityBadge({ community, size = 48 }: { community: Pick<Community, "name" | "hue" | "kind" | "logoUrl">; size?: number }) {
  const [broken, setBroken] = useState(false);
  const radius = community.kind === "asset" ? size * 0.32 : size * 0.5;

  if (community.logoUrl && !broken) {
    return (
      <span className={s.logo} style={{ width: size, height: size, borderRadius: radius }}>
        {/* eslint-disable-next-line @next/next/no-img-element -- external, size-varying logo; not worth next/image config here */}
        <img src={community.logoUrl} alt="" onError={() => setBroken(true)} />
      </span>
    );
  }

  return (
    <span
      className={s.badge}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(145deg, hsl(${community.hue} 78% 58%), hsl(${(community.hue + 35) % 360} 72% 44%))`,
        borderRadius: radius,
      }}
      aria-hidden="true"
    >
      {communityInitials(community.name)}
    </span>
  );
}

/** List-row card: used in Discover lists, Following and search results. */
export function CommunityCard({ community, withJoin = true }: { community: Community; withJoin?: boolean }) {
  return (
    <div className={s.card}>
      <Link href={`/community/${community.slug}`} className={s.link}>
        <CommunityBadge community={community} />
        <span className={s.text}>
          <span className={s.name}>{community.name}</span>
          <span className={s.meta}>
            {compact(community.members)} members · {compact(community.discussions)} posts
          </span>
        </span>
      </Link>
      {withJoin && <FollowButton communitySlug={community.slug} />}
    </div>
  );
}
