"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import s from "./BottomNav.module.scss";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/following", label: "Following", icon: "users" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/profile", label: "Profile", icon: "user" },
];

const HIDDEN = [/^\/create/, /^\/search/, /^\/community\/[^/]+\/post\//];

export function BottomNav({ notificationIds }: { notificationIds: string[] }) {
  const pathname = usePathname();
  const { isLoggedIn, readNotifs } = useStore();
  if (HIDDEN.some((r) => r.test(pathname))) return null;

  const unread = isLoggedIn ? notificationIds.filter((id) => !readNotifs.includes(id)).length : 0;

  return (
    <nav className={s.nav} aria-label="Primary">
      <ul className={s.pill}>
        {items.map((it) => {
          const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
          return (
            <li key={it.href}>
              <Link href={it.href} className={s.item} aria-current={active ? "page" : undefined}>
                <span className={s.iconWrap}>
                  <Icon name={it.icon} size={24} filled={active && it.icon !== "compass" && it.icon !== "users"} />
                  {it.icon === "bell" && unread > 0 && <span className={s.badge} aria-label={`${unread} unread`}>{unread}</span>}
                </span>
                <span className={s.label}>{it.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
