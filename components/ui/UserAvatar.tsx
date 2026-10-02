"use client";

import { useState } from "react";
import type { User } from "@/types";
import { initials } from "@/lib/format";
import s from "./UserAvatar.module.scss";

export function UserAvatar({ user, size = 40 }: { user: Pick<User, "name" | "hue" | "avatarUrl">; size?: number }) {
  const [broken, setBroken] = useState(false);

  if (user.avatarUrl && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- external, size-varying avatar; not worth next/image config here
      <img
        className={s.photo}
        src={user.avatarUrl}
        alt=""
        width={size}
        height={size}
        style={{ width: size, height: size }}
        onError={() => setBroken(true)}
      />
    );
  }

  return (
    <span
      className={s.avatar}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.38,
        background: `linear-gradient(145deg, hsl(${user.hue} 80% 62%), hsl(${(user.hue + 40) % 360} 75% 48%))`,
      }}
      aria-hidden="true"
    >
      {initials(user.name)}
    </span>
  );
}
