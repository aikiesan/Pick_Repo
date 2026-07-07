import { useEffect } from "react";

// Holds a screen wake lock while `enabled`, so the display does not dim or
// lock mid-page. Best-effort: the browser may deny it (e.g. battery saver),
// and it is silently re-acquired when the tab becomes visible again (the OS
// releases wake locks whenever the page is backgrounded).
export function useWakeLock(enabled: boolean): void {
  useEffect(() => {
    if (!enabled) return;
    const wakeLock = (navigator as Navigator & { wakeLock?: { request(type: "screen"): Promise<{ release(): Promise<void> }> } }).wakeLock;
    if (!wakeLock) return;

    let sentinel: { release(): Promise<void> } | null = null;
    let disposed = false;

    const acquire = async () => {
      try {
        const s = await wakeLock.request("screen");
        if (disposed) await s.release();
        else sentinel = s;
      } catch {
        /* denied: nothing to do */
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") acquire();
    };

    acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      sentinel?.release().catch(() => {});
    };
  }, [enabled]);
}
