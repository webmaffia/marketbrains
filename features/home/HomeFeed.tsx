"use client";

import Link from "next/link";
import { memo, useMemo, useRef, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { L } from "@/components/ui/Localized";
import { AffectedStocks } from "@/features/news/NewsParts";
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

/** One story. The whole card opens the story page (the headline link is stretched over it); the source link sits above that. Memoised so swiping (which updates the counter) does not re-render every card. Kept short so it fits a small phone. */
const Slide = memo(function Slide({ n, tone, name }: { n: NewsItem; tone: "bull" | "bear" | "neutral"; name: string }) {
  const text = n.intel?.summary ?? n.analysis?.summary ?? "";
  return (
    <article className={s.slide}>
      <div className={`${s.card} ${s[`bg_${tone}`]}`}>
        <p className={s.meta}>
          <span>{name}</span>
          <span>{timeAgo(n.ageMin)}</span>
          <span className={s[tone]}>{TONE[tone]}</span>
        </p>
        <div className={s.body}>
          <h2 className={s.headline}>
            <Link href={`/news/${n.id}`} className={s.open}>
              <L en={n.headline} hi={n.intel?.hi?.headline} />
            </Link>
          </h2>
          {text && (
            <p className={s.text}>
              <L en={text} hi={n.intel?.hi?.summary} />
            </p>
          )}
          {n.intel && n.intel.stocks.length > 0 && <AffectedStocks stocks={n.intel.stocks} limit={3} />}
        </div>
        <p className={s.foot}>
          <span>
            <L en="Read more" hi="और पढ़ें" />
          </span>
          {n.url && (
            <a href={n.url} target="_blank" rel="noopener noreferrer nofollow">
              {n.source} →
            </a>
          )}
        </p>
      </div>
    </article>
  );
});

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
        {list.map(({ n, tone }) => (
          <Slide key={n.id} n={n} tone={tone} name={names[n.communitySlug] ?? n.communitySlug} />
        ))}
      </div>
      <p className={s.count} aria-hidden="true">
        {Math.min(index + 1, list.length)} / {list.length}
      </p>
    </div>
  );
}
