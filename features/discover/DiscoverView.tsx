"use client";

import { useState } from "react";
import { AssetCard } from "@/components/community/AssetCard";
import { CommunityCard } from "@/components/community/CommunityCard";
import { TopicChip } from "@/components/ui/TopicChip";
import type { Asset, Community } from "@/types";
import s from "./DiscoverView.module.scss";

type Filter = "all" | "india" | "us" | "crypto" | "sectors" | "themes" | "topics";
const filters: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "india", label: "India" },
  { id: "us", label: "US" },
  { id: "crypto", label: "Crypto" },
  { id: "sectors", label: "Sectors" },
  { id: "themes", label: "Themes" },
  { id: "topics", label: "Topics" },
];

const KIND_FOR: Partial<Record<Filter, Community["kind"]>> = { sectors: "sector", themes: "theme", topics: "topic" };

export function DiscoverView({ communities, assets }: { communities: Community[]; assets: Asset[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));

  const filtered = communities.filter((c) => {
    if (filter === "all") return true;
    if (filter === "india" || filter === "us" || filter === "crypto") return c.region === filter;
    return c.kind === KIND_FOR[filter];
  });
  const featured = communities.filter((c) => c.featured);
  const exchanges = filtered.filter((c) => c.kind === "market");
  const rest = filtered.filter((c) => c.kind !== "market");

  return (
    <>
      <div className={`${s.chips} hide-scrollbar`} role="group" aria-label="Filter communities">
        {filters.map((f) => (
          <TopicChip key={f.id} label={f.label} active={filter === f.id} onClick={() => setFilter(f.id)} />
        ))}
      </div>

      {filter === "all" && (
        <section aria-labelledby="pop">
          <h2 id="pop" className={s.h}>
            Popular communities
          </h2>
          <div className={`${s.rail} hide-scrollbar`}>
            {featured.map((c) => (
              <AssetCard key={c.slug} community={c} asset={c.assetId ? assetMap[c.assetId] : undefined} />
            ))}
          </div>
        </section>
      )}

      {exchanges.length > 0 && (
        <section aria-labelledby="ex">
          <h2 id="ex" className={s.h}>
            Exchanges
          </h2>
          <div className={s.group}>
            {exchanges.map((c) => (
              <CommunityCard key={c.slug} community={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-c">
        <h2 id="all-c" className={s.h}>
          {filter === "all" ? "All communities" : filters.find((f) => f.id === filter)?.label}
        </h2>
        <div className={s.group}>
          {rest.map((c) => (
            <CommunityCard key={c.slug} community={c} />
          ))}
        </div>
      </section>
    </>
  );
}
