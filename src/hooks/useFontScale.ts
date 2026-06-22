import { useCallback, useState } from "react";

const KEY = "pmu.fontScale";
const MIN = 0.8;
const MAX = 1.8;
const STEP = 0.1;

function clamp(n: number): number {
  return Math.min(MAX, Math.max(MIN, Math.round(n * 10) / 10));
}

function currentScale(): number {
  const v = parseFloat(localStorage.getItem(KEY) ?? "");
  return isNaN(v) ? 1 : clamp(v);
}

function apply(scale: number): void {
  document.documentElement.style.setProperty("--font-scale", String(scale));
}

export interface FontControls {
  scale: number;
  increase: () => void;
  decrease: () => void;
  canIncrease: boolean;
  canDecrease: boolean;
}

export function useFontScale(): FontControls {
  const [scale, setScale] = useState<number>(() => {
    const initial = currentScale();
    apply(initial);
    return initial;
  });

  const change = useCallback((delta: number) => {
    setScale((prev) => {
      const next = clamp(prev + delta);
      apply(next);
      try {
        localStorage.setItem(KEY, String(next));
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return {
    scale,
    increase: () => change(STEP),
    decrease: () => change(-STEP),
    canIncrease: scale < MAX,
    canDecrease: scale > MIN,
  };
}
