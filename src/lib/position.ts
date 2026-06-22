// Reading-position persistence.
//
// We store a single {num, ratio}. The Reader restores the scroll ratio whenever
// it opens the chapter that matches the saved position (resume on reopen, or a
// refresh on a deep link), and scrolls to the top for any other chapter. Since
// the saved position tracks whatever chapter you are currently reading, this
// gives natural resume behavior without any cross-component mutable state.

export interface ReadingPosition {
  num: number;
  ratio: number; // scroll offset as a fraction of scrollable height (0..1)
}

const KEY = "pmu.position";

export function loadPosition(): ReadingPosition | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ReadingPosition) : null;
  } catch {
    return null;
  }
}

export function savePosition(pos: ReadingPosition): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(pos));
  } catch {
    /* storage full or unavailable; ignore */
  }
}
