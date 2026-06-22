import { useEffect, useLayoutEffect, useRef, useState } from "react";
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
}

function applyRatio(el: HTMLElement, ratio: number): void {
  const max = el.scrollHeight - el.clientHeight;
  el.scrollTop = max > 0 ? ratio * max : 0;
}

export function Reader({ chapter, total, prevNum, nextNum, onNavigate }: ReaderProps) {
  const [text, setText] = useState<string | null>(null);
  const [error, setError] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const progressRef = useRef<HTMLDivElement | null>(null);
  const saveTimer = useRef<number | undefined>(undefined);

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

      <div className="chapter-scroll" ref={scrollRef} onScroll={onScroll}>
        <article className="chapter-content">
          {error ? (
            <p className="chapter-error">
              Could not load this chapter. If you are offline it may not be
              cached yet.
            </p>
          ) : text == null ? (
            <p className="chapter-loading">Loading...</p>
          ) : (
            <Markdown remarkPlugins={[remarkGfm]}>{text}</Markdown>
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
