import { compact } from "@/lib/format";
import type { Asset, Community } from "@/types";
import { FollowButton } from "@/components/user/FollowButton";
import { CommunityBadge } from "./CommunityCard";
import s from "./CommunityHeader.module.scss";

export function CommunityHeader({ community, asset }: { community: Community; asset?: Asset }) {
  return (
    <section className={s.header} aria-labelledby="community-name" style={{ "--h": community.hue } as React.CSSProperties}>
      <div className={s.cover} aria-hidden="true" />
      <div className={s.top}>
        <CommunityBadge community={community} size={64} />
        <div className={s.id}>
          <h2 id="community-name" className={s.name}>
            {asset ? asset.ticker : community.name}
          </h2>
          <p className={s.sub}>{asset ? `${asset.name} · ${asset.exchange === "CRYPTO" ? "Crypto" : asset.exchange}` : community.tagline}</p>
        </div>
        <FollowButton communitySlug={community.slug} size="md" />
      </div>
      <dl className={s.stats}>
        <div>
          <dt>Members</dt>
          <dd>{compact(community.members)}</dd>
        </div>
        <div>
          <dt>Discussions</dt>
          <dd>{compact(community.discussions)}</dd>
        </div>
        <div>
          <dt>Active now</dt>
          <dd>{compact(Math.round(community.members * 0.014))}</dd>
        </div>
      </dl>
    </section>
  );
}
