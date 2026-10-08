"use client";

import { useSyncExternalStore } from "react";

export type Lang = "en" | "hi";
const KEY = "mb-lang";
const listeners = new Set<() => void>();

function read(): Lang {
  try {
    return localStorage.getItem(KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
}

export function setLang(lang: Lang) {
  try {
    localStorage.setItem(KEY, lang);
  } catch {}
  listeners.forEach((l) => l());
}

const subscribe = (cb: () => void) => {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
};

/** The reader's language. English on the server and the first paint, then their saved choice. */
export function useLang(): Lang {
  return useSyncExternalStore(subscribe, read, () => "en");
}
