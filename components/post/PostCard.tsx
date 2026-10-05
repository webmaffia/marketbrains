"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import { cx, timeAgo } from "@/lib/format";
import { useCountDelta } from "@/lib/useCountDelta";
import type { Directory, Post } from "@/types";
import { Disclaimer } from "@/components/legal/Disclaimer";
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
  const router = useRouter();
  const { liked, saved, isLoggedIn, session, toggleLike, toggleSave, toggleMute, deletePost, showToast } = useStore();
  const [menu, setMenu] = useState(false);
  const isMine = session?.userId === post.authorId;
  const [likes, bumpLikes] = useCountDelta(post.likes);
  const author = dir.users[post.authorId];
  const community = dir.communities[post.communitySlug];
  const isLiked = liked.includes(post.id);
  const isSaved = saved.includes(post.id);
  const commentCount = post.comments;
  const href = `/community/${post.communitySlug}/post/${post.id}`;

  const onLike = () => {
    if (isLoggedIn) bumpLikes(isLiked ? -1 : 1);
    toggleLike(post.id);
  };

  const notInterested = () => {
    setMenu(false);
    toggleMute(post.authorId, author.name);
    if (detail) router.replace("/");
  };

  const remove = async () => {
    setMenu(false);
    if (!confirm("Delete this discussion? This can't be undone.")) return;
    if (!(await deletePost(post.id, post.imageUrl))) return;
    if (detail) router.replace(`/community/${post.communitySlug}`);
    else router.refresh();
  };

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

      {post.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- user uploads of arbitrary size; sized by CSS
        <img src={post.imageUrl} alt={`Image attached to ${post.title}`} className={s.photo} loading="lazy" />
      ) : (
        post.hasImage && (
          <div className={s.image} role="img" aria-label="Image attachment">
            <Icon name="image" size={22} />
          </div>
        )
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

      <Disclaimer />

      <footer className={s.foot}>
        <LikeButton active={isLiked} count={likes} onToggle={onLike} />
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
        <button type="button" className={a.action} onClick={() => setMenu(true)} aria-label="More options">
          <Icon name="more" size={18} />
        </button>
      </footer>

      <BottomSheet open={menu} onClose={() => setMenu(false)} title="Options">
        <ul className={s.menu}>
          {!isMine && (
            <li>
              <button type="button" onClick={notInterested}>
                <Icon name="close" size={20} />
                <span>
                  <strong>Not interested</strong>
                  <small>See fewer posts from {author.name}</small>
                </span>
              </button>
            </li>
          )}
          {isMine && (
            <li>
              <button type="button" className={s.danger} onClick={remove}>
                <Icon name="trash" size={20} />
                <span>
                  <strong>Delete discussion</strong>
                  <small>Removes it and its comments for good</small>
                </span>
              </button>
            </li>
          )}
        </ul>
      </BottomSheet>
    </article>
  );
}
