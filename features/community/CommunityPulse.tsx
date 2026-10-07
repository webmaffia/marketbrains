"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/features/store/StoreProvider";
import { cx } from "@/lib/format";
import { MIN_DATA } from "@/lib/insights";
import { supabase } from "@/lib/supabase";
import type { SentimentCounts, Stance3 } from "@/types";
import s from "./CommunityPulse.module.scss";

// Semicircle gauge: red -> grey -> green, with a needle at (bulls - bears) / total.
const W = 220;
const H = 124;
const R = 88;
const CX = W / 2;
const CY = H - 16;
const ARC = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

const VIEWS: { id: Stance3; label: string }[] = [
  { id: "bull", label: "Bullish" },
  { id: "neutral", label: "Neutral" },
  { id: "bear", label: "Bearish" },
];

function mood(net: number, total: number) {
  if (total < 1) return "No views yet";
  const label = net > 0.45 ? "Very bullish" : net > 0.15 ? "Leaning bullish" : net < -0.45 ? "Very bearish" : net < -0.15 ? "Leaning bearish" : "Mixed";
  // With only a couple of views the needle still moves, but the label says it is an early read.
  return total < 3 ? `Early read: ${label.toLowerCase()}` : label;
}

/** Community sentiment: the meter combines members' one-tap views with the stance on recent discussions. */
export function CommunityPulse({ slug, name, base }: { slug: string; name: string; base: SentimentCounts }) {
  const { session, setSentiment } = useStore();
  const userId = session?.userId;
  const [counts, setCounts] = useState(base);
  const [mine, setMine] = useState<Stance3 | null>(null);

  // Take the server's numbers again whenever the page is refreshed with new ones.
  const baseKey = `${base.bull}-${base.bear}-${base.neutral}`;
  const [seenKey, setSeenKey] = useState(baseKey);
  if (seenKey !== baseKey) {
    setSeenKey(baseKey);
    setCounts({ bull: base.bull, bear: base.bear, neutral: base.neutral });
  }

  // The member's existing view is already inside the server's counts; this only highlights it.
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    supabase
      .from("sentiment_votes")
      .select("stance")
      .eq("community_slug", slug)
      .eq("user_id", userId)
      .maybeSingle()
      .then(({ data }) => !cancelled && setMine((data?.stance as Stance3) ?? null));
    return () => {
      cancelled = true;
    };
  }, [userId, slug]);

  const vote = async (view: Stance3) => {
    if (view === mine) return;
    if (!(await setSentiment(slug, view))) return;
    setCounts((c) => ({ ...c, ...(mine ? { [mine]: c[mine] - 1 } : {}), [view]: c[view] + 1 }));
    setMine(view);
  };

  const total = counts.bull + counts.bear + counts.neutral;
  const net = total ? (counts.bull - counts.bear) / total : 0;
  const angle = -90 + ((net + 1) / 2) * 180;
  const pct = (n: number) => (total ? Math.round((n / total) * 100) : 0);
  const gradId = `pulse-${slug}`;
  const ready = total >= MIN_DATA;

  return (
    <section className={s.card} aria-label={`${name} community sentiment`}>
      <div className={s.head}>
        <p className={s.eyebrow}>Community pulse</p>
        <span className={s.count}>{total} {total === 1 ? "view" : "views"}</span>
      </div>

      {ready ? (
        <>
      <div className={s.gauge} role="img" aria-label={`${mood(net, total)}: ${pct(counts.bull)}% bullish, ${pct(counts.neutral)}% neutral, ${pct(counts.bear)}% bearish`}>
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--bear)" />
              <stop offset="50%" stopColor="var(--text-3)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="var(--bull)" />
            </linearGradient>
          </defs>
          <path d={ARC} fill="none" stroke={`url(#${gradId})`} strokeWidth={16} strokeLinecap="round" opacity={total < 3 ? 0.55 : 1} />
          {total >= 1 && (
            <g className={s.needle} style={{ transform: `rotate(${angle}deg)`, transformOrigin: `${CX}px ${CY}px` }}>
              <line x1={CX} y1={CY} x2={CX} y2={CY - R + 14} stroke="var(--text)" strokeWidth={3} strokeLinecap="round" />
            </g>
          )}
          <circle cx={CX} cy={CY} r={7} fill="var(--text)" />
        </svg>
        <p className={s.mood}>{mood(net, total)}</p>
      </div>

      <div className={s.bar} aria-hidden="true">
        <span className={s.b} style={{ flexGrow: counts.bull }} />
        <span className={s.n} style={{ flexGrow: counts.neutral }} />
        <span className={s.r} style={{ flexGrow: counts.bear }} />
      </div>
      <div className={s.legend}>
        <span className={s.lb}>{pct(counts.bull)}% Bullish</span>
        <span>{pct(counts.neutral)}% Neutral</span>
        <span className={s.lr}>{pct(counts.bear)}% Bearish</span>
      </div>
        </>
      ) : (
        <p className={s.pending}>
          {total} of {MIN_DATA} views so far. The community mood shows once {MIN_DATA} members have shared how they feel.
        </p>
      )}

      <p className={s.ask}>How do you feel about {name}?</p>
      <div className={s.votes} role="group" aria-label="Your view">
        {VIEWS.map((v) => (
          <button key={v.id} type="button" className={cx(s.vote, s[v.id], mine === v.id && s.on)} aria-pressed={mine === v.id} onClick={() => vote(v.id)}>
            {v.label}
          </button>
        ))}
      </div>
      <p className={s.fine}>Opinions of members, not investment advice.</p>
    </section>
  );
}
