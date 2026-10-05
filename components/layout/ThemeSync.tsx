"use client";

import { useEffect } from "react";
import { applyTheme, storedTheme } from "@/lib/theme";

/** Keeps the status-bar colour in step with a saved theme choice after load. */
export function ThemeSync() {
  useEffect(() => {
    const choice = storedTheme();
    if (choice !== "system") applyTheme(choice, false);
  }, []);
  return null;
}
