"use client";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { NotificationItem } from "@/components/community/NotificationItem";
import { useStore } from "@/features/store/StoreProvider";
import type { Notification } from "@/types";
import s from "./NotificationsView.module.scss";

export function NotificationsView() {
  const { isLoggedIn, hydrated, notifications: items, markRead, markAllRead, openAuth } = useStore();

  if (!hydrated) return null;

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

  const fresh = items.filter((n) => !n.read);
  const earlier = items.filter((n) => n.read);

  if (!items.length) return <EmptyState icon="bell" title="All quiet" text="When people reply to or follow you, it shows up here." />;

  const section = (title: string, list: Notification[]) =>
    list.length > 0 && (
      <section aria-label={title}>
        <h2 className={s.h}>{title}</h2>
        <div className={s.group}>
          {list.map((n) => (
            <NotificationItem key={n.id} item={n} actor={n.actor} unread={!n.read} onOpen={() => markRead(n.id)} />
          ))}
        </div>
      </section>
    );

  return (
    <>
      {fresh.length > 0 && (
        <div className={s.bar}>
          <Button variant="secondary" size="sm" onClick={markAllRead}>
            Mark all as read
          </Button>
        </div>
      )}
      {section("New", fresh)}
      {section("Earlier", earlier)}
    </>
  );
}
