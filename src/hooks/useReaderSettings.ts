import { useCallback, useState } from "react";

// Reader comfort settings beyond theme and font size: line spacing, text
// column width, tap-to-turn-page, and keep-screen-on. Applied as CSS variables
// / used directly by components, persisted as one JSON blob.

export type LineSpacing = "compact" | "normal" | "relaxed";
export type TextWidth = "narrow" | "normal" | "wide";

export interface ReaderSettings {
  lineSpacing: LineSpacing;
  textWidth: TextWidth;
  edgeTap: boolean; // tap left/right edge of the page for prev/next chapter
  keepAwake: boolean; // hold a screen wake lock while reading
}

const KEY = "pmu.readerSettings";

const DEFAULTS: ReaderSettings = {
  lineSpacing: "normal",
  textWidth: "normal",
  edgeTap: true,
  keepAwake: false,
};

const LINE_HEIGHT: Record<LineSpacing, string> = {
  compact: "1.6",
  normal: "1.85",
  relaxed: "2.15",
};

const MEASURE: Record<TextWidth, string> = {
  narrow: "52ch",
  normal: "68ch",
  wide: "82ch",
};

function load(): ReaderSettings {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULTS, ...(JSON.parse(raw) as ReaderSettings) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function apply(s: ReaderSettings): void {
  const root = document.documentElement.style;
  root.setProperty("--line-height", LINE_HEIGHT[s.lineSpacing]);
  root.setProperty("--reading-measure", MEASURE[s.textWidth]);
}

export function useReaderSettings(): [
  ReaderSettings,
  <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void,
] {
  const [settings, setSettings] = useState<ReaderSettings>(() => {
    const initial = load();
    apply(initial);
    return initial;
  });

  const update = useCallback(
    <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => {
      setSettings((prev) => {
        const next = { ...prev, [key]: value };
        apply(next);
        try {
          localStorage.setItem(KEY, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [],
  );

  return [settings, update];
}
