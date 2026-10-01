"use client";

import { useStore } from "@/features/store/StoreProvider";
import { cx } from "@/lib/format";
import s from "./FollowButton.module.scss";

interface Props {
  userId?: string;
  /** For communities: toggles membership instead of following a person. */
  communitySlug?: string;
  size?: "sm" | "md";
}

export function FollowButton({ userId, communitySlug, size = "sm" }: Props) {
  const { following, joined, toggleFollow, toggleJoin } = useStore();
  const isCommunity = !!communitySlug;
  const on = isCommunity ? joined.includes(communitySlug!) : following.includes(userId!);
  const label = isCommunity ? (on ? "Joined" : "Join") : on ? "Following" : "Follow";
  return (
    <button
      type="button"
      className={cx(s.btn, on && s.on, size === "md" && s.md)}
      aria-pressed={on}
      onClick={() => (isCommunity ? toggleJoin(communitySlug!) : toggleFollow(userId!))}
    >
      {label}
    </button>
  );
}
