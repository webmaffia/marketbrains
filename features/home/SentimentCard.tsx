import Link from "next/link";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { Icon } from "@/components/ui/Icon";
import { compact } from "@/lib/format";
import type { SentimentSummary } from "./buildFeed";
import s from "./SentimentCard.module.scss";

// Half-circle "speedometer" gauge, drawn as an arc path (not a full circle) so bull/bear sweep
// left-to-right across 180° instead of all the way around.
const WIDTH = 176;
const HEIGHT = 104;
const STROKE = 18;
const RADIUS = 68;
const CX = WIDTH / 2;
const CY = HEIGHT - 14;
const HALF_CIRCUMFERENCE = Math.PI * RADIUS;
const ARC_PATH = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 1 1 ${CX + RADIUS} ${CY}`;

export function SentimentCard({ sentiment }: { sentiment: SentimentSummary }) {
  const { community, bull, bear, total } = sentiment;
  const pct = (n: number) => Math.round((n / total) * 100);
  const bullLen = (bull / total) * HALF_CIRCUMFERENCE;
  const bearLen = (bear / total) * HALF_CIRCUMFERENCE;
  // Gradient ids must be unique across the page — namespace by slug since several of these cards can render at once.
  const bullGradId = `bullGrad-${community.slug}`;
  const bearGradId = `bearGrad-${community.slug}`;

  return (
    <Link href={`/community/${community.slug}`} className={s.card} aria-label={`${community.name} sentiment: ${pct(bull)}% bullish, ${pct(bear)}% bearish`}>
      <div className={s.head}>
        <div className={s.label}>
          <span className={s.iconBadge}>
            <Icon name="poll" size={13} />
          </span>
          <p className={s.eyebrow}>Community pulse</p>
        </div>
        <span className={s.sample}>{compact(total)} posts</span>
      </div>
      <div className={s.body}>
        <div className={s.meter} aria-hidden="true" style={{ width: WIDTH, height: HEIGHT }}>
          <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
            <defs>
              <linearGradient id={bullGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--bull)" stopOpacity="0.55" />
                <stop offset="100%" stopColor="var(--bull)" stopOpacity="1" />
              </linearGradient>
              <linearGradient id={bearGradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="var(--bear)" stopOpacity="1" />
                <stop offset="100%" stopColor="var(--bear)" stopOpacity="0.55" />
              </linearGradient>
            </defs>
            <path d={ARC_PATH} fill="none" stroke="var(--surface-2)" strokeWidth={STROKE} strokeLinecap="round" />
            <g className={s.arcs}>
              {bull > 0 && (
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke={`url(#${bullGradId})`}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${bullLen} ${HALF_CIRCUMFERENCE - bullLen}`}
                />
              )}
              {bear > 0 && (
                <path
                  d={ARC_PATH}
                  fill="none"
                  stroke={`url(#${bearGradId})`}
                  strokeWidth={STROKE}
                  strokeLinecap="round"
                  strokeDasharray={`${bearLen} ${HALF_CIRCUMFERENCE - bearLen}`}
                  strokeDashoffset={-bullLen}
                />
              )}
            </g>
          </svg>
          <span className={s.meterLabel}>
            <strong>{pct(bull)}%</strong>
            <em>bullish</em>
          </span>
        </div>
        <div className={s.info}>
          <span className={s.whoRow}>
            <CommunityBadge community={community} size={28} />
            <span className={s.name}>{community.name}</span>
          </span>
          <span className={s.legend}>
            <span className={s.lbull}>
              <i /> {pct(bull)}%
            </span>
            <span className={s.lbear}>
              <i /> {pct(bear)}%
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
