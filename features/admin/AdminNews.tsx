"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useStore } from "@/features/store/StoreProvider";
import { timeAgo } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import type { Community, NewsItem } from "@/types";
import s from "./AdminNews.module.scss";

/** Admin-only news desk. Access is enforced by the add_news / delete_news functions in the database; this screen just hides itself for everyone else. */
export function AdminNews({ communities, news }: { communities: Community[]; news: NewsItem[] }) {
  const router = useRouter();
  const { hydrated, profile, showToast } = useStore();
  const [community, setCommunity] = useState("");
  const [source, setSource] = useState("");
  const [headline, setHeadline] = useState("");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  if (!hydrated) return null;
  if (!profile?.isAdmin) {
    return <EmptyState icon="lock" title="Admins only" text="Your account doesn't have access to the news desk." action={<Button href="/">Back home</Button>} />;
  }

  const nameOf = (slug: string) => communities.find((c) => c.slug === slug)?.name ?? slug;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.rpc("add_news", { p_community: community, p_source: source, p_headline: headline, p_url: url || null });
    setBusy(false);
    if (error) return showToast(error.message);
    setHeadline("");
    setUrl("");
    showToast("News published");
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this news item? Reactions stay, but lose their link to it.")) return;
    const { error } = await supabase.rpc("delete_news", { p_id: id });
    if (error) return showToast(error.message);
    showToast("News deleted");
    router.refresh();
  };

  return (
    <div className={s.wrap}>
      <form className={s.form} onSubmit={submit}>
        <label className={s.field}>
          <span>Community</span>
          <select value={community} onChange={(e) => setCommunity(e.target.value)} required>
            <option value="" disabled>
              Choose a community
            </option>
            {communities.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className={s.field}>
          <span>Source</span>
          <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Market Desk" maxLength={60} />
        </label>
        <label className={s.field}>
          <span>Headline</span>
          <input value={headline} onChange={(e) => setHeadline(e.target.value)} placeholder="What happened?" minLength={8} maxLength={200} required />
        </label>
        <label className={s.field}>
          <span>Link (optional)</span>
          <input type="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" />
        </label>
        <Button type="submit" block disabled={busy || !community}>
          {busy ? "Publishing…" : "Publish news"}
        </Button>
      </form>

      <h2 className={s.h}>Recent news</h2>
      {news.length === 0 ? (
        <p className={s.none}>Nothing published yet.</p>
      ) : (
        <ul className={s.list}>
          {news.map((n) => (
            <li key={n.id} className={s.item}>
              <div>
                <p className={s.meta}>
                  {nameOf(n.communitySlug)} · {n.source} · {timeAgo(n.ageMin)}
                </p>
                <p className={s.title}>{n.headline}</p>
              </div>
              <button type="button" className={s.del} onClick={() => remove(n.id)}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
