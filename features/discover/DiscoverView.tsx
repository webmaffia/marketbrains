"use client";

import { useState } from "react";
import { AssetCard } from "@/components/community/AssetCard";
import { CommunityCard } from "@/components/community/CommunityCard";
import { TopicChip } from "@/components/ui/TopicChip";
import type { Asset, Community } from "@/types";
import s from "./DiscoverView.module.scss";

type Filter = "all" | "indices" | "stocks" | "sectors" | "themes" | "topics";
const filters: { id: Filter; label: string; kind?: Community["kind"] }[] = [
  { id: "all", label: "All" },
  { id: "indices", label: "Indices", kind: "market" },
  { id: "stocks", label: "Stocks", kind: "asset" },
  { id: "sectors", label: "Sectors", kind: "sector" },
  { id: "themes", label: "Themes", kind: "theme" },
  { id: "topics", label: "Topics", kind: "topic" },
];

export function DiscoverView({ communities, assets }: { communities: Community[]; assets: Asset[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const assetMap = Object.fromEntries(assets.map((a) => [a.id, a]));

  // Only offer filters that have something in them, so admins adding a new kind makes its chip appear.
  const available = filters.filter((f) => f.id === "all" || communities.some((c) => c.kind === f.kind));
  const active = available.some((f) => f.id === filter) ? filter : "all";
  const kind = filters.find((f) => f.id === active)?.kind;

  const filtered = communities.filter((c) => !kind || c.kind === kind);
  const featured = communities.filter((c) => c.featured);
  const indices = active === "all" ? filtered.filter((c) => c.kind === "market") : [];
  const rest = active === "all" ? filtered.filter((c) => c.kind !== "market") : filtered;

  return (
    <>
      <div className={`${s.chips} hide-scrollbar`} role="group" aria-label="Filter communities">
        {available.map((f) => (
          <TopicChip key={f.id} label={f.label} active={active === f.id} onClick={() => setFilter(f.id)} />
        ))}
      </div>

      {active === "all" && featured.length > 0 && (
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

      {indices.length > 0 && (
        <section aria-labelledby="ex">
          <h2 id="ex" className={s.h}>
            Indices
          </h2>
          <div className={s.group}>
            {indices.map((c) => (
              <CommunityCard key={c.slug} community={c} />
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="all-c">
        <h2 id="all-c" className={s.h}>
          {active === "all" ? "All communities" : filters.find((f) => f.id === active)?.label}
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
