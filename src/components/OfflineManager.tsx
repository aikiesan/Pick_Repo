import { useCallback, useEffect, useRef, useState } from "react";
import type { Chapter } from "../types";
import {
  countCachedChapters,
  downloadAllChapters,
  isAppShellReady,
  requestPersistentStorage,
  type DownloadProgress,
} from "../lib/offline";

interface OfflineManagerProps {
  chapters: Chapter[];
}

type Phase = "checking" | "idle" | "downloading" | "done" | "error";

// Card on the home screen that shows how many chapters are saved for offline
// reading and lets the reader download the rest with visible progress, instead
// of trusting the invisible service-worker precache.
export function OfflineManager({ chapters }: OfflineManagerProps) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [cached, setCached] = useState(0);
  const [failed, setFailed] = useState(0);
  const [shellReady, setShellReady] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const total = chapters.length;
  const allSaved = total > 0 && cached >= total;
  const downloading = phase === "downloading";

  // Status check, re-polled while idle: the service worker precaches chapters
  // in the background on the first visit, so the count keeps climbing without
  // any user action and this card should reflect that live.
  useEffect(() => {
    if (total === 0 || downloading) return;
    let cancelled = false;
    let timer: number | undefined;
    const check = async () => {
      try {
        const n = await countCachedChapters(chapters);
        if (cancelled) return;
        setCached(n);
        setPhase((p) =>
          p === "downloading" ? p : n >= total ? "done" : p === "checking" ? "idle" : p,
        );
        if (n < total) timer = window.setTimeout(check, 3000);
      } catch {
        if (!cancelled) setPhase((p) => (p === "checking" ? "idle" : p));
      }
    };
    check();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [chapters, total, downloading]);

  // Abort an in-flight download if the component unmounts.
  useEffect(() => () => abortRef.current?.abort(), []);

  // The service worker installs in the background on the first visit; poll a
  // few times so the note below clears itself once the shell is saved.
  useEffect(() => {
    let cancelled = false;
    let tries = 0;
    const check = async () => {
      const ready = await isAppShellReady();
      if (cancelled) return;
      setShellReady(ready);
      if (!ready && tries++ < 24) window.setTimeout(check, 5000);
    };
    check();
    return () => {
      cancelled = true;
    };
  }, []);

  const start = useCallback(async () => {
    setPhase("downloading");
    setFailed(0);
    requestPersistentStorage();
    const controller = new AbortController();
    abortRef.current = controller;
    const onProgress = (p: DownloadProgress) => {
      setCached(p.done);
      setFailed(p.failed);
    };
    try {
      const result = await downloadAllChapters(chapters, onProgress, controller.signal);
      setPhase(result.done >= total && result.failed === 0 ? "done" : "error");
    } catch {
      setPhase("error");
    }
  }, [chapters, total]);

  if (total === 0 || phase === "checking") return null;

  const pct = total > 0 ? Math.round((cached / total) * 100) : 0;

  return (
    <section className="offline-card" aria-live="polite">
      <div className="offline-head">
        <span className={"offline-dot" + (allSaved ? " ready" : "")} aria-hidden="true" />
        <span className="offline-title">
          {allSaved
            ? "Ready for airplane mode"
            : phase === "downloading"
              ? "Downloading chapters..."
              : "Offline reading"}
        </span>
        <span className="offline-count">
          {cached} / {total}
        </span>
      </div>

      <div className="offline-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="offline-bar-fill" style={{ width: pct + "%" }} />
      </div>

      {allSaved ? (
        <>
          <p className="offline-note">
            All {total} chapters are saved on this device. You can read the
            whole novel with no connection.
          </p>
          {!shellReady && (
            <p className="offline-note offline-warn">
              The app itself is still installing - stay online on this page for
              another minute, or reload once, before going offline.
            </p>
          )}
        </>
      ) : phase === "downloading" ? (
        <p className="offline-note">
          Keep this page open until it reaches {total} / {total}.
          {failed > 0 && ` ${failed} failed so far - they will be retried.`}
        </p>
      ) : (
        <>
          {phase === "error" && (
            <p className="offline-note offline-warn">
              {failed > 0
                ? `${failed} chapter${failed === 1 ? "" : "s"} could not be downloaded. Check your connection and retry - already saved chapters are kept.`
                : "Download interrupted. Retry to fetch the remaining chapters."}
            </p>
          )}
          <button className="btn btn-primary offline-btn" onClick={start}>
            {phase === "error" || cached > 0
              ? `Download remaining ${total - cached} chapters`
              : `Download all ${total} chapters (~6 MB)`}
          </button>
        </>
      )}
    </section>
  );
}
