import Link from "next/link";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { Icon } from "@/components/ui/Icon";
import { FollowButton } from "@/components/user/FollowButton";
import { compact } from "@/lib/format";
import type { Community } from "@/types";
import s from "./SuggestedCommunities.module.scss";

export function SuggestedCommunities({ communities }: { communities: Community[] }) {
  return (
    <section className={s.card} aria-label="Suggested communities">
      <div className={s.head}>
        <div className={s.label}>
          <span className={s.iconBadge}>
            <Icon name="users" size={13} />
          </span>
          <p className={s.eyebrow}>Suggested for you</p>
        </div>
        <Link href="/discover" className={s.all}>
          See all
        </Link>
      </div>
      <ul className={s.list}>
        {communities.map((c) => (
          <li key={c.slug} className={s.row}>
            <Link href={`/community/${c.slug}`} className={s.link}>
              <CommunityBadge community={c} size={36} />
              <span className={s.text}>
                <span className={s.name}>{c.name}</span>
                {c.members > 0 && <span className={s.meta}>{compact(c.members)} members</span>}
              </span>
            </Link>
            <FollowButton communitySlug={c.slug} />
          </li>
        ))}
      </ul>
    </section>
  );
}
