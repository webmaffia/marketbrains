import Link from "next/link";
import { PollCard } from "@/components/post/PollCard";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { compact } from "@/lib/format";
import type { Community, LeaderboardEntry, NewsItem, Post, SentimentCounts } from "@/types";
import { CommunityInsights } from "./CommunityInsights";
import { buildNewsMeter } from "@/lib/newsSentiment";
import { CommunityPulse } from "./CommunityPulse";
import { NewsMeter } from "./NewsMeter";
import s from "./CommunityOverview.module.scss";

const WEEK_MIN = 7 * 24 * 60;
const engagement = (p: Post) => p.likes + p.comments * 2;

interface Props {
  community: Community;
  posts: Post[];
  /** Members' views plus the stance of recent discussions. */
  sentiment: SentimentCounts;
  leaders: LeaderboardEntry[];
  news: NewsItem[];
  /** Today's price move, used to compare what members expect with what the market did. */
  changePct?: number | null;
}

/** The top of a community page: mood, live polls, who to learn from and what's hot, before the full discussion list. */
export function CommunityOverview({ community, posts, sentiment, leaders, news, changePct }: Props) {
  const polls = posts.filter((p) => p.poll).slice(0, 2);
  const thisWeek = posts.filter((p) => p.ageMin <= WEEK_MIN).length;
  const trending = [...posts].sort((a, b) => engagement(b) / (1 + b.ageMin / 240) - engagement(a) / (1 + a.ageMin / 240)).slice(0, 3);

  const newsMeter = buildNewsMeter(news);
  const livePolls = posts.filter((p) => p.poll).length;
  const stats = (
    [
      ["New this week", thisWeek],
      ["Members", community.members],
      ["Live polls", livePolls],
    ] as [string, number][]
  )
    .filter(([, n]) => n > 0)
    .map(([label, n]) => [label, label === "Members" ? compact(n) : n] as const);

  return (
    <div className={s.wrap}>
      <CommunityPulse slug={community.slug} name={community.name} base={sentiment} />

      {newsMeter && <NewsMeter meter={newsMeter} name={community.name} />}

      <CommunityInsights name={community.name} posts={posts} news={news} changePct={changePct} />

      {stats.length > 0 && (
        <dl className={s.stats} style={{ gridTemplateColumns: `repeat(${stats.length}, 1fr)` }}>
          {stats.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}

      {polls.length > 0 && (
        <section className={s.section} aria-labelledby="ov-polls">
          <div className={s.row}>
            <h3 id="ov-polls">Polls</h3>
            <Link href="/polls">All polls</Link>
          </div>
          {polls.map((p) => (
            <div key={p.id} className={s.poll}>
              <PollCard postId={p.id} poll={p.poll!} />
              <Link href={`/community/${p.communitySlug}/post/${p.id}`} className={s.more}>
                Discuss this poll <Icon name="chevron" size={14} />
              </Link>
            </div>
          ))}
        </section>
      )}

      {leaders.length > 0 && (
        <section className={s.section} aria-labelledby="ov-top">
          <div className={s.row}>
            <h3 id="ov-top">Top contributors</h3>
            <Link href="/leaderboard">Leaderboard</Link>
          </div>
          <ol className={s.leaders}>
            {leaders.map((l, i) => (
              <li key={l.userId}>
                <Link href={`/user/${l.username}`}>
                  <span className={s.pos}>{i + 1}</span>
                  <UserAvatar user={l} size={36} />
                  <span className={s.who}>
                    <strong>{l.name}</strong>
                    <small>
                      {l.posts} {l.posts === 1 ? "post" : "posts"} · {l.comments} comments
                    </small>
                  </span>
                  <b>{l.score} pts</b>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {trending.length > 0 && (
        <section className={s.section} aria-labelledby="ov-trend">
          <div className={s.row}>
            <h3 id="ov-trend">Trending now</h3>
          </div>
          <ul className={s.trend}>
            {trending.map((p) => (
              <li key={p.id}>
                <Link href={`/community/${p.communitySlug}/post/${p.id}`}>
                  <span>{p.title}</span>
                  <small>
                    {p.likes} likes · {p.comments} comments
                  </small>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className={s.row + " " + s.all}>
        <h3>All discussions</h3>
        <Link href={`/create?community=${community.slug}`}>Start one</Link>
      </div>
    </div>
  );
}
