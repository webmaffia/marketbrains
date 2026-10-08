"use client";

import Link from "next/link";
import { PageBanner } from "@/components/layout/PageBanner";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/ui/Icon";
import { UserProfile } from "@/components/user/UserProfile";
import { useStore } from "@/features/store/StoreProvider";
import { ThemeToggle } from "./ThemeToggle";
import { PushToggle } from "@/features/notifications/PushToggle";
import type { Community } from "@/types";
import s from "./MyProfile.module.scss";

interface Props {
  communities: Community[];
}

export function MyProfile({ communities }: Props) {
  const { isLoggedIn, hydrated, profile, session, openAuth, logout, upgrade } = useStore();

  if (!hydrated) return null;

  if (!isLoggedIn) {
    return (
      <>
      <PageBanner title="Your investing identity" text="Follow companies and share what you think of the news." icon="user" hue={165} />
      <EmptyState
        icon="user"
        title="Your investing identity"
        text="Sign in to build your profile, follow communities and vote on the news."
        action={
          <div className={s.col}>
            <Button onClick={() => openAuth("Sign in to your MarketBrains profile")}>Sign in</Button>
            <Button variant="ghost" onClick={() => openAuth("Create your MarketBrains profile", "signup")}>
              Create account
            </Button>
          </div>
        }
      />
      <div className={s.menu}>
        <ThemeToggle />
      </div>
      </>
    );
  }

  if (!profile) return null;

  return (
    <>
      <UserProfile user={profile} communities={communities} isSelf />
      <div className={s.menu}>
        <PushToggle />
        <ThemeToggle />
        {profile.isAdmin && (
          <>
            <Link href="/admin/communities" className={s.row}>
              <Icon name="users" size={20} />
              <span>Manage communities</span>
              <Icon name="chevron" size={18} />
            </Link>
            <Link href="/admin/news" className={s.row}>
              <Icon name="sparkle" size={20} />
              <span>Manage news</span>
              <Icon name="chevron" size={18} />
            </Link>
          </>
        )}
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
