"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { AffectedStocks, SectorChips } from "@/features/news/NewsParts";
import { timeAgo } from "@/lib/format";
import { scoreHeadline } from "@/lib/newsSentiment";
import type { NewsItem } from "@/types";
import s from "./HomeFeed.module.scss";

const TONE = { bull: "Positive", bear: "Negative", neutral: "Neutral" } as const;

type Filter = "all" | "positive" | "negative" | "neutral" | "breaking" | "impact" | "earnings" | "deals" | "regulation" | "index";

const EARNINGS = new Set(["Earnings", "Revenue", "Profit", "Guidance", "Dividend", "Buyback"]);
const DEALS = new Set(["Acquisition", "Merger", "Partnership", "Contract", "Fundraising", "IPO", "Capacity Expansion"]);
const REGULATION = new Set(["Regulation", "Government Policy", "Legal"]);
const BREAKING_MIN = 180;

/** Each filter as a test on one story. Tabs with no matching story are hidden. */
const FILTERS: { id: Filter; label: string; test: (n: NewsItem, tone: "bull" | "bear" | "neutral", marketSlugs: string[]) => boolean }[] = [
  { id: "all", label: "All", test: () => true },
  { id: "positive", label: "Positive", test: (_n, t) => t === "bull" },
  { id: "negative", label: "Negative", test: (_n, t) => t === "bear" },
  { id: "neutral", label: "Neutral", test: (_n, t) => t === "neutral" },
  { id: "breaking", label: "Breaking", test: (n) => n.ageMin <= BREAKING_MIN },
  { id: "impact", label: "High impact", test: (n) => n.intel?.strength === "high" || (n.intel?.signalScore ?? 0) >= 60 },
  { id: "earnings", label: "Earnings", test: (n) => EARNINGS.has(n.intel?.eventType ?? "") },
  { id: "deals", label: "Deals", test: (n) => DEALS.has(n.intel?.eventType ?? "") },
  { id: "regulation", label: "Regulation", test: (n) => REGULATION.has(n.intel?.eventType ?? "") },
  { id: "index", label: "Index", test: (n, _t, market) => market.includes(n.communitySlug) },
];

/**
 * Home: one story per screen, swipe up for the next. Filter tabs on top narrow it by tone or by kind of news.
 */
export function HomeFeed({ news, names, marketSlugs }: { news: NewsItem[]; names: Record<string, string>; marketSlugs: string[] }) {
  const pager = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [filter, setFilter] = useState<Filter>("all");

  const scored = useMemo(() => news.map((n) => ({ n, tone: scoreHeadline(n).tone })), [news]);
  const tabs = useMemo(
    () =>
      FILTERS.map((f) => ({ id: f.id, label: f.label, count: scored.filter((x) => f.test(x.n, x.tone, marketSlugs)).length }))
        .filter((f) => f.id === "all" || f.count > 0)
        .map((f) => ({ id: f.id, label: `${f.label} ${f.count}` })),
    [scored, marketSlugs],
  );
  const active = tabs.some((t) => t.id === filter) ? filter : "all";
  const list = useMemo(() => {
    const f = FILTERS.find((x) => x.id === active)!;
    return scored.filter((x) => f.test(x.n, x.tone, marketSlugs));
  }, [scored, active, marketSlugs]);

  if (news.length === 0) return <EmptyState icon="globe" title="No news yet" text="Stories appear after the daily news update." />;

  const onScroll = () => {
    const el = pager.current;
    if (el) setIndex(Math.round(el.scrollTop / el.clientHeight));
  };
  const pick = (id: Filter) => {
    setFilter(id);
    setIndex(0);
    pager.current?.scrollTo({ top: 0 });
  };

  return (
    <div className={s.wrap}>
      <SegmentTabs tabs={tabs} value={active} onChange={pick} label="News filters" idPrefix="home" />
      <div ref={pager} className={`${s.pager} hide-scrollbar`} onScroll={onScroll} role="feed" aria-label="Latest news">
        {list.map(({ n, tone }) => {
          const text = n.intel?.summary ?? n.analysis?.summary ?? "";
          return (
            <article key={n.id} className={s.slide}>
              <div className={`${s.card} ${s[`bg_${tone}`]}`}>
                <p className={s.meta}>
                  <span>{names[n.communitySlug] ?? n.communitySlug}</span>
                  <span>{timeAgo(n.ageMin)}</span>
                  <span className={s[tone]}>{TONE[tone]}</span>
                </p>
                <div className={s.body}>
                  <h2 className={s.headline}>{n.headline}</h2>
                  {text && <p className={s.text}>{text}</p>}
                  {n.intel && n.intel.whyItMatters.length > 0 && (
                    <div className={s.why}>
                      <h3>Why it matters</h3>
                      <ul>
                        {n.intel.whyItMatters.slice(0, 3).map((w) => (
                          <li key={w}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {n.intel && n.intel.stocks.length > 0 && (
                    <div>
                      <h3 className={s.h}>Possibly affected</h3>
                      <AffectedStocks stocks={n.intel.stocks} limit={4} />
                    </div>
                  )}
                  {n.intel && <SectorChips sectors={n.intel.sectors} />}
                  {n.intel && (
                    <p className={s.signal}>
                      Event significance <strong>{n.intel.strength.toUpperCase()}</strong> · {n.intel.eventType} · AI analysis
                    </p>
                  )}
                </div>
                <p className={s.foot}>
                  <Link href={`/news/${n.id}`}>Read more</Link>
                  {n.url && (
                    <a href={n.url} target="_blank" rel="noopener noreferrer nofollow">
                      {n.source} →
                    </a>
                  )}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      <p className={s.count} aria-hidden="true">
        {Math.min(index + 1, list.length)} / {list.length}
      </p>
    </div>
  );
}
