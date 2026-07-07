import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Chapter } from "../types";
import { loadChapterMarkdown } from "../lib/markdown";
import { loadPosition, savePosition } from "../lib/position";

interface ReaderProps {
  chapter: Chapter;
  total: number;
  prevNum: number | null;
  nextNum: number | null;
  onNavigate: (num: number) => void;
  onMarkAsRead: (num: number) => void;
  edgeTapEnabled: boolean;
}

// Custom event dispatched by the app when a bookmark for the CURRENT chapter
// is opened: the saved position was updated, re-apply it without remounting.
export const RESTORE_POSITION_EVENT = "pmu:restore-position";

function applyRatio(el: HTMLElement, ratio: number): void {
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTop = max > 0 ? ratio * max : 0;
}

export function Reader({
  chapter,
  total,
  prevNum,
  nextNum,
  onNavigate,
  onMarkAsRead,
  edgeTapEnabled,
}: ReaderProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);
  const tapStart = useRef<{ x: number; y: number; t: number } | null>(null);

  // Load the chapter Markdown whenever the chapter changes.
  useEffect(() => {
    let cancelled = false;
    setText(null);
    setError(false);
    loadChapterMarkdown(chapter.num, chapter.file)
      .then((md) => {
        if (!cancelled) setText(md);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [chapter.num, chapter.file]);

  // After the content is in the DOM, restore the saved scroll position if this
  // is the chapter we left off on, otherwise jump to the top. Runs in a layout
  // effect so the scroll is set before paint (no flash of the wrong position).
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el || text == null) return;

    const saved = loadPosition();
    if (saved && saved.num === chapter.num) {
      applyRatio(el, saved.ratio);
      // Re-apply once after web fonts swap in and change the layout height.
      const id = window.setTimeout(() => applyRatio(el, saved.ratio), 120);
      return () => window.clearTimeout(id);
    }
    el.scrollTop = 0;
    savePosition({ num: chapter.num, ratio: 0 });
    if (progressRef.current) progressRef.current.style.width = "0%";
  }, [text, chapter.num]);

  // Re-apply the saved position when a bookmark for this same chapter is
  // opened (no chapter change, so the layout effect above will not re-run).
  useEffect(() => {
    const onRestore = () => {
      const el = scrollRef.current;
      const saved = loadPosition();
      if (el && saved && saved.num === chapter.num) applyRatio(el, saved.ratio);
    };
    window.addEventListener(RESTORE_POSITION_EVENT, onRestore);
    return () => window.removeEventListener(RESTORE_POSITION_EVENT, onRestore);
  }, [chapter.num]);

  // Tap the left / right edge of the page to go to the previous / next
  // chapter. Touch only (mouse users have keyboard arrows and buttons), and
  // only a clean tap counts: minimal movement, quick, no active text
  // selection, and not on an interactive element.
  const onPointerDown = (e: ReactPointerEvent) => {
    tapStart.current =
      e.pointerType === "touch" ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
  };

  const onPointerUp = (e: ReactPointerEvent) => {
    const start = tapStart.current;
    tapStart.current = null;
    if (!edgeTapEnabled || !start || e.pointerType !== "touch") return;
    if (Date.now() - start.t > 350) return;
    if (Math.abs(e.clientX - start.x) > 12 || Math.abs(e.clientY - start.y) > 12) return;
    if (window.getSelection()?.toString()) return;
    if ((e.target as HTMLElement).closest("a, button, input")) return;

    const el = scrollRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    if (x < 0.18 && prevNum != null) onNavigate(prevNum);
    else if (x > 0.82 && nextNum != null) onNavigate(nextNum);
  };

  // Update the progress bar (via the DOM, to avoid re-rendering the chapter) and
  // throttle-save the reading position.
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const ratio = max > 0 ? el.scrollTop / max : 0;
    if (progressRef.current) {
      progressRef.current.style.width = (ratio * 100).toFixed(1) + "%";
    }

    // Mark chapter as read when scrolled past 92% of the content
    if (ratio > 0.92) {
      onMarkAsRead(chapter.num);
    }

    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(
      () => savePosition({ num: chapter.num, ratio }),
      200,
    );
  };

  return (
    <main className="reader">
      <div className="reading-progress" aria-hidden="true">
        <div className="reading-progress-bar" ref={progressRef} />
      </div>

      <div
        className="chapter-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        <article className="chapter-content">
          {error ? (
            <p className="chapter-error">
              Could not load this chapter. If you are offline it may not be
              cached yet.
            </p>
          ) : text == null ? (
            <p className="chapter-loading">Loading...</p>
          ) : (
            <>
              <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
              <div className="chapter-end">
                {nextNum != null ? (
                  <button
                    className="btn btn-primary chapter-end-next"
                    onClick={() => onNavigate(nextNum)}
                  >
                    Continue to Chapter {nextNum} &rarr;
                  </button>
                ) : (
                  <p className="chapter-end-fin">
                    You are all caught up - this is the last chapter.
                  </p>
                )}
              </div>
            </>
          )}
        </article>
      </div>

      <footer className="reader-nav">
        <button
          className="btn nav-btn"
          onClick={() => prevNum != null && onNavigate(prevNum)}
          disabled={prevNum == null}
        >
          &larr; Prev
        </button>
        <span className="chapter-indicator">
          Chapter {chapter.num} of {total}
        </span>
        <button
          className="btn nav-btn"
          onClick={() => nextNum != null && onNavigate(nextNum)}
          disabled={nextNum == null}
        >
          Next &rarr;
        </button>
      </footer>
    </main>
  );
}
