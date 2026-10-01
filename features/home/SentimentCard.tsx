import Link from "next/link";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { Icon } from "@/components/ui/Icon";
import { compact } from "@/lib/format";
import type { SentimentSummary } from "./buildFeed";
import s from "./SentimentCard.module.scss";

export function SentimentCard({ sentiment }: { sentiment: SentimentSummary }) {
  const { community, bull, bear, neutral, total } = sentiment;
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <Link href={`/community/${community.slug}`} className={s.card} aria-label={`${community.name} sentiment: ${pct(bull)}% bullish`}>
      <div className={s.head}>
        <div className={s.label}>
          <span className={s.iconBadge}>
            <Icon name="poll" size={13} />
          </span>
          <p className={s.eyebrow}>Community pulse</p>
        </div>
        <span className={s.sample}>{compact(total)} posts</span>
      </div>
      <div className={s.who}>
        <CommunityBadge community={community} size={32} />
        <span className={s.name}>{community.name}</span>
      </div>
      <div className={s.bar} role="img" aria-hidden="true">
        {bull > 0 && <span className={s.bull} style={{ width: `${pct(bull)}%` }} />}
        {neutral > 0 && <span className={s.neutral} style={{ width: `${pct(neutral)}%` }} />}
        {bear > 0 && <span className={s.bear} style={{ width: `${pct(bear)}%` }} />}
      </div>
      <div className={s.legend}>
        <span className={s.lbull}>{pct(bull)}% bullish</span>
        <span className={s.lbear}>{pct(bear)}% bearish</span>
      </div>
    </Link>
  );
}
