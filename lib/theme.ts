export type ThemeChoice = "system" | "light" | "dark";
export const THEME_KEY = "mb-theme";
export const THEME_COLORS = { light: "#eff4f2", dark: "#0c1317" } as const;

/** Inline, render-blocking snippet (see app/layout.tsx): sets the saved theme before first paint. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="dark"||t==="light")document.documentElement.setAttribute("data-theme",t)}catch(e){}`;

export function storedTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    return t === "light" || t === "dark" ? t : "system";
  } catch {
    return "system";
  }
}

/** Applies a choice to the page and the browser's status-bar colour. "system" removes the override. */
export function applyTheme(choice: ThemeChoice, persist = true) {
  const root = document.documentElement;
  if (choice === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", choice);

  if (persist) {
    try {
      if (choice === "system") localStorage.removeItem(THEME_KEY);
      else localStorage.setItem(THEME_KEY, choice);
    } catch {}
  }

  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    m.dataset.orig ??= m.content;
    m.content = choice === "system" ? m.dataset.orig : THEME_COLORS[choice];
  });
}
