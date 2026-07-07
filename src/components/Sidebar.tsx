import { useEffect, useMemo, useRef, useState } from "react";
import type { Bookmark, Chapter } from "../types";

interface SidebarProps {
  chapters: Chapter[];
  currentNum: number | null;
  onSelect: (num: number) => void;
  readChapters: number[];
  bookmarks: Bookmark[];
  onOpenBookmark: (b: Bookmark) => void;
  onDeleteBookmark: (id: number) => void;
}

export function Sidebar({
  chapters,
  currentNum,
  onSelect,
  readChapters,
  bookmarks,
  onOpenBookmark,
  onDeleteBookmark,
}: SidebarProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"chapters" | "bookmarks">("chapters");
  const activeRef = useRef<HTMLButtonElement | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return chapters;
    return chapters.filter(
      (c) => String(c.num).includes(q) || c.title.toLowerCase().includes(q),
    );
  }, [chapters, query]);

  // Keep the active chapter visible when it changes.
  useEffect(() => {
    if (tab === "chapters") activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentNum, tab]);

  return (
    <aside className="sidebar" aria-label="Chapter list">
      <div className="sidebar-tabs" role="tablist">
        <button
          role="tab"
          aria-selected={tab === "chapters"}
          className={"sidebar-tab" + (tab === "chapters" ? " active" : "")}
          onClick={() => setTab("chapters")}
        >
          Chapters
        </button>
        <button
          role="tab"
          aria-selected={tab === "bookmarks"}
          className={"sidebar-tab" + (tab === "bookmarks" ? " active" : "")}
          onClick={() => setTab("bookmarks")}
        >
          Bookmarks
          {bookmarks.length > 0 && (
            <span className="tab-badge">{bookmarks.length}</span>
          )}
        </button>
      </div>

      {tab === "chapters" ? (
        <>
          <div className="sidebar-head">
            <input
              className="sidebar-search"
              type="search"
              inputMode="numeric"
              placeholder="Jump to chapter..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              aria-label="Filter chapters"
            />
          </div>

          <nav>
            <ul className="chapter-list">
              {filtered.map((c) => {
                const active = c.num === currentNum;
                const isRead = readChapters.includes(c.num);
                return (
                  <li key={c.num}>
                    <button
                      ref={active ? activeRef : undefined}
                      className={"chapter-link" + (active ? " active" : "")}
                      onClick={() => onSelect(c.num)}
                      aria-current={active ? "true" : undefined}
                    >
                      <span className="chapter-title-text">{c.title}</span>
                      {isRead && (
                        <span className="read-badge" title="Read">
                          ✓
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
              {filtered.length === 0 && (
                <li className="chapter-list-empty">No chapters match.</li>
              )}
            </ul>
          </nav>
        </>
      ) : (
        <nav>
          <ul className="chapter-list bookmark-list">
            {bookmarks.map((b) => (
              <li key={b.id}>
                <div className="bookmark-item">
                  <button
                    className="chapter-link bookmark-open"
                    onClick={() => onOpenBookmark(b)}
                  >
                    <span className="bookmark-where">
                      Chapter {b.num} &middot; {Math.round(b.ratio * 100)}%
                    </span>
                    {b.quote && <span className="bookmark-quote">“{b.quote}”</span>}
                  </button>
                  <button
                    className="icon-btn bookmark-delete"
                    onClick={() => onDeleteBookmark(b.id)}
                    aria-label={`Delete bookmark in chapter ${b.num}`}
                    title="Delete bookmark"
                  >
                    ✕
                  </button>
                </div>
              </li>
            ))}
            {bookmarks.length === 0 && (
              <li className="chapter-list-empty">
                No bookmarks yet. While reading, tap the bookmark icon in the
                top bar to save your spot. Select some text first to save it as
                a quote.
              </li>
            )}
          </ul>
        </nav>
      )}
    </aside>
  );
}
