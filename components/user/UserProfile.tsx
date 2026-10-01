"use client";

import Link from "next/link";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PostList } from "@/components/post/PostList";
import { useStore } from "@/features/store/StoreProvider";
import { compact } from "@/lib/format";
import type { Community, Directory, Post, User } from "@/types";
import { FollowButton } from "./FollowButton";
import s from "./UserProfile.module.scss";

interface Props {
  user: User;
  posts: Post[];
  communities: Community[];
  dir: Directory;
  isSelf?: boolean;
}

export function UserProfile({ user, posts, communities, dir, isSelf }: Props) {
  const { isLoggedIn, following, joined, session } = useStore();
  // Quality signals lead; follower count is deliberately secondary.
  const c = user.contributions;
  const followers = user.followers + (!isSelf && following.includes(user.id) ? 1 : 0);
  const myCommunities = isSelf && isLoggedIn ? communities.filter((x) => joined.includes(x.slug)) : communities;

  return (
    <>
      <div className={s.cover} style={{ "--h": user.hue } as React.CSSProperties} aria-hidden="true" />
      <section className={s.head}>
        <UserAvatar user={user} size={84} />
        <h2 className={s.name}>
          {user.name}
          {user.verified && <Icon name="verified" size={18} filled className={s.verified} />}
        </h2>
        <p className={s.handle}>@{user.username}</p>
        <p className={s.bio}>{user.bio}</p>
        <div className={s.rep}>
          <Icon name="sparkle" size={16} />
          <strong>{compact(user.reputation)}</strong> reputation · {user.tier}
          {isSelf && session?.plan === "pro" && <span className={s.pro}>PRO</span>}
        </div>
        {!isSelf && (
          <div className={s.cta}>
            <FollowButton userId={user.id} size="md" />
          </div>
        )}
      </section>

      <dl className={s.stats}>
        <div>
          <dt>Helpful</dt>
          <dd>{compact(c.helpful)}</dd>
        </div>
        <div>
          <dt>Discussions</dt>
          <dd>{compact(c.discussions)}</dd>
        </div>
        <div>
          <dt>Comments</dt>
          <dd>{compact(c.comments)}</dd>
        </div>
      </dl>
      <p className={s.follows}>
        {compact(followers)} followers · {compact(user.following)} following
      </p>

      {myCommunities.length > 0 && (
        <section aria-labelledby="joined">
          <h2 id="joined" className={s.h}>
            Communities
          </h2>
          <div className={`${s.rail} hide-scrollbar`}>
            {myCommunities.slice(0, 10).map((x) => (
              <Link key={x.slug} href={`/community/${x.slug}`} className={s.comm}>
                <CommunityBadge community={x} size={44} />
                <span>{x.name.length > 14 ? x.name.split(" ")[0] : x.name}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section aria-labelledby="contrib">
        <h2 id="contrib" className={s.h}>
          Discussions
        </h2>
        <PostList
          posts={posts}
          dir={dir}
          mineAll={isSelf}
          empty={<p className={s.none}>No discussions yet.</p>}
        />
      </section>
    </>
  );
}
