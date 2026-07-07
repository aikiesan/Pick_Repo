import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// The site is served from a GitHub Pages project page in production
// (https://aikiesan.github.io/Pick_Repo/), but from the root in local dev.
// Using a conditional base keeps asset URLs correct in both. In the app, build
// runtime URLs with import.meta.env.BASE_URL so they work under either base.
export default defineConfig(({ command, isPreview }) => ({
  // The built site lives under the project-page path in production AND when
  // served by `vite preview` (which builds-then-serves). Only the dev server
  // runs at the root. `command` is "serve" for both dev and preview, so we also
  // check isPreview to tell them apart.
  base: command === "build" || isPreview ? "/Pick_Repo/" : "/",

  server: { port: 5180 },

  plugins: [
    react(),

    VitePWA({
      // autoUpdate revisions every precached file by content hash, so new
      // chapters and code ship to returning readers automatically on the next
      // visit. No manual cache-version bumping needed (unlike a hand-written SW).
      registerType: "autoUpdate",
      injectRegister: "auto",
      includeAssets: ["icons/apple-touch-icon-180.png"],

      manifest: {
        name: "Pick Me Up: Infinite Gacha Reader",
        short_name: "PMU Reader",
        description:
          "Offline reader for the Pick Me Up: Infinite Gacha light novel.",
        lang: "en",
        dir: "ltr",
        display: "standalone",
        background_color: "#15171c",
        theme_color: "#15171c",
        categories: ["books", "entertainment"],
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },

      workbox: {
        // Precache the app shell AND every chapter (the .md files and the index
        // copied from public/) so the whole novel is available fully offline.
        globPatterns: ["**/*.{js,css,html,woff2,png,svg,json,md}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Single-page app: serve the shell for any uncached navigation.
        navigateFallback: "index.html",
        cleanupOutdatedCaches: true,
        // Belt and braces: if the all-or-nothing precache install failed (one
        // dropped request on a flaky mobile connection aborts all of it), any
        // chapter opened online still gets runtime-cached for offline reading.
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.endsWith(".md"),
            handler: "CacheFirst",
            options: {
              cacheName: "pmu-md-runtime",
              expiration: { maxEntries: 500 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },

      // Keep the service worker out of `vite dev` so development is not fighting
      // a cache. Offline behavior is verified against the production build
      // (npm run build && npm run preview).
      devOptions: { enabled: false },
    }),
  ],
}));
