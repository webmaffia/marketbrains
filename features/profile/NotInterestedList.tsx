"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useStore } from "@/features/store/StoreProvider";
import type { User } from "@/types";
import s from "./NotInterestedList.module.scss";

/** Everyone the member muted, with a one-tap way to bring them back. */
export function NotInterestedList({ users }: { users: User[] }) {
  const { hydrated, isLoggedIn, muted, toggleMute, openAuth } = useStore();
  if (!hydrated) return null;

  if (!isLoggedIn) {
    return <EmptyState icon="block" title="Sign in to manage your feed" text="Choose whose posts you'd rather not see." action={<Button onClick={() => openAuth("Sign in to manage your feed")}>Sign in</Button>} />;
  }

  const list = users.filter((u) => muted.includes(u.id));
  if (!list.length) {
    return <EmptyState icon="block" title="Nobody hidden" text={"When a post isn't for you, tap ••• and choose Not interested. Those people will show up here."} />;
  }

  return (
    <>
      <p className={s.intro}>You won&apos;t see posts from these people in your feeds. They can still see yours.</p>
      <ul className={s.list}>
        {list.map((u) => (
          <li key={u.id} className={s.row}>
            <Link href={`/user/${u.username}`} className={s.who}>
              <UserAvatar user={u} size={44} />
              <span>
                <strong>{u.name}</strong>
                <small>@{u.username}</small>
              </span>
            </Link>
            <Button variant="secondary" size="sm" onClick={() => toggleMute(u.id, u.name)}>
              Undo
            </Button>
          </li>
        ))}
      </ul>
    </>
  );
}
