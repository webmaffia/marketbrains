import type { User } from "@/types";
import { initials } from "@/lib/format";
import s from "./UserAvatar.module.scss";

export function UserAvatar({ user, size = 40 }: { user: Pick<User, "name" | "hue">; size?: number }) {
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
