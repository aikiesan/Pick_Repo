import type { Bookmark } from "../types";

const KEY = "pmu.bookmarks";

export function loadBookmarks(): Bookmark[] {
  try {
    const raw = localStorage.getItem(KEY);
    const list = raw ? (JSON.parse(raw) as Bookmark[]) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function save(list: Bookmark[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable; ignore */
  }
}

export function addBookmark(num: number, ratio: number, quote?: string): Bookmark[] {
  const now = Date.now();
  const bookmark: Bookmark = {
    id: now,
    num,
    ratio,
    quote: quote?.trim() ? quote.trim().slice(0, 200) : undefined,
    created: now,
  };
  // Newest first; drop a near-identical bookmark of the same spot so double
  // taps do not pile up duplicates.
  const list = loadBookmarks().filter(
    (b) => !(b.num === num && Math.abs(b.ratio - ratio) < 0.01 && b.quote === bookmark.quote),
  );
  const next = [bookmark, ...list];
  save(next);
  return next;
}

export function removeBookmark(id: number): Bookmark[] {
  const next = loadBookmarks().filter((b) => b.id !== id);
  save(next);
  return next;
}
