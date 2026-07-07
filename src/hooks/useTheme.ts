import { useCallback, useState } from "react";
import type { Theme } from "../types";

const KEY = "pmu.theme";
const ORDER: Theme[] = ["dark", "black", "light", "sepia"];

function currentTheme(): Theme {
  // The inline script in index.html has already set data-theme before paint.
  const attr = document.documentElement.dataset.theme as Theme | undefined;
  return attr && ORDER.includes(attr) ? attr : "dark";
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  // Keep the browser chrome color in sync with the resolved background.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    const bg = getComputedStyle(document.documentElement)
      .getPropertyValue("--bg")
      .trim();
    if (bg) meta.setAttribute("content", bg);
  }
}

export function useTheme(): [Theme, () => void, (t: Theme) => void] {
  const [theme, setThemeState] = useState<Theme>(currentTheme);

  const set = useCallback((next: Theme) => {
    applyTheme(next);
    try {
      localStorage.setItem(KEY, next);
    } catch {
      /* ignore */
    }
    setThemeState(next);
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = ORDER[(ORDER.indexOf(prev) + 1) % ORDER.length];
      applyTheme(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return [theme, toggle, set];
}
