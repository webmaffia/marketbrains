"use client";

import { setLang, useLang } from "@/lib/lang";
import s from "./Localized.module.scss";

/** Text in the reader's language. Falls back to English when there is no Hindi version. */
export function L({ en, hi }: { en: string; hi?: string | null }) {
  const lang = useLang();
  return <>{lang === "hi" && hi ? hi : en}</>;
}

/** A list of points in the reader's language. */
export function LList({ en, hi, className }: { en: string[]; hi?: string[] | null; className?: string }) {
  const lang = useLang();
  const items = lang === "hi" && hi && hi.length ? hi : en;
  return (
    <ul className={className}>
      {items.map((t, i) => (
        <li key={`${i}-${t}`}>{t}</li>
      ))}
    </ul>
  );
}

/** English / हिन्दी switch for the news. The choice is remembered on this device. */
export function LangToggle() {
  const lang = useLang();
  return (
    <div className={s.toggle} role="group" aria-label="Language">
      <button type="button" className={lang === "en" ? s.on : undefined} aria-pressed={lang === "en"} onClick={() => setLang("en")}>
        EN
      </button>
      <button type="button" className={lang === "hi" ? s.on : undefined} aria-pressed={lang === "hi"} onClick={() => setLang("hi")} lang="hi">
        हिं
      </button>
    </div>
  );
}
