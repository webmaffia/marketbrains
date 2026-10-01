import Link from "next/link";
import { CommunityHeader } from "@/components/community/CommunityHeader";
import { CommunityTabs } from "@/components/community/CommunityTabs";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FollowButton } from "@/components/user/FollowButton";
import { PostList } from "@/components/post/PostList";
import { timeAgo } from "@/lib/format";
import type { Asset, Community, Directory, NewsItem, Post, User } from "@/types";
import s from "./CommunityView.module.scss";

interface Props {
  community: Community;
  asset?: Asset;
  posts: Post[];
  news: NewsItem[];
  members: User[];
  dir: Directory;
}

/** Server component: assembles tab panels; only the tab switcher and cards are client-side. */
export function CommunityView({ community, asset, posts, news, members, dir }: Props) {
  const earnings = posts.filter((p) => p.type === "earnings");
  const newsPosts = posts.filter((p) => p.type === "news");
  const questions = posts.filter((p) => p.type === "question");

  const panels = {
    discussions: (
      <PostList
        posts={posts}
        dir={dir}
        mineCommunity={community.slug}
        hideCommunity
        empty={<EmptyState icon="comment" title="Be the first to speak" text="No discussions here yet. Start one and set the tone." />}
      />
    ),
    news: (
      <div className={s.pad}>
        {news.length > 0 && (
          <ul className={s.cards}>
            {news.map((n) => (
              <li key={n.id} className={s.news}>
                <p className={s.src}>
                  {n.source} · {timeAgo(n.ageMin)}
                </p>
                <p className={s.headline}>{n.headline}</p>
                <p className={s.disc}>
                  <Icon name="comment" size={15} /> {n.discussionCount} members are discussing this
                </p>
              </li>
            ))}
          </ul>
        )}
        <h3 className={s.sub}>Community reactions</h3>
        <PostList posts={newsPosts} dir={dir} hideCommunity empty={<p className={s.none}>No reactions yet.</p>} />
      </div>
    ),
    results: (
      <div className={s.pad}>
        <p className={s.note}>Results are about the conversation: what management said, what members noticed and what they&apos;re asking.</p>
        <PostList posts={earnings} dir={dir} hideCommunity empty={<EmptyState icon="comment" title="No results discussions" text="Earnings conversations will show up here during results season." />} />
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
              <h3>What members discuss</h3>
              <ul className={s.themes}>
                {asset.themes.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </>
          )}
        </section>
        {questions.length > 0 && (
          <>
            <h3 className={s.sub}>Questions members are asking</h3>
            <ul className={s.qs}>
              {questions.map((q) => (
                <li key={q.id}>
                  <Link href={`/community/${q.communitySlug}/post/${q.id}`}>
                    {q.title}
                    <Icon name="chevron" size={16} />
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
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
                    <small>
                      {u.tier} · {u.contributions.helpful} helpful
                    </small>
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
      <CommunityHeader community={community} asset={asset} />
      <CommunityTabs panels={panels} fundamentalsLabel={asset ? "Fundamentals" : "About"} />
      <Link href={`/create?community=${community.slug}`} className={s.fab} aria-label="Start a discussion">
        <Icon name="plus" size={22} />
        <span>Discuss</span>
      </Link>
    </>
  );
}
