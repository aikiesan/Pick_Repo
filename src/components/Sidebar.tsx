import { useEffect, useMemo, useRef, useState } from "react";
import type { Chapter } from "../types";

interface SidebarProps {
  chapters: Chapter[];
  currentNum: number | null;
  onSelect: (num: number) => void;
  readChapters: number[];
}

export function Sidebar({ chapters, currentNum, onSelect, readChapters }: SidebarProps) {
  const [query, setQuery] = useState("");
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
    activeRef.current?.scrollIntoView({ block: "nearest" });
  }, [currentNum]);

  return (
    <aside className="sidebar" aria-label="Chapter list">
      <div className="sidebar-head">
        <span>Chapters</span>
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
    </aside>
  );
}
