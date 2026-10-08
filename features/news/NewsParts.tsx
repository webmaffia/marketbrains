import Link from "next/link";
import { compact, cx } from "@/lib/format";
import type { AffectedStock, NewsIntel, Poll } from "@/types";
import s from "./NewsParts.module.scss";

export const DISCLAIMER = "MarketBrains provides information, analysis and community sentiment for informational purposes and does not constitute personalized investment advice.";

const REL: Record<AffectedStock["relationship"], string> = { direct: "Direct", supplier: "Supplier", customer: "Customer", competitor: "Competitor", indirect: "Indirect", sector: "Sector" };
const cap = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** Affected stocks as links, each with how it is related to the event. */
export function AffectedStocks({ stocks, limit }: { stocks: AffectedStock[]; limit?: number }) {
  const shown = limit ? stocks.slice(0, limit) : stocks;
  if (!shown.length) return null;
  return (
    <ul className={s.stocks} aria-label="Possibly affected stocks">
      {shown.map((x) => {
        const body = (
          <>
            <strong>{x.ticker}</strong>
            <small>{REL[x.relationship]}</small>
          </>
        );
        return <li key={x.ticker}>{x.slug ? <Link href={`/community/${x.slug}`}>{body}</Link> : <span>{body}</span>}</li>;
      })}
    </ul>
  );
}

export function SectorChips({ sectors }: { sectors: string[] }) {
  if (!sectors.length) return null;
  return (
    <ul className={s.sectors} aria-label="Sectors">
      {sectors.map((x) => (
        <li key={x}>{x}</li>
      ))}
    </ul>
  );
}

/** The AI's reading of how significant an event is. Labelled so it is never mistaken for investor sentiment. */
export function EventSignal({ intel }: { intel: NewsIntel }) {
  return (
    <div className={s.signal} aria-label="MarketBrains event signal">
      <p className={s.label}>
        MarketBrains event signal <em>AI analysis</em>
      </p>
      <dl>
        <div>
          <dt>Impact</dt>
          <dd>{intel.strength.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Direction</dt>
          <dd className={cx(intel.direction === "positive" && s.pos, intel.direction === "negative" && s.neg)}>{cap(intel.direction)}</dd>
        </div>
        <div>
          <dt>Signal</dt>
          <dd>{intel.signalScore}/100</dd>
        </div>
        <div>
          <dt>Confidence</dt>
          <dd>{Math.round(intel.signalConfidence * 100)}%</dd>
        </div>
      </dl>
    </div>
  );
}

/** What real members voted. Read-only: voting happens on the story page. */
export function InvestorSentiment({ poll }: { poll?: Poll }) {
  const total = poll?.options.reduce((n, o) => n + o.votes, 0) ?? 0;
  const pct = (label: string) => {
    const o = poll?.options.find((x) => x.label === label);
    return total && o ? Math.round((o.votes / total) * 100) : 0;
  };
  return (
    <div className={s.sentiment} aria-label="Investor sentiment">
      <p className={s.label}>
        Investor sentiment <em>Members&apos; votes</em>
      </p>
      {total === 0 ? (
        <p className={s.none}>No votes yet. Be the first to share a view.</p>
      ) : (
        <>
          <div className={s.bar} aria-hidden="true">
            <span className={s.b} style={{ flexGrow: pct("Bullish") }} />
            <span className={s.n} style={{ flexGrow: pct("Neutral") }} />
            <span className={s.r} style={{ flexGrow: pct("Bearish") }} />
          </div>
          <p className={s.legend}>
            <span className={s.pos}>{pct("Bullish")}% Bullish</span>
            <span>{pct("Neutral")}% Neutral</span>
            <span className={s.neg}>{pct("Bearish")}% Bearish</span>
          </p>
          <p className={s.none}>{compact(total)} {total === 1 ? "investor" : "investors"} voted</p>
        </>
      )}
    </div>
  );
}
