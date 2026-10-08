import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { PollCard } from "@/components/post/PollCard";
import { AffectedStocks, DISCLAIMER, EventSignal, InvestorSentiment, SectorChips } from "@/features/news/NewsParts";
import { getAsset, getCommunity, getNews, getNewsEntry } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import { scoreHeadline } from "@/lib/newsSentiment";
import { getQuote } from "@/lib/prices";
import s from "./page.module.scss";

export async function generateMetadata({ params }: PageProps<"/news/[id]">): Promise<Metadata> {
  const { id } = await params;
  const entry = await getNewsEntry(id);
  if (!entry) return {};
  return { title: entry.news.headline, description: entry.news.intel?.summary, alternates: { canonical: `/news/${id}` } };
}

export default async function NewsDetailPage({ params }: PageProps<"/news/[id]">) {
  const { id } = await params;
  const entry = await getNewsEntry(id);
  if (!entry) notFound();
  const { news, post } = entry;
  const intel = news.intel;
  const community = await getCommunity(news.communitySlug);
  const asset = await getAsset(community?.assetId);
  const [quote, more] = await Promise.all([getQuote(asset), getNews(news.communitySlug)]);
  const related = more.filter((m) => m.id !== news.id && (m.clusterId ?? m.id) !== (news.clusterId ?? news.id)).slice(0, 5);
  const TONE = { bull: "Positive", bear: "Negative", neutral: "Neutral" } as const;
  const sources = news.sources ?? [{ source: news.source, url: news.url }];

  return (
    <>
      <TopBar title="News" back fallbackHref="/news" />
      <article className={s.wrap}>
        <p className={s.meta}>
          {news.source} · {timeAgo(news.ageMin)}
          {community && (
            <>
              {" · "}
              <Link href={`/community/${community.slug}`}>{community.name}</Link>
            </>
          )}
        </p>
        <h1 className={s.h1}>{news.headline}</h1>
        {intel ? <p className={s.summary}>{intel.summary}</p> : news.analysis?.summary && <p className={s.summary}>{news.analysis.summary}</p>}
        {intel?.basis && intel.basis !== "article" && <p className={s.note}>{intel.basis === "snippet" ? "This summary is based on the short description the source gives. Open the original for the full story." : "This summary is based on the headline only. Open the original for the full story."}</p>}

        {intel && intel.keyPoints.length > 0 && (
          <section>
            <h2>Key points</h2>
            <ul className={s.list}>
              {intel.keyPoints.map((k) => (
                <li key={k}>{k}</li>
              ))}
            </ul>
          </section>
        )}

        {intel && (
          <>
            <section>
              <h2>Why it matters</h2>
              <ul className={s.list}>
                {intel.whyItMatters.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
            </section>

            <section>
              <h2>Market impact</h2>
              <p className={s.type}>Event type: {intel.eventType}</p>
              {intel.stocks.length > 0 && <AffectedStocks stocks={intel.stocks} />}
              <SectorChips sectors={intel.sectors} />
              <EventSignal intel={intel} />
              <p className={s.note}>The signal describes how significant the event looks. It is not a prediction of any share price.</p>
            </section>
          </>
        )}

        {quote && asset && (
          <section>
            <h2>Share price today</h2>
            <p className={s.price}>
              <strong>{new Intl.NumberFormat(quote.currency === "INR" ? "en-IN" : "en-US", { style: "currency", currency: quote.currency, maximumFractionDigits: 2 }).format(quote.price)}</strong>
              <span className={quote.changePct >= 0 ? s.up : s.down}>
                {quote.changePct >= 0 ? "▲" : "▼"} {Math.abs(quote.changePct).toFixed(2)}%
              </span>
              <small>{asset.ticker} · delayed</small>
            </p>
            <p className={s.note}>The price move on the latest close. It shows how the stock traded, not that this story caused it.</p>
          </section>
        )}

        <section>
          <h2>Investor sentiment</h2>
          {post?.poll ? (
            <PollCard postId={post.id} poll={post.poll} />
          ) : (
            <InvestorSentiment />
          )}
        </section>

        {related.length > 0 && (
          <section>
            <h2>More on {community?.name ?? "this company"}</h2>
            <ul className={s.related}>
              {related.map((r) => {
                const h = scoreHeadline(r);
                const text = r.intel?.summary ?? r.analysis?.summary;
                return (
                  <li key={r.id}>
                    <Link href={`/news/${r.id}`}>
                      <p className={s.rmeta}>
                        {r.source} · {timeAgo(r.ageMin)} · <span className={s[`tone_${h.tone}`]}>{TONE[h.tone]}</span>
                      </p>
                      <p className={s.rhead}>{r.headline}</p>
                      {text && <p className={s.rtext}>{text}</p>}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        <section>
          <h2>Source</h2>
          <ul className={s.sources}>
            {sources.map((x) => (
              <li key={x.source}>
                {x.url ? (
                  <a href={x.url} target="_blank" rel="noopener noreferrer nofollow">
                    {x.source} · Read original →
                  </a>
                ) : (
                  x.source
                )}
              </li>
            ))}
          </ul>
          {sources.length > 1 && <p className={s.note}>Covered by {sources.length} sources.</p>}
        </section>

        <p className={s.disclaimer}>{DISCLAIMER}</p>
      </article>
    </>
  );
}
