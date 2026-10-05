"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { applyTheme, storedTheme, type ThemeChoice } from "@/lib/theme";
import s from "./ThemeToggle.module.scss";

const options: { id: ThemeChoice; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/** Appearance row: follow the device by default, or force light / dark. */
export function ThemeToggle() {
  const [choice, setChoice] = useState<ThemeChoice>(() => (typeof window === "undefined" ? "system" : storedTheme()));

  const pick = (c: ThemeChoice) => {
    setChoice(c);
    applyTheme(c);
  };

  return (
    <div className={s.row}>
      <Icon name="sparkle" size={20} />
      <span>Appearance</span>
      <div className={s.seg} role="radiogroup" aria-label="Theme">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={choice === o.id} className={choice === o.id ? s.on : undefined} onClick={() => pick(o.id)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}
