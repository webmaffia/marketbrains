"use client";

import { useState, type ReactNode } from "react";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import s from "./CommunityTabs.module.scss";

export type CommunityTabId = "discussions" | "news" | "results" | "fundamentals" | "members";

interface Props {
  panels: Record<CommunityTabId, ReactNode>;
  fundamentalsLabel: string;
}

/** Tab strip + panels. Panels are rendered by the parent so only the active one mounts. */
export function CommunityTabs({ panels, fundamentalsLabel }: Props) {
  const [tab, setTab] = useState<CommunityTabId>("discussions");
  const tabs: { id: CommunityTabId; label: string }[] = [
    { id: "discussions", label: "Discussions" },
    { id: "news", label: "News" },
    { id: "results", label: "Results" },
    { id: "fundamentals", label: fundamentalsLabel },
    { id: "members", label: "Members" },
  ];
  return (
    <>
      <div className={s.sticky}>
        <SegmentTabs tabs={tabs} value={tab} onChange={setTab} label="Community sections" idPrefix="ctab" />
      </div>
      <div role="tabpanel" aria-labelledby={`ctab-${tab}`} key={tab} className={s.panel}>
        {panels[tab]}
      </div>
    </>
  );
}
