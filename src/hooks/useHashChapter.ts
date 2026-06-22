import { useCallback, useEffect, useState } from "react";

// Lightweight hash router for a single route shape: #/chapter/N.
// Hash routing works on GitHub Pages with no server config and survives refresh
// and back/forward.

function parseHash(): number | null {
  const m = window.location.hash.match(/^#\/chapter\/(\d+)$/);
  return m ? parseInt(m[1], 10) : null;
}

export function useHashChapter(): {
  chapterNum: number | null;
  goToChapter: (num: number) => void;
} {
  const [chapterNum, setChapterNum] = useState<number | null>(parseHash);

  useEffect(() => {
    const onChange = () => setChapterNum(parseHash());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);

  const goToChapter = useCallback((num: number) => {
    const target = `#/chapter/${num}`;
    if (window.location.hash === target) {
      // No hashchange event will fire; update state directly.
      setChapterNum(num);
    } else {
      window.location.hash = target;
    }
  }, []);

  return { chapterNum, goToChapter };
}
