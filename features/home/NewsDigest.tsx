import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { timeAgo } from "@/lib/format";
import { scoreHeadline } from "@/lib/newsSentiment";
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
          const h = scoreHeadline(n);
          return (
            <li key={n.id}>
              <Link href={`/community/${n.communitySlug}`} className={s.item}>
                <p className={s.src}>
                  {n.source} · {timeAgo(n.ageMin)}
                  {community && <> · <span className={s.comm}>{community.name}</span></>}
                </p>
                <p className={s.headline}>{n.headline}</p>
                {n.analysis?.summary && <p className={s.note}>{n.analysis.summary}</p>}
                <p className={s.disc}>
                  <span className={`${s.tone} ${s[h.tone]}`}>{h.tone === "bull" ? "Positive" : h.tone === "bear" ? "Negative" : "Neutral"}</span>
                  {h.events[0] && <span> · {h.events[0]}</span>}
                  {n.discussionCount > 0 && (
                    <>
                      {" · "}
                      <Icon name="comment" size={13} /> {n.discussionCount} discussing
                    </>
                  )}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
