"use client";

import { PageBanner } from "@/components/layout/PageBanner";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { UserProfile } from "@/components/user/UserProfile";
import { useStore } from "@/features/store/StoreProvider";
import type { Community, Directory, Post, User } from "@/types";
import s from "./MyProfile.module.scss";

interface Props {
  user: User;
  posts: Post[];
  communities: Community[];
  dir: Directory;
}

export function MyProfile({ user, posts, communities, dir }: Props) {
  const { isLoggedIn, session, openAuth, logout, upgrade, saved } = useStore();

  if (!isLoggedIn) {
    return (
      <>
      <PageBanner title="Your investing identity" text="Build reputation through the quality of your contributions." icon="user" hue={165} />
      <EmptyState
        icon="user"
        title="Your investing identity"
        text="Sign in to build your profile, earn reputation and join conversations."
        action={
          <div className={s.col}>
            <Button onClick={() => openAuth("Sign in to your MarketBrains profile")}>Sign in</Button>
            <Button variant="ghost" onClick={() => openAuth("Create your MarketBrains profile", "signup")}>
              Create account
            </Button>
          </div>
        }
      />
      </>
    );
  }

  return (
    <>
      <UserProfile user={user} posts={posts} communities={communities} dir={dir} isSelf />
      <div className={s.menu}>
        <div className={s.row}>
          <Icon name="bookmark" size={20} />
          <span>Saved posts</span>
          <span className={s.val}>{saved.length}</span>
        </div>
        {session?.plan !== "pro" && (
          <button type="button" className={s.row} onClick={upgrade}>
            <Icon name="sparkle" size={20} />
            <span>Upgrade to Pro to start discussions</span>
            <Icon name="chevron" size={18} />
          </button>
        )}
        <button type="button" className={`${s.row} ${s.out}`} onClick={logout}>
          <Icon name="logout" size={20} />
          <span>Sign out</span>
        </button>
      </div>
    </>
  );
}
