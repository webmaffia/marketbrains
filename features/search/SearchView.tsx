"use client";

import { PageBanner } from "@/components/layout/PageBanner";

import Link from "next/link";
import { useDeferredValue, useState } from "react";
import { CommunityCard } from "@/components/community/CommunityCard";
import { PostCard } from "@/components/post/PostCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { SearchBar } from "@/components/ui/SearchBar";
import { TopicChip } from "@/components/ui/TopicChip";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { BackButton } from "@/components/layout/BackButton";
import { FollowButton } from "@/components/user/FollowButton";
import type { Community, Directory, Post, User } from "@/types";
import s from "./SearchView.module.scss";

interface Props {
  communities: Community[];
  users: User[];
  posts: Post[];
  dir: Directory;
}

const suggestions = ["Reliance", "NVIDIA", "Bitcoin", "Dividend", "Earnings", "Beginners"];

export function SearchView({ communities, users, posts, dir }: Props) {
  const [q, setQ] = useState("");
  const deferred = useDeferredValue(q).trim().toLowerCase();

  const match = (...fields: string[]) => fields.some((f) => f.toLowerCase().includes(deferred));
  const cs = deferred ? communities.filter((c) => match(c.name, c.slug, c.tagline)) : [];
  const us = deferred ? users.filter((u) => match(u.name, u.username, u.bio)) : [];
  const ps = deferred ? posts.filter((p) => match(p.title, p.body)) : [];
  const none = deferred && !cs.length && !us.length && !ps.length;

  return (
    <>
      <div className={s.top}>
        <BackButton fallbackHref="/discover" />
        <SearchBar value={q} onChange={setQ} autoFocus />
      </div>

      {!deferred && (
        <>
        <PageBanner size="slim" title="Explore the conversation" text="Companies, people and ideas." icon="search" hue={190} />
        <section className={s.sugg} aria-label="Suggested searches">
          <h2>Try searching for</h2>
          <div className={s.chips}>
            {suggestions.map((t) => (
              <TopicChip key={t} label={t} prefix="#" onClick={() => setQ(t)} />
            ))}
          </div>
        </section>
        </>
      )}

      {none && <EmptyState icon="search" title="No matches" text={`Nothing found for “${q}”. Try a company, person or topic.`} />}

      <div aria-live="polite">
        {cs.length > 0 && (
          <section>
            <h2 className={s.h}>Communities</h2>
            <div className={s.group}>
              {cs.slice(0, 6).map((c) => (
                <CommunityCard key={c.slug} community={c} />
              ))}
            </div>
          </section>
        )}
        {us.length > 0 && (
          <section>
            <h2 className={s.h}>People</h2>
            <div className={s.group}>
              {us.map((u) => (
                <div key={u.id} className={s.person}>
                  <Link href={`/user/${u.username}`} className={s.plink}>
                    <UserAvatar user={u} size={44} />
                    <span>
                      <strong>{u.name}</strong>
                      <small>@{u.username}</small>
                    </span>
                  </Link>
                  <FollowButton userId={u.id} />
                </div>
              ))}
            </div>
          </section>
        )}
        {ps.length > 0 && (
          <section>
            <h2 className={s.h}>Discussions</h2>
            {ps.map((p) => (
              <PostCard key={p.id} post={p} dir={dir} />
            ))}
          </section>
        )}
      </div>
    </>
  );
}
