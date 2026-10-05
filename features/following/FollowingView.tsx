"use client";

import { PageBanner } from "@/components/layout/PageBanner";

import { useState } from "react";
import Link from "next/link";
import { CommunityCard } from "@/components/community/CommunityCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { FollowButton } from "@/components/user/FollowButton";
import { useStore } from "@/features/store/StoreProvider";
import type { Community, User } from "@/types";
import s from "./FollowingView.module.scss";

type Tab = "communities" | "people";

export function FollowingView({ communities, users }: { communities: Community[]; users: User[] }) {
  const { isLoggedIn, hydrated, session, joined, following, openAuth } = useStore();
  const [tab, setTab] = useState<Tab>("communities");

  if (!hydrated) return null;

  if (!isLoggedIn) {
    return (
      <>
      <PageBanner title="Your circle" text="The people and communities you learn from, in one place." icon="users" hue={160} />
      <EmptyState
        icon="users"
        title="Follow what matters to you"
        text="Sign in to keep track of the communities and people you learn from."
        action={
          <div className={s.actions}>
            <Button onClick={() => openAuth("Sign in to see who you follow")}>Sign in</Button>
            <Button variant="ghost" href="/discover">
              Browse communities
            </Button>
          </div>
        }
      />
      </>
    );
  }

  const myCommunities = communities.filter((c) => joined.includes(c.slug));
  const myPeople = users.filter((u) => following.includes(u.id));
  const suggested = users.filter((u) => !following.includes(u.id) && u.id !== session?.userId).slice(0, 3);

  return (
    <>
      <PageBanner size="slim" title="Your circle" text="People and communities you learn from." icon="users" hue={160} />
      <SegmentTabs
        variant="pill"
        label="Following"
        idPrefix="fol"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "communities", label: `Communities · ${myCommunities.length}` },
          { id: "people", label: `People · ${myPeople.length}` },
        ]}
      />
      <div role="tabpanel" aria-labelledby={`fol-${tab}`} className={s.panel}>
        {tab === "communities" ? (
          myCommunities.length ? (
            <div className={s.group}>
              {myCommunities.map((c) => (
                <CommunityCard key={c.slug} community={c} />
              ))}
            </div>
          ) : (
            <EmptyState icon="compass" title="No communities yet" text="Join a few communities to personalise your home feed." action={<Button href="/discover">Discover</Button>} />
          )
        ) : myPeople.length ? (
          <div className={s.group}>
            {myPeople.map((u) => (
              <PersonRow key={u.id} user={u} />
            ))}
          </div>
        ) : (
          <EmptyState icon="users" title="Not following anyone" text="Follow thoughtful contributors to see their discussions first." />
        )}

        {tab === "people" && suggested.length > 0 && (
          <>
            <h2 className={s.h}>Worth following</h2>
            <div className={s.group}>
              {suggested.map((u) => (
                <PersonRow key={u.id} user={u} />
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PersonRow({ user }: { user: User }) {
  return (
    <div className={s.person}>
      <Link href={`/user/${user.username}`} className={s.link}>
        <UserAvatar user={user} size={46} />
        <span className={s.text}>
          <span className={s.name}>{user.name}</span>
          <span className={s.sub}>
            {user.tier} · {user.contributions.helpful} helpful answers
          </span>
        </span>
      </Link>
      <FollowButton userId={user.id} />
    </div>
  );
}
