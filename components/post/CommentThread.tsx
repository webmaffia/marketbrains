"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import { compact, cx, timeAgo } from "@/lib/format";
import type { Comment, Directory } from "@/types";
import s from "./CommentThread.module.scss";

interface Props {
  postId: string;
  comments: Comment[];
  dir: Directory;
}

export function CommentThread({ postId, comments, dir }: Props) {
  const { profile, likedComments, toggleCommentLike, addComment, isLoggedIn, openAuth } = useStore();
  const [replyTo, setReplyTo] = useState<Comment | null>(null);
  // Comments posted in this session, shown immediately; the server list takes over on the next load.
  const [added, setAdded] = useState<Comment[]>([]);
  // Like offsets since the page loaded (server counts already include earlier likes).
  const [likeDelta, setLikeDelta] = useState<Record<string, number>>({});
  const [sending, setSending] = useState(false);
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const all = [...comments, ...added.filter((a) => !comments.some((c) => c.id === a.id))];
  const authorOf = (id: string) => dir.users[id] ?? (profile?.id === id ? profile : undefined);
  const top = all.filter((c) => !c.parentId);
  const repliesOf = (id: string) => all.filter((c) => c.parentId === id);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    // Replies are flattened to one level: replying to a reply attaches to its parent.
    const created = await addComment(postId, body, replyTo ? (replyTo.parentId ?? replyTo.id) : undefined);
    setSending(false);
    if (!created) return;
    setAdded((a) => [...a, created]);
    setText("");
    setReplyTo(null);
  };

  const likeComment = (id: string, liked: boolean) => {
    if (isLoggedIn) setLikeDelta((d) => ({ ...d, [id]: (d[id] ?? 0) + (liked ? -1 : 1) }));
    toggleCommentLike(id);
  };

  const startReply = (c: Comment) => {
    setReplyTo(c);
    inputRef.current?.focus();
  };

  const renderOne = (c: Comment, isReply = false) => {
    const author = authorOf(c.authorId);
    if (!author) return null;
    const liked = likedComments.includes(c.id);
    return (
      <li key={c.id} className={cx(s.item, isReply && s.reply)}>
        <Link href={`/user/${author.username}`} aria-label={`${author.name}'s profile`}>
          <UserAvatar user={author} size={isReply ? 28 : 34} />
        </Link>
        <div className={s.content}>
          <p className={s.meta}>
            <Link href={`/user/${author.username}`} className={s.name}>
              {author.name}
            </Link>
            <span>{timeAgo(c.ageMin)}</span>
          </p>
          <p className={s.body}>{c.body}</p>
          <div className={s.actions}>
            <button type="button" className={cx(s.act, liked && s.liked)} aria-pressed={liked} onClick={() => likeComment(c.id, liked)}>
              <Icon name="heart" size={16} filled={liked} />
              {compact(c.likes + (likeDelta[c.id] ?? 0))}
            </button>
            <button type="button" className={s.act} onClick={() => (isLoggedIn ? startReply(c) : openAuth("Sign in to reply"))}>
              Reply
            </button>
          </div>
        </div>
      </li>
    );
  };

  return (
    <section aria-label="Comments" className={s.thread}>
      <h2 className={s.heading}>{all.length} Comments</h2>
      {top.length === 0 ? (
        <EmptyState icon="comment" title="Start the conversation" text="Be the first to share a perspective on this discussion." />
      ) : (
        <ul className={s.list}>
          {top.map((c) => (
            <li key={c.id} className={s.group}>
              <ul>{renderOne(c)}</ul>
              {repliesOf(c.id).length > 0 && <ul className={s.replies}>{repliesOf(c.id).map((r) => renderOne(r, true))}</ul>}
            </li>
          ))}
        </ul>
      )}

      <form className={s.composer} onSubmit={submit}>
        {replyTo && (
          <div className={s.replying}>
            Replying to {authorOf(replyTo.authorId)?.name ?? "comment"}
            <button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply">
              <Icon name="close" size={14} />
            </button>
          </div>
        )}
        {isLoggedIn ? (
          <div className={s.inputRow}>
            <textarea
              ref={inputRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Add a thoughtful comment…"
              aria-label="Add a comment"
              enterKeyHint="send"
            />
            <button type="submit" className={s.send} disabled={!text.trim() || sending} aria-label="Post comment">
              <Icon name="plus" size={20} style={{ transform: "rotate(0deg)" }} />
            </button>
          </div>
        ) : (
          <button type="button" className={s.signin} onClick={() => openAuth("Sign in to join the discussion")}>
            Sign in to join the discussion
          </button>
        )}
      </form>
    </section>
  );
}
