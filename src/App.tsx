import { useCallback, useEffect, useMemo, useState } from "react";
import { Topbar } from "./components/Topbar";
import { Sidebar } from "./components/Sidebar";
import { Reader } from "./components/Reader";
import { Home } from "./components/Home";
import { useTheme } from "./hooks/useTheme";
import { useFontScale } from "./hooks/useFontScale";
import { useHashChapter } from "./hooks/useHashChapter";
import { loadPosition } from "./lib/position";
import { fetchWithCacheFallback, requestPersistentStorage } from "./lib/offline";
import type { Chapter } from "./types";

export default function App() {
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [loadError, setLoadError] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [theme, toggleTheme] = useTheme();
  const font = useFontScale();
  const { chapterNum, goToChapter } = useHashChapter();

  // Ask the browser to protect our caches from eviction (best-effort).
  useEffect(() => {
    requestPersistentStorage();
  }, []);

  // Font family toggle (Serif vs Sans)
  const [fontFamily, setFontFamily] = useState<"serif" | "sans">(() => {
    try {
      return (localStorage.getItem("pmu.fontFamily") as "serif" | "sans") || "serif";
    } catch {
      return "serif";
    }
  });

  const toggleFontFamily = useCallback(() => {
    setFontFamily((prev) => {
      const next = prev === "serif" ? "sans" : "serif";
      try {
        localStorage.setItem("pmu.fontFamily", next);
      } catch {}
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.dataset.font = fontFamily;
  }, [fontFamily]);

  // Read chapters tracking
  const [readChapters, setReadChapters] = useState<number[]>(() => {
    try {
      const saved = localStorage.getItem("pmu.read");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const markAsRead = useCallback((num: number) => {
    setReadChapters((prev) => {
      if (prev.includes(num)) return prev;
      const next = [...prev, num];
      try {
        localStorage.setItem("pmu.read", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  // Load the chapter index once. fetchWithCacheFallback keeps the app working
  // offline even when the service worker is not (yet) controlling the page.
  useEffect(() => {
    let cancelled = false;
    fetchWithCacheFallback(import.meta.env.BASE_URL + "chapters_index.json")
      .then((res) => res.json())
      .then((data: Chapter[]) => {
        if (cancelled) return;
        data.sort((a, b) => a.num - b.num);
        setChapters(data);
      })
      .catch(() => {
        if (!cancelled) setLoadError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const byNum = useMemo(() => {
    const m = new Map<number, Chapter>();
    chapters.forEach((c) => m.set(c.num, c));
    return m;
  }, [chapters]);

  const current = chapterNum != null ? byNum.get(chapterNum) : undefined;
  const index = current ? chapters.findIndex((c) => c.num === current.num) : -1;
  const prevNum = index > 0 ? chapters[index - 1].num : null;
  const nextNum =
    index >= 0 && index < chapters.length - 1 ? chapters[index + 1].num : null;

  const navigate = useCallback(
    (num: number) => {
      goToChapter(num);
      setSidebarOpen(false);
    },
    [goToChapter],
  );

  // Keyboard navigation: ArrowLeft / ArrowRight for previous / next chapter.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft" && prevNum != null) navigate(prevNum);
      else if (e.key === "ArrowRight" && nextNum != null) navigate(nextNum);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [prevNum, nextNum, navigate]);

  // Keep the document title in sync.
  useEffect(() => {
    document.title = current
      ? `${current.title} - Pick Me Up Reader`
      : "Pick Me Up Reader";
  }, [current]);

  const saved = loadPosition();
  const resumeNum = saved && byNum.has(saved.num) ? saved.num : null;

  return (
    <div className={"app" + (sidebarOpen ? " sidebar-open" : "")}>
      <Topbar
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen((o) => !o)}
        theme={theme}
        onToggleTheme={toggleTheme}
        onFontInc={font.increase}
        onFontDec={font.decrease}
        canFontInc={font.canIncrease}
        canFontDec={font.canDecrease}
        fontFamily={fontFamily}
        onToggleFontFamily={toggleFontFamily}
      />

      <div className="body">
        <div
          className="sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
        <Sidebar
          chapters={chapters}
          currentNum={current ? current.num : null}
          onSelect={navigate}
          readChapters={readChapters}
        />

        {loadError ? (
          <main className="reader">
            <div className="chapter-scroll">
              <p className="chapter-error">
                Failed to load the chapter index (chapters_index.json).
              </p>
            </div>
          </main>
        ) : current ? (
          <Reader
            chapter={current}
            total={chapters.length}
            prevNum={prevNum}
            nextNum={nextNum}
            onNavigate={navigate}
            onMarkAsRead={markAsRead}
          />
        ) : (
          <Home
            resumeNum={resumeNum}
            hasChapters={chapters.length > 0}
            chapters={chapters}
            onResume={() => resumeNum != null && navigate(resumeNum)}
            onStart={() => chapters.length > 0 && navigate(chapters[0].num)}
          />
        )}
      </div>
    </div>
  );
}
