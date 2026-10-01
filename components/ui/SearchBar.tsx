"use client";

import Link from "next/link";
import { Icon } from "./Icon";
import s from "./SearchBar.module.scss";

interface Props {
  value?: string;
  onChange?: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  /** Renders a link-styled bar that navigates to /search (used on Home/Discover). */
  href?: string;
}

export function SearchBar({ value, onChange, placeholder = "Search stocks, people, topics", autoFocus, href }: Props) {
  if (href) {
    return (
      <Link href={href} className={s.bar} aria-label="Search">
        <Icon name="search" size={18} />
        <span className={s.placeholder}>{placeholder}</span>
      </Link>
    );
  }
  return (
    <label className={s.bar}>
      <Icon name="search" size={18} />
      <input
        type="search"
        className={s.input}
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        enterKeyHint="search"
        autoCapitalize="none"
        autoCorrect="off"
        aria-label="Search"
      />
      {value && (
        <button type="button" className={s.clear} onClick={() => onChange?.("")} aria-label="Clear search">
          <Icon name="close" size={14} />
        </button>
      )}
    </label>
  );
}
