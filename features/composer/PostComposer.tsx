"use client";

import { PageBanner } from "@/components/layout/PageBanner";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BackButton } from "@/components/layout/BackButton";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Icon } from "@/components/ui/Icon";
import { TopicChip } from "@/components/ui/TopicChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CommunityBadge } from "@/components/community/CommunityCard";
import { useStore } from "@/features/store/StoreProvider";
import { cx } from "@/lib/format";
import { checkContent } from "@/lib/contentFilter";
import { IMAGE_ACCEPT, prepareImage, validateImage } from "@/lib/image";
import { supabase } from "@/lib/supabase";
import type { Community, NewsItem, Stance, Topic, User } from "@/types";
import s from "./PostComposer.module.scss";

interface Props {
  communities: Community[];
  topics: Topic[];
  users: User[];
  defaultCommunity?: string;
  /** When set, the post is a reaction to this news item and is filed in its community. */
  news?: NewsItem;
}

type Sheet = "community" | "topics" | null;
const MAX_TOPICS = 3;

export function PostComposer({ communities, topics, users, defaultCommunity, news }: Props) {
  const router = useRouter();
  const { draft, setDraft, addPost, showToast, hydrated, session } = useStore();
  const [title, setTitle] = useState(news ? `Reaction: ${news.headline}`.slice(0, 140) : "");
  const [body, setBody] = useState("");
  const [slug, setSlug] = useState(defaultCommunity ?? "");
  const [tags, setTags] = useState<string[]>([]);
  const [stance, setStance] = useState<Stance>("neutral");
  const [poll, setPoll] = useState<string[] | null>(null);
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [query, setQuery] = useState("");
  const [posting, setPosting] = useState(false);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const restored = useRef(false);
  const pageRef = useRef<HTMLDivElement>(null);

  // iOS Safari does not resize the layout viewport for the keyboard; track the visual viewport
  // so the toolbar stays above the keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    const el = pageRef.current;
    if (!vv || !el) return;
    const fit = () => {
      el.style.height = `${vv.height}px`;
      el.style.top = `${vv.offsetTop}px`;
    };
    fit();
    vv.addEventListener("resize", fit);
    vv.addEventListener("scroll", fit);
    return () => {
      vv.removeEventListener("resize", fit);
      vv.removeEventListener("scroll", fit);
    };
  }, []);

  // Restore a saved draft once the store has hydrated from localStorage.
  useEffect(() => {
    if (!hydrated || restored.current) return;
    restored.current = true;
    if (!draft || news) return;
    /* eslint-disable react-hooks/set-state-in-effect -- one-time restore of a persisted draft */
    try {
      const d = JSON.parse(draft);
      setTitle(d.title ?? "");
      setBody(d.body ?? "");
      if (!defaultCommunity) setSlug(d.slug ?? "");
      setTags(d.tags ?? []);
      setStance(d.stance ?? "neutral");
      setPoll(d.poll ?? null);
      showToast("Draft restored");
    } catch {}
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [hydrated, draft, defaultCommunity, news, showToast]);

  const community = communities.find((c) => c.slug === slug);
  const mention = /(?:^|\s)@([\w.]*)$/.exec(body);
  const mentionResults = mention ? users.filter((u) => u.username.toLowerCase().startsWith(mention[1].toLowerCase())).slice(0, 4) : [];
  const pollValid = !poll || poll.filter((o) => o.trim()).length >= 2;
  const violation = checkContent(title, body, ...(poll ?? []));
  const canPost = title.trim().length >= 8 && !!community && pollValid && !posting && !violation;
  const dirty = !!(title || body || poll);

  const saveDraft = () => {
    setDraft(JSON.stringify({ title, body, slug, tags, stance, poll }));
    showToast("Draft saved");
  };

  const insertMention = (username: string) => {
    setBody((b) => b.replace(/@([\w.]*)$/, `@${username} `));
    bodyRef.current?.focus();
  };

  const pickImage = async (file?: File) => {
    if (!file) return;
    const problem = validateImage(file);
    if (problem) return showToast(problem);
    const ready = await prepareImage(file);
    if (ready.size > 5 * 1024 * 1024) return showToast("Image must be under 5 MB");
    setImage((cur) => {
      if (cur) URL.revokeObjectURL(cur.preview);
      return { file: ready, preview: URL.createObjectURL(ready) };
    });
  };

  const removeImage = () => {
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  };

  const publish = async () => {
    if (!canPost || !community || !session) return;
    const options = poll?.filter((o) => o.trim()) ?? [];
    setPosting(true);

    // Upload first so a failed upload never leaves a half-made post.
    let imageUrl: string | undefined;
    if (image) {
      const t = image.file.type;
      const ext = t === "image/webp" ? "webp" : t === "image/png" ? "png" : t === "image/gif" ? "gif" : "jpg";
      const path = `${session.userId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from("post-images").upload(path, image.file, { contentType: t, cacheControl: "31536000" });
      if (error) {
        setPosting(false);
        return showToast("Couldn't upload the image. Try again.");
      }
      imageUrl = supabase.storage.from("post-images").getPublicUrl(path).data.publicUrl;
    }

    const id = await addPost({
      communitySlug: community.slug,
      topics: tags,
      type: poll ? "poll" : "discussion",
      stance,
      title: title.trim(),
      body: body.trim(),
      imageUrl,
      pollOptions: poll ? options : undefined,
      newsId: news?.id,
    });
    setPosting(false);
    if (!id) return;
    showToast("Discussion posted");
    router.replace(`/community/${community.slug}/post/${id}`);
  };

  const toggleTag = (t: string) => setTags((cur) => (cur.includes(t) ? cur.filter((x) => x !== t) : cur.length < MAX_TOPICS ? [...cur, t] : cur));
  const filteredCommunities = communities.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div ref={pageRef} className={s.page}>
      <header className={s.bar}>
        <BackButton fallbackHref="/" />
        <h1>New discussion</h1>
        <button type="button" className={s.post} disabled={!canPost} onClick={publish}>
          Post
        </button>
      </header>

      <div className={s.scroll}>
        <PageBanner size="slim" title="Start a thoughtful discussion" text="Ask, explain or challenge. Skip the tips and calls." icon="comment" hue={158} />
        {news && (
          <p className={s.reacting}>
            <Icon name="comment" size={16} />
            <span>Reacting to: {news.headline}</span>
          </p>
        )}
        <button type="button" className={s.picker} onClick={() => !news && setSheet("community")} disabled={!!news}>
          {community ? (
            <>
              <CommunityBadge community={community} size={28} />
              <span>{community.name}</span>
            </>
          ) : (
            <>
              <Icon name="hash" size={20} />
              <span className={s.ph}>Choose a community</span>
            </>
          )}
          <Icon name="chevron" size={16} />
        </button>

        <label className="sr-only" htmlFor="c-title">
          Title
        </label>
        <input id="c-title" className={s.title} placeholder="What do you want to discuss?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} />

        <label className="sr-only" htmlFor="c-body">
          Details
        </label>
        <textarea ref={bodyRef} id="c-body" className={s.body} placeholder="Share your perspective, ask a question, or start a debate… Use @ to mention someone." value={body} onChange={(e) => setBody(e.target.value)} />

        {violation && (
          <p className={s.violation} role="alert">
            {violation.message}
          </p>
        )}

        {mentionResults.length > 0 && (
          <ul className={s.mentions} role="listbox" aria-label="Mention suggestions">
            {mentionResults.map((u) => (
              <li key={u.id}>
                <button type="button" role="option" aria-selected={false} onClick={() => insertMention(u.username)}>
                  <UserAvatar user={u} size={28} />
                  <span>
                    <strong>{u.name}</strong> <small>@{u.username}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {image && (
          <div className={s.preview}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
            <img src={image.preview} alt="Selected image preview" />
            <button type="button" onClick={removeImage} aria-label="Remove image">
              <Icon name="close" size={16} />
            </button>
          </div>
        )}

        {poll && (
          <fieldset className={s.poll}>
            <legend>Poll options</legend>
            {poll.map((o, i) => (
              <div key={i} className={s.opt}>
                <input
                  value={o}
                  placeholder={`Option ${i + 1}`}
                  aria-label={`Poll option ${i + 1}`}
                  maxLength={60}
                  onChange={(e) => setPoll(poll.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {poll.length > 2 && (
                  <button type="button" onClick={() => setPoll(poll.filter((_, j) => j !== i))} aria-label={`Remove option ${i + 1}`}>
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}
            <div className={s.pollActions}>
              {poll.length < 4 && (
                <button type="button" onClick={() => setPoll([...poll, ""])}>
                  + Add option
                </button>
              )}
              <button type="button" onClick={() => setPoll(null)}>
                Remove poll
              </button>
            </div>
          </fieldset>
        )}

        <div className={s.stance} role="group" aria-label="Your perspective">
          {(["neutral", "bull", "bear"] as Stance[]).map((st) => (
            <button key={st} type="button" className={cx(s.st, stance === st && s[st])} aria-pressed={stance === st} onClick={() => setStance(st)}>
              {st === "neutral" ? "Open question" : st === "bull" ? "Bullish view" : "Bearish view"}
            </button>
          ))}
        </div>

        {tags.length > 0 && (
          <div className={s.tags}>
            {tags.map((t) => (
              <TopicChip key={t} label={t.replace(/-/g, " ")} prefix="#" tone="accent" onClick={() => toggleTag(t)} />
            ))}
          </div>
        )}
      </div>

      <div className={s.tools}>
        <button type="button" onClick={() => setSheet("topics")} aria-label="Add topics">
          <Icon name="hash" size={22} />
        </button>
        <button type="button" onClick={() => setBody((b) => b + (b && !/\s$/.test(b) ? " @" : "@"))} aria-label="Mention someone">
          <Icon name="at" size={22} />
        </button>
        <input
          ref={fileRef}
          type="file"
          accept={IMAGE_ACCEPT}
          hidden
          onChange={(e) => {
            pickImage(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Add image" aria-pressed={!!image}>
          <Icon name="image" size={22} />
        </button>
        <button type="button" onClick={() => setPoll((p) => p ?? ["", ""])} aria-label="Add poll" aria-pressed={!!poll}>
          <Icon name="poll" size={22} />
        </button>
        <span className={s.spacer} />
        <button type="button" className={s.draft} onClick={saveDraft} disabled={!dirty}>
          Save draft
        </button>
      </div>

      <BottomSheet open={sheet === "community"} onClose={() => setSheet(null)} title="Post to">
        <input className={s.sheetSearch} type="search" placeholder="Search communities" value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search communities" />
        <ul className={s.list}>
          {filteredCommunities.map((c) => (
            <li key={c.slug}>
              <button
                type="button"
                className={s.row}
                onClick={() => {
                  setSlug(c.slug);
                  setSheet(null);
                  setQuery("");
                }}
              >
                <CommunityBadge community={c} size={36} />
                <span>{c.name}</span>
                {c.slug === slug && <Icon name="check" size={18} />}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      <BottomSheet open={sheet === "topics"} onClose={() => setSheet(null)} title={`Topics (${tags.length}/${MAX_TOPICS})`}>
        <div className={s.topicGrid}>
          {topics.map((t) => (
            <TopicChip key={t.slug} label={t.name} prefix="#" active={tags.includes(t.slug)} onClick={() => toggleTag(t.slug)} />
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}
