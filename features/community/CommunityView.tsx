import Link from "next/link";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { L } from "@/components/ui/Localized";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FollowButton } from "@/components/user/FollowButton";
import { timeAgo } from "@/lib/format";
import { scoreHeadline } from "@/lib/newsSentiment";
import type { Quote } from "@/lib/prices";
import type { Asset, Community, NewsItem, SentimentCounts, User } from "@/types";
import { CommunityOverview } from "./CommunityOverview";
import s from "./CommunityView.module.scss";

interface Props {
  community: Community;
  asset?: Asset;
  quote?: Quote | null;
  sentiment: SentimentCounts;
  news: NewsItem[];
  members: User[];
}

const TONE = { bull: "Positive", bear: "Negative", neutral: "Neutral" } as const;

/** Server component: assembles tab panels; only the tab switcher and cards are client-side. */
export function CommunityView({ community, asset, quote, sentiment, news, members }: Props) {
  const panels = {
    overview: <CommunityOverview community={community} sentiment={sentiment} news={news} changePct={quote?.changePct} />,
    news: (
      <div className={s.pad}>
        {news.length > 0 ? (
          <ul className={s.cards}>
            {news.map((n) => {
              const h = scoreHeadline(n);
              const text = n.intel?.summary ?? n.analysis?.summary;
              return (
                <li key={n.id} className={s.news}>
                  <p className={s.src}>
                    {n.source} · {timeAgo(n.ageMin)} · <span className={s[`tone_${h.tone}`]}>{TONE[h.tone]}</span>
                    {h.events.length > 0 && ` · ${h.events.join(", ")}`}
                  </p>
                  <p className={s.headline}>
                    <Link href={`/news/${n.id}`}>
                      <L en={n.headline} hi={n.intel?.hi?.headline} />
                    </Link>
                  </p>
                  {text && (
                    <p className={s.aiNote}>
                      <L en={text} hi={n.intel?.hi?.summary} />
                    </p>
                  )}
                  {n.sources && n.sources.length > 1 && <p className={s.disc}>Covered by {n.sources.length} sources</p>}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={s.none}>No news yet.</p>
        )}
      </div>
    ),
    fundamentals: (
      <div className={s.pad}>
        <section className={s.about}>
          <h3>About this community</h3>
          <p>{asset?.about ?? community.tagline}</p>
          {asset && (
            <>
              <h3>Sector</h3>
              <p>{asset.sector}</p>
              {asset.themes.length > 0 && (
                <>
                  <h3>Key themes</h3>
                  <ul className={s.themes}>
                    {asset.themes.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      </div>
    ),
    members: (
      <div className={s.pad}>
        {members.length ? (
          <ul className={s.cards}>
            {members.map((u) => (
              <li key={u.id} className={s.member}>
                <Link href={`/user/${u.username}`} className={s.mlink}>
                  <UserAvatar user={u} size={44} />
                  <span>
                    <strong>{u.name}</strong>
                    <small>@{u.username}</small>
                  </span>
                </Link>
                <FollowButton userId={u.id} />
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon="users" title="Growing community" text="Members will appear here as they join." />
        )}
      </div>
    ),
  };

  return (
    <>
      <CommunityHeader community={community} asset={asset} quote={quote} />
      <CommunityTabs panels={panels} fundamentalsLabel={asset ? "Fundamentals" : "About"} />
    </>
  );
}
