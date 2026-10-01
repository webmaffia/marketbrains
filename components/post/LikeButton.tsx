"use client";

import { Icon } from "@/components/ui/Icon";
import { compact, cx } from "@/lib/format";
import s from "./Actions.module.scss";

interface Props {
  active: boolean;
  count: number;
  onToggle: () => void;
  label?: string;
}

export function LikeButton({ active, count, onToggle, label = "Like" }: Props) {
  return (
    <button type="button" className={cx(s.action, active && s.liked)} onClick={onToggle} aria-pressed={active} aria-label={`${label}, ${count}`}>
      <span key={String(active)} className={cx(s.ico, active && s.pop)}>
        <Icon name="heart" size={18} filled={active} />
      </span>
      <span>{compact(count)}</span>
    </button>
  );
}
