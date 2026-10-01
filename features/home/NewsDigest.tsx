import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { timeAgo } from "@/lib/format";
import type { Directory, NewsItem } from "@/types";
import s from "./NewsDigest.module.scss";

export function NewsDigest({ items, dir }: { items: NewsItem[]; dir: Directory }) {
  return (
    <section className={s.card} aria-label="News">
      <div className={s.label}>
        <span className={s.iconBadge}>
          <Icon name="globe" size={13} />
        </span>
        <p className={s.eyebrow}>News</p>
      </div>
      <ul className={s.list}>
        {items.map((n) => {
          const community = dir.communities[n.communitySlug];
          return (
            <li key={n.id}>
              <Link href={`/community/${n.communitySlug}`} className={s.item}>
                <p className={s.src}>
                  {n.source} · {timeAgo(n.ageMin)}
                  {community && <> · <span className={s.comm}>{community.name}</span></>}
                </p>
                <p className={s.headline}>{n.headline}</p>
                <p className={s.disc}>
                  <Icon name="comment" size={13} /> {n.discussionCount} discussing
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
