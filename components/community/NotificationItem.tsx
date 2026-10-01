"use client";

import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cx, timeAgo } from "@/lib/format";
import type { Notification, User } from "@/types";
import s from "./NotificationItem.module.scss";

const icons: Record<Notification["type"], IconName> = {
  like: "heart",
  comment: "comment",
  reply: "comment",
  follow: "users",
  mention: "at",
  community: "sparkle",
};

interface Props {
  item: Notification;
  actor?: User;
  unread: boolean;
  onOpen: () => void;
}

export function NotificationItem({ item, actor, unread, onOpen }: Props) {
  return (
    <Link href={item.href} className={cx(s.item, unread && s.unread)} onClick={onOpen}>
      <span className={s.lead}>
        {actor ? (
          <UserAvatar user={actor} size={44} />
        ) : (
          <span className={s.sys}>
            <Icon name="sparkle" size={22} />
          </span>
        )}
        <span className={s.type} aria-hidden="true">
          <Icon name={icons[item.type]} size={11} filled />
        </span>
      </span>
      <span className={s.text}>
        <span>
          {actor && <strong>{actor.name} </strong>}
          {item.text}
        </span>
        <time className={s.time}>{timeAgo(item.ageMin)}</time>
      </span>
      {unread && <span className={s.dot} aria-label="Unread" />}
    </Link>
  );
}
