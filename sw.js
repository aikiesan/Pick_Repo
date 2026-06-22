/*
 * Service worker for the Pick Me Up Reader.
 *
 * CACHING STRATEGY: cache-first for everything.
 * All content here is static and shipped with the site, so the fastest and most
 * reliable behavior offline is to serve straight from the cache and only touch
 * the network for things not yet cached.
 *
 * THE ONE RULE YOU MUST REMEMBER:
 *   Because this is cache-first, returning readers keep getting the OLD cached
 *   files until the cache version changes. So every time you change ANY file
 *   (chapters, app.js, styles.css, fonts, icons, etc.) you MUST bump CACHE_NAME
 *   below (reader-v1 -> reader-v2 -> ...). On the next visit the new service
 *   worker installs, precaches the new version, and the activate step deletes
 *   the old cache. If you forget to bump it, users see stale content.
 *
 * Network-first was deliberately NOT used: it would add latency on every load
 * and gains nothing here since content only changes at deploy time, which is
 * exactly when CACHE_NAME gets bumped.
 */

const CACHE_NAME = "reader-v1"; // <-- BUMP THIS ON EVERY CONTENT OR CODE CHANGE

// Static app shell + assets. Relative paths so the scope works on any base path
// (project page, custom domain, or local server).
const CORE_ASSETS = [
  "./",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "vendor/marked.min.js",
  "fonts/fonts.css",
  "fonts/lora-400.woff2",
  "fonts/lora-700.woff2",
  "fonts/lora-italic.woff2",
  "fonts/inter-400.woff2",
  "fonts/inter-600.woff2",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon-180.png",
  "chapters_index.json",
];

// Cache a list of URLs in small batches, tolerating individual failures.
// (cache.addAll rejects the whole batch if any one request fails, which we do
// not want for the long chapter list.)
async function cacheInChunks(cache, urls, chunkSize) {
  for (let i = 0; i < urls.length; i += chunkSize) {
    const chunk = urls.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async function (url) {
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) await cache.put(url, res);
        } catch (e) {
          /* tolerate a single missing file; it will be fetched on demand later */
        }
      })
    );
  }
}

self.addEventListener("install", function (event) {
  event.waitUntil(
    (async function () {
      const cache = await caches.open(CACHE_NAME);

      // Precache the app shell. This must all succeed for a valid install.
      await cache.addAll(CORE_ASSETS);

      // Precache every chapter Markdown file so the whole novel is available
      // offline. The list is derived from chapters_index.json, which means this
      // service worker never needs editing when chapters are added: you only
      // bump CACHE_NAME so the new index (and its new chapters) gets precached.
      try {
        const res = await fetch("chapters_index.json", { cache: "no-cache" });
        const chapters = await res.json();
        const urls = chapters.map(function (c) {
          return c.file;
        });
        await cacheInChunks(cache, urls, 50);
      } catch (e) {
        // If the index cannot be read here, chapters are cached lazily by the
        // fetch handler the first time each one is opened online.
      }
    })()
  );

  // Take over as soon as installed instead of waiting for all tabs to close.
  // Paired with the cleanup in activate, this makes a CACHE_NAME bump take
  // effect on the next visit.
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    (async function () {
      // Delete every cache that is not the current version. This is what makes
      // bumping CACHE_NAME actually free the old, stale content.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter(function (n) {
            return n !== CACHE_NAME;
          })
          .map(function (n) {
            return caches.delete(n);
          })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", function (event) {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith(
    (async function () {
      // 1. Cache-first: serve from cache when we have it. ignoreSearch so a
      //    cache-busting query string does not cause a miss.
      const cached = await caches.match(req, { ignoreSearch: true });
      if (cached) return cached;

      // 2. Not cached: go to the network, and runtime-cache successful
      //    same-origin GETs so anything new (e.g. a chapter opened while online)
      //    becomes available offline afterwards.
      try {
        const res = await fetch(req);
        if (res && res.ok && new URL(req.url).origin === self.location.origin) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(req, res.clone());
        }
        return res;
      } catch (err) {
        // 3. Offline and uncached. For page navigations, fall back to the cached
        //    app shell so deep links (#/chapter/N) and refreshes still work.
        if (req.mode === "navigate") {
          const shell =
            (await caches.match("index.html")) || (await caches.match("./"));
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
