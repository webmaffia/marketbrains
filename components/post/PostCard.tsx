"use client";

import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import { cx, timeAgo } from "@/lib/format";
import type { Directory, Post } from "@/types";
import { LikeButton } from "./LikeButton";
import { PollCard } from "./PollCard";
import a from "./Actions.module.scss";
import s from "./PostCard.module.scss";

interface Props {
  post: Post;
  dir: Directory;
  /** Hide the community line (used inside a community page). */
  hideCommunity?: boolean;
  /** Detail view: full body, no card link. */
  detail?: boolean;
}

const stanceLabel = { bull: "Bullish view", bear: "Bearish view", neutral: "" } as const;

export function PostCard({ post, dir, hideCommunity, detail }: Props) {
  const { liked, saved, myComments, toggleLike, toggleSave, showToast } = useStore();
  const author = dir.users[post.authorId];
  const community = dir.communities[post.communitySlug];
  const isLiked = liked.includes(post.id);
  const isSaved = saved.includes(post.id);
  const commentCount = post.comments + myComments.filter((c) => c.postId === post.id).length;
  const href = `/community/${post.communitySlug}/post/${post.id}`;

  const share = async () => {
    const url = `${location.origin}${href}`;
    try {
      if (navigator.share) await navigator.share({ title: post.title, url });
      else {
        await navigator.clipboard.writeText(url);
        showToast("Link copied");
      }
    } catch {}
  };

  return (
    <article className={cx(s.card, detail && s.detail)}>
      <header className={s.head}>
        <Link href={`/user/${author.username}`} className={s.author} aria-label={`${author.name}'s profile`}>
          <UserAvatar user={author} size={detail ? 40 : 32} />
        </Link>
        <div className={s.who}>
          <Link href={`/user/${author.username}`} className={s.name}>
            {author.name}
            {author.verified && <Icon name="verified" size={12} filled className={s.verified} />}
          </Link>
          <p className={s.sub}>
            {!hideCommunity && (
              <>
                <Link href={`/community/${community.slug}`} className={s.comm}>
                  {community.name}
                </Link>
                {" · "}
              </>
            )}
            {timeAgo(post.ageMin)}
          </p>
        </div>
      </header>

      {post.stance && post.stance !== "neutral" && (
        <span className={cx(s.stance, s[post.stance])}>
          <Icon name={post.stance} size={14} />
          {stanceLabel[post.stance]}
        </span>
      )}

      {detail ? (
        <h2 className={cx(s.title, s.titleDetail)}>{post.title}</h2>
      ) : (
        <h2 className={s.title}>
          <Link href={href} className={s.stretch}>
            {post.title}
          </Link>
        </h2>
      )}
      <p className={detail ? s.bodyFull : s.body}>{post.body}</p>

      {post.hasImage && (
        <div className={s.image} role="img" aria-label="Image attachment placeholder">
          <Icon name="image" size={22} />
        </div>
      )}
      {post.poll && <PollCard postId={post.id} poll={post.poll} />}

      {post.topics.length > 0 && (
        <ul className={s.tags}>
          {post.topics.map((t) => (
            <li key={t}>
              <Link href={`/community/${t}`} className={s.tag}>
                #{t.replace(/-/g, "")}
              </Link>
            </li>
          ))}
        </ul>
      )}

      <footer className={s.foot}>
        <LikeButton active={isLiked} count={post.likes + (isLiked ? 1 : 0)} onToggle={() => toggleLike(post.id)} />
        <Link href={href} className={a.action} aria-label={`${commentCount} comments`}>
          <Icon name="comment" size={18} />
          <span>{commentCount}</span>
        </Link>
        <span className={s.spacer} />
        <button type="button" className={cx(a.action, isSaved && a.saved)} onClick={() => toggleSave(post.id)} aria-pressed={isSaved} aria-label={isSaved ? "Unsave post" : "Save post"}>
          <Icon name="bookmark" size={18} filled={isSaved} />
        </button>
        <button type="button" className={a.action} onClick={share} aria-label="Share post">
          <Icon name="share" size={18} />
        </button>
      </footer>
    </article>
  );
}
