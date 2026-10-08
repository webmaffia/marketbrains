"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "@/components/ui/Icon";
import { useStore } from "@/features/store/StoreProvider";
import s from "./BottomNav.module.scss";

const items: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/discover", label: "Discover", icon: "compass" },
  { href: "/news", label: "News", icon: "globe" },
  { href: "/following", label: "Following", icon: "users" },
  { href: "/notifications", label: "Alerts", icon: "bell" },
  { href: "/profile", label: "Profile", icon: "user" },
];

export function BottomNav() {
  const pathname = usePathname();
  const { isLoggedIn, unreadCount } = useStore();

  if (pathname === "/welcome") return null;

  const unread = isLoggedIn ? unreadCount : 0;

  return (
    <>
      {/* Full-width fade so scrolled content never ends abruptly behind the floating pill. */}
      <span className={s.backdrop} aria-hidden="true" />
      <nav className={s.nav} aria-label="Primary">
        <span className={s.sheen} aria-hidden="true" />
        <ul className={s.pill}>
          {items.map((it) => {
            const active = it.href === "/" ? pathname === "/" : pathname.startsWith(it.href);
            return (
              <li key={it.href}>
                <Link href={it.href} className={s.item} aria-current={active ? "page" : undefined}>
                  <span className={s.iconWrap}>
                    <Icon name={it.icon} size={22} filled={active && it.icon !== "compass" && it.icon !== "users"} />
                    {it.icon === "bell" && unread > 0 && <span className={s.badge} aria-label={`${unread} unread`}>{unread}</span>}
                  </span>
                  <span className={s.label}>{it.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
