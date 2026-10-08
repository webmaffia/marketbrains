import Link from "next/link";
import { L, LList } from "@/components/ui/Localized";
import { timeAgo } from "@/lib/format";
import type { NewsEntry } from "@/lib/api";
import { AffectedStocks, EventSignal, InvestorSentiment, SectorChips } from "./NewsParts";
import s from "./NewsCard.module.scss";

const BREAKING_MIN = 180;

/** One event, readable in 10 to 20 seconds. The full story, poll and discussion are one tap away. */
export function NewsCard({ entry, communityName }: { entry: NewsEntry; communityName?: string }) {
  const { news, post } = entry;
  const intel = news.intel;
  const breaking = news.ageMin <= BREAKING_MIN && (intel?.signalScore ?? 0) >= 60;
  const sources = news.sources ?? [{ source: news.source, url: news.url }];

  return (
    <article className={s.card}>
      <p className={s.meta}>
        {breaking && <b className={s.breaking}>Breaking</b>}
        <span>{intel?.eventType ?? news.analysis?.topic ?? "News"}</span>
        <span>{communityName ?? news.communitySlug}</span>
        <span>{timeAgo(news.ageMin)}</span>
      </p>

      <h2 className={s.headline}>
        <Link href={`/news/${news.id}`}>
          <L en={news.headline} hi={intel?.hi?.headline} />
        </Link>
      </h2>

      {intel ? (
        <>
          <p className={s.summary}>
            <L en={intel.summary} hi={intel.hi?.summary} />
          </p>
          <div className={s.why}>
            <h3>
              <L en="Why it matters" hi="यह क्यों मायने रखता है" />
            </h3>
            <LList en={intel.whyItMatters.slice(0, 3)} hi={intel.hi?.whyItMatters.slice(0, 3)} />
          </div>
          {intel.stocks.length > 0 && (
            <div>
              <h3 className={s.h}>Possibly affected</h3>
              <AffectedStocks stocks={intel.stocks} limit={4} />
            </div>
          )}
          <SectorChips sectors={intel.sectors} />
          <EventSignal intel={intel} />
        </>
      ) : (
        news.analysis?.summary && <p className={s.summary}>{news.analysis.summary}</p>
      )}

      <InvestorSentiment poll={post?.poll} />

      <div className={s.foot}>
        <span className={s.discuss}>{post?.poll ? "Poll open" : ""}</span>
        <Link href={`/news/${news.id}`} className={s.vote}>
          {post?.poll ? "Vote" : "Read more"}
        </Link>
      </div>

      <p className={s.src}>
        {news.url ? (
          <a href={news.url} target="_blank" rel="noopener noreferrer nofollow">
            {news.source} · Read original →
          </a>
        ) : (
          news.source
        )}
        {sources.length > 1 && <span> · Covered by {sources.length} sources</span>}
      </p>
    </article>
  );
}
