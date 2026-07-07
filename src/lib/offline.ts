// Offline download manager for the chapter files.
//
// The service worker precaches every chapter on install, but that install is
// all-or-nothing and invisible: on a flaky mobile connection one failed request
// aborts the whole precache and the reader has no way to know the chapters are
// not actually saved. This module gives the app an explicit, resumable,
// page-driven download with visible progress, and a cache fallback for reads,
// so offline readiness never depends on the service worker lifecycle alone.

import type { Chapter } from "../types";

// Page-driven downloads land in this cache. Reads check every cache (including
// the Workbox precache), so the two mechanisms complement each other.
const OFFLINE_CACHE = "pmu-offline-v1";

export function chapterUrl(file: string): string {
  return import.meta.env.BASE_URL + file;
}

function absolute(url: string): string {
  const u = new URL(url, window.location.href);
  u.search = ""; // ignore cache-busting / Workbox revision params
  return u.href;
}

// Fetch from the network, falling back to any cache when offline. Used for
// both the chapter index and the chapter Markdown so the app still works when
// the service worker failed to install or was evicted.
export async function fetchWithCacheFallback(url: string): Promise<Response> {
  try {
    const res = await fetch(url);
    if (res.ok) return res;
  } catch {
    /* offline or network error: fall through to the cache */
  }
  if ("caches" in window) {
    const cached = await caches.match(url, { ignoreSearch: true });
    if (cached) return cached;
  }
  throw new Error(`Failed to load ${url}: network unavailable and not cached`);
}

// Set of absolute chapter URLs present in ANY cache (Workbox precache keys
// carry a __WB_REVISION__ query param, hence the search stripping).
async function cachedUrlSet(): Promise<Set<string>> {
  const set = new Set<string>();
  if (!("caches" in window)) return set;
  for (const name of await caches.keys()) {
    const cache = await caches.open(name);
    for (const req of await cache.keys()) set.add(absolute(req.url));
  }
  return set;
}

export async function countCachedChapters(chapters: Chapter[]): Promise<number> {
  const cached = await cachedUrlSet();
  return chapters.filter((c) => cached.has(absolute(chapterUrl(c.file)))).length;
}

export interface DownloadProgress {
  done: number; // chapters confirmed in cache (pre-existing + newly fetched)
  total: number;
  failed: number;
}

// Download every chapter not yet cached, a few at a time, tolerating and
// retrying individual failures. Resumable: already-cached chapters are skipped,
// so calling it again only fetches what is still missing.
export async function downloadAllChapters(
  chapters: Chapter[],
  onProgress: (p: DownloadProgress) => void,
  signal?: AbortSignal,
): Promise<DownloadProgress> {
  const cachedBefore = await cachedUrlSet();
  const missing = chapters.filter(
    (c) => !cachedBefore.has(absolute(chapterUrl(c.file))),
  );

  const progress: DownloadProgress = {
    done: chapters.length - missing.length,
    total: chapters.length,
    failed: 0,
  };
  onProgress({ ...progress });
  if (missing.length === 0) return progress;

  const cache = await caches.open(OFFLINE_CACHE);

  // Also save the chapter index itself, so the chapter list can load from the
  // cache fallback even when the service worker is not available.
  try {
    const indexUrl = import.meta.env.BASE_URL + "chapters_index.json";
    const res = await fetch(indexUrl, { signal });
    if (res.ok) await cache.put(indexUrl, res);
  } catch {
    /* non-fatal: the index is usually precached by the service worker */
  }

  const queue = [...missing];
  const CONCURRENCY = 5;
  const ATTEMPTS = 3;

  async function worker(): Promise<void> {
    for (;;) {
      const chapter = queue.shift();
      if (!chapter || signal?.aborted) return;
      const url = chapterUrl(chapter.file);
      let ok = false;
      for (let attempt = 0; attempt < ATTEMPTS && !ok; attempt++) {
        if (signal?.aborted) return;
        try {
          const res = await fetch(url, { signal });
          if (res.ok) {
            await cache.put(url, res);
            ok = true;
          }
        } catch {
          /* retry below */
        }
        if (!ok && attempt < ATTEMPTS - 1) {
          await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
        }
      }
      if (ok) progress.done++;
      else progress.failed++;
      onProgress({ ...progress });
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, missing.length) }, worker),
  );
  return progress;
}

// True when a service worker is active for this page, meaning the app shell
// (HTML/JS/CSS) is saved and the reader will boot with no connection at all.
export async function isAppShellReady(): Promise<boolean> {
  try {
    if (!("serviceWorker" in navigator)) return false;
    const reg = await navigator.serviceWorker.getRegistration();
    return !!reg?.active;
  } catch {
    return false;
  }
}

// Ask the browser not to evict our caches under storage pressure. Best-effort:
// Chrome grants this silently for installed PWAs and frequently-used sites.
export function requestPersistentStorage(): void {
  try {
    navigator.storage?.persist?.();
  } catch {
    /* unsupported: nothing to do */
  }
}
