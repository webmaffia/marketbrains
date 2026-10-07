import Link from "next/link";
import { compact } from "@/lib/format";
import type { Asset, Community } from "@/types";
import { CommunityBadge } from "./CommunityCard";
import s from "./AssetCard.module.scss";

/** Square carousel card: community identity first, never price data. */
export function AssetCard({ community, asset }: { community: Community; asset?: Asset }) {
  return (
    <Link href={`/community/${community.slug}`} className={s.card} style={{ "--h": community.hue } as React.CSSProperties}>
      <CommunityBadge community={community} size={44} />
      <span className={s.name}>{community.name}</span>
      <span className={s.sub}>
        {asset ? `${asset.ticker} · ${asset.exchange === "CRYPTO" ? "Crypto" : asset.exchange}` : community.kind}
      </span>
      {community.discussions > 0 && <span className={s.stat}>{compact(community.discussions)} posts</span>}
    </Link>
  );
}
