import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TopBar } from "@/components/layout/TopBar";
import { PollCard } from "@/components/post/PollCard";
import { AffectedStocks, DISCLAIMER, EventSignal, InvestorSentiment, SectorChips } from "@/features/news/NewsParts";
import { getCommunity, getNewsEntry } from "@/lib/api";
import { timeAgo } from "@/lib/format";
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

        <section>
          <h2>Investor sentiment</h2>
          {post?.poll ? (
            <PollCard postId={post.id} poll={post.poll} />
          ) : (
            <InvestorSentiment />
          )}
        </section>

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
