"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationItem } from "@/components/community/NotificationItem";
import { useStore } from "@/features/store/StoreProvider";
import type { Notification, User } from "@/types";
import s from "./NotificationsView.module.scss";

export function NotificationsView({ items, users }: { items: Notification[]; users: Record<string, User> }) {
  const { isLoggedIn, readNotifs, markRead, markAllRead, openAuth } = useStore();

  if (!isLoggedIn) {
    return (
      <EmptyState
        icon="bell"
        title="Stay in the conversation"
        text="Sign in to see replies, mentions and new followers."
        action={<Button onClick={() => openAuth("Sign in to see your notifications")}>Sign in</Button>}
      />
    );
  }

  const isUnread = (n: Notification) => !n.read && !readNotifs.includes(n.id);
  const unreadIds = items.filter(isUnread).map((n) => n.id);
  const fresh = items.filter(isUnread);
  const earlier = items.filter((n) => !isUnread(n));

  if (!items.length) return <EmptyState icon="bell" title="All quiet" text="When people reply to or follow you, it shows up here." />;

  const section = (title: string, list: Notification[]) =>
    list.length > 0 && (
      <section aria-label={title}>
        <h2 className={s.h}>{title}</h2>
        <div className={s.group}>
          {list.map((n) => (
            <NotificationItem key={n.id} item={n} actor={n.actorId ? users[n.actorId] : undefined} unread={isUnread(n)} onOpen={() => markRead(n.id)} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      {unreadIds.length > 0 && (
        <div className={s.bar}>
          <Button variant="secondary" size="sm" onClick={() => markAllRead(unreadIds)}>
            Mark all as read
          </Button>
        </div>
      )}
      {section("New", fresh)}
      {section("Earlier", earlier)}
    </>
  );
}
