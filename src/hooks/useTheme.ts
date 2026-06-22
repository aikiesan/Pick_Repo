import { useCallback, useState } from "react";
import type { Theme } from "../types";

const KEY = "pmu.theme";

function currentTheme(): Theme {
  // The inline script in index.html has already set data-theme before paint.
  const attr = document.documentElement.dataset.theme;
  return attr === "light" ? "light" : "dark";
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

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(currentTheme);

  const toggle = useCallback(() => {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      applyTheme(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return [theme, toggle];
}
