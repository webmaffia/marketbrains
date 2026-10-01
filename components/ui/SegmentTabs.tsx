"use client";

import { useRef, type KeyboardEvent } from "react";
import { cx } from "@/lib/format";
import s from "./SegmentTabs.module.scss";

interface Props<T extends string> {
  tabs: { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  label: string;
  /** "underline" for scrollable page tabs; "pill" for compact segmented control. */
  variant?: "underline" | "pill";
  idPrefix?: string;
}

/** Accessible tablist with roving arrow-key navigation. Pair panels with `role="tabpanel"` + `aria-labelledby={`${idPrefix}-${id}`}`. */
export function SegmentTabs<T extends string>({ tabs, value, onChange, label, variant = "underline", idPrefix = "tab" }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null);

  const onKey = (e: KeyboardEvent) => {
    const i = tabs.findIndex((t) => t.id === value);
    const next = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
    if (next === null) return;
    e.preventDefault();
    const t = tabs[(next + tabs.length) % tabs.length];
    onChange(t.id);
    ref.current?.querySelector<HTMLElement>(`#${idPrefix}-${t.id}`)?.focus();
  };

  return (
    <div ref={ref} className={cx(s.tabs, s[variant], "hide-scrollbar")} role="tablist" aria-label={label} onKeyDown={onKey}>
      {tabs.map((t) => (
        <button
          key={t.id}
          id={`${idPrefix}-${t.id}`}
          type="button"
          role="tab"
          aria-selected={value === t.id}
          tabIndex={value === t.id ? 0 : -1}
          className={cx(s.tab, value === t.id && s.on)}
          onClick={(e) => {
            onChange(t.id);
            e.currentTarget.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
          }}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
