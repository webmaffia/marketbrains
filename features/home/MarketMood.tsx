"use client";

import { useState } from "react";
import type { NewsMeters } from "@/lib/newsSentiment";
import s from "./MarketMood.module.scss";

type Range = "today" | "week";

/** A slim strip, not a card: the market's news mood as one line, one bar and the counts. Today or the last 7 days. */
export function MarketMood({ meters }: { meters: NewsMeters }) {
  const [range, setRange] = useState<Range>("today");
  const active: Range = meters[range] ? range : range === "today" ? "week" : "today";
  const m = meters[active];
  if (!m) return null;
  const score = Math.round(m.value * 100);
  const tone = m.value > 0.15 ? s.pos : m.value < -0.15 ? s.neg : "";

  return (
    <div className={s.strip} aria-label="Market news sentiment">
      <div className={s.top}>
        <p className={s.label}>
          <span>Market mood</span>
          <strong className={tone}>{m.label}</strong>
          <small>
            {score > 0 ? "+" : ""}
            {score}
          </small>
        </p>
        <div className={s.range} role="group" aria-label="Time range">
          {(["today", "week"] as const).map((r) => (
            <button key={r} type="button" className={r === active ? s.on : undefined} aria-pressed={r === active} disabled={!meters[r]} onClick={() => setRange(r)}>
              {r === "today" ? "Today" : "7d"}
            </button>
          ))}
        </div>
      </div>
      <div className={s.bar} aria-hidden="true">
        <span className={s.b} style={{ flexGrow: m.bull }} />
        <span className={s.n} style={{ flexGrow: m.neutral }} />
        <span className={s.r} style={{ flexGrow: m.bear }} />
      </div>
      <p className={s.counts}>
        <span className={s.pos}>{m.bull} positive</span>
        <span>{m.neutral} neutral</span>
        <span className={s.neg}>{m.bear} negative</span>
      </p>
    </div>
  );
}
