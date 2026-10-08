"use client";

import { useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { TopicChip } from "@/components/ui/TopicChip";
import { useStore } from "@/features/store/StoreProvider";
import type { NewsEntry } from "@/lib/api";
import { NewsCard } from "./NewsCard";
import { DISCLAIMER } from "./NewsParts";
import s from "./NewsFeed.module.scss";

type Tab = "for-you" | "markets" | "stocks";
type Filter = "all" | "breaking" | "moving" | "voted";

const TABS: { id: Tab; label: string }[] = [
  { id: "for-you", label: "For You" },
  { id: "markets", label: "Markets" },
  { id: "stocks", label: "Stocks" },
];
const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "breaking", label: "Breaking" },
  { id: "moving", label: "Market moving" },
  { id: "voted", label: "Most voted" },
];
const MACRO = new Set(["Macro", "Interest Rates", "Inflation", "Government Policy", "Geopolitical", "Commodity"]);
const votes = (e: NewsEntry) => e.post?.poll?.options.reduce((n, o) => n + o.votes, 0) ?? 0;

export function NewsFeed({ entries, names, marketSlugs }: { entries: NewsEntry[]; names: Record<string, string>; marketSlugs: string[] }) {
  const { joined } = useStore();
  const [tab, setTab] = useState<Tab>("for-you");
  const [filter, setFilter] = useState<Filter>("all");

  const list = useMemo(() => {
    const isMarket = (e: NewsEntry) => marketSlugs.includes(e.news.communitySlug) || MACRO.has(e.news.intel?.eventType ?? "");
    let out = entries.filter((e) => (tab === "markets" ? isMarket(e) : tab === "stocks" ? !marketSlugs.includes(e.news.communitySlug) : true));
    if (filter === "breaking") out = out.filter((e) => e.news.ageMin <= 180);
    if (filter === "moving") out = out.filter((e) => e.news.intel?.strength === "high" || (e.news.intel?.signalScore ?? 0) >= 60);
    if (filter === "voted") return [...out].sort((a, b) => votes(b) - votes(a) || a.news.ageMin - b.news.ageMin);
    // For You leans toward the member's own communities, then newest first.
    if (tab === "for-you") return [...out].sort((a, b) => Number(joined.includes(b.news.communitySlug)) - Number(joined.includes(a.news.communitySlug)) || a.news.ageMin - b.news.ageMin);
    return out;
  }, [entries, tab, filter, joined, marketSlugs]);

  return (
    <>
      <div className={s.bar}>
        <SegmentTabs tabs={TABS} value={tab} onChange={setTab} label="News sections" idPrefix="news" variant="pill" />
        <div className={`${s.chips} hide-scrollbar`} role="group" aria-label="Filter news">
          {FILTERS.map((f) => (
            <TopicChip key={f.id} label={f.label} active={filter === f.id} onClick={() => setFilter(f.id)} />
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <EmptyState icon="globe" title="Nothing here right now" text="Stories appear after the daily news update. Try another filter." />
      ) : (
        list.map((e) => <NewsCard key={e.news.id} entry={e} communityName={names[e.news.communitySlug]} />)
      )}
      <p className={s.disclaimer}>{DISCLAIMER}</p>
    </>
  );
}
