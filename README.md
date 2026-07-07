# Pick Me Up Reader

An installable, offline-first reader for the *Pick Me Up: Infinite Gacha* light
novel, built with React + Vite and deployed to GitHub Pages. Once visited, it
works fully offline: the service worker precaches the app and every chapter.

Live site: https://aikiesan.github.io/Pick_Repo/

## Tech

- React 18 + TypeScript + Vite (bundled build, deployed as static files).
- `react-markdown` + `remark-gfm` for chapter rendering.
- `vite-plugin-pwa` (Workbox) for the manifest and offline service worker.
- Self-hosted Lora (prose) and Inter (UI) fonts; nothing loads from a CDN.

## Project layout

```
public/chapters/         the chapter Markdown files (NNN_Chapter_N.md)
public/chapters_index.json   generated index the app loads first
public/icons/            generated PWA icons
src/                     React app (components, hooks, lib, styles)
src/assets/fonts/        self-hosted woff2 fonts
generate_index.py        scans public/chapters and writes the index
generate_icons.py        regenerates placeholder PWA icons (needs Pillow)
scraper.py               existing scraper (writes into public/chapters)
vite.config.ts           build config (base path + PWA)
```

## Features

- Sidebar chapter list with a filter box, collapsible on mobile, plus a
  Bookmarks tab: bookmark your exact spot from the top bar (select text first
  to save it as a quote), reopen or delete bookmarks from the sidebar.
- Previous / Next buttons, ArrowLeft / ArrowRight keyboard shortcuts, tap the
  left / right page edge on touch screens (toggleable), and a "Continue to
  Chapter N" button at the end of each chapter.
- "Aa" reading settings menu: font size, serif/sans, theme (dark, true-black
  OLED, light, sepia), line spacing, text width, keep-screen-on (wake lock),
  and the edge-tap toggle. All persisted.
- Hash routing (`#/chapter/42`) so links and refresh keep your place.
- Resume on reopen, with per-chapter scroll position remembered.
- Dark / light theme (defaults to your OS) and font size controls, both persisted.
- Reading progress bar.
- Offline download manager on the home screen: shows how many chapters are
  saved on the device ("N / 400"), with a "Download all chapters" button that
  fetches the rest with visible progress and per-file retries. Reads fall back
  to the cache when the network is unavailable, so chapters stay readable even
  if the service worker failed to install (e.g. a flaky first visit on mobile).

## Develop

```
npm install
npm run dev      # http://localhost:5180/
```

## Build and preview the production bundle

```
npm run build    # regenerates the index, then builds to dist/
npm run preview  # serves the built site at http://localhost:4173/Pick_Repo/
```

To verify offline: open the preview, then in DevTools go to the Application tab,
tick "Offline" under Service Workers, and reload. The app and all chapters still
load. A Lighthouse PWA audit should pass installability.

## Adding or updating chapters

1. Run the scraper (it writes into `public/chapters/`), or drop new
   `NNN_Chapter_N.md` files there.
2. Regenerate the index (the build also does this automatically):
   ```
   python generate_index.py
   ```

No manual cache-version bumping is needed: Vite fingerprints every file and the
service worker (registerType `autoUpdate`) revisions the precache by content
hash, so returning readers get new chapters on their next visit automatically.

## Regenerate placeholder icons (optional)

```
pip install pillow
python generate_icons.py
```

Or replace the PNGs in `public/icons/` with your own artwork using the same
filenames and sizes.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which installs
dependencies, regenerates the index, builds with Vite, and publishes `dist/` to
GitHub Pages.

One-time setup: in the repository settings, under Pages, set the source to
"GitHub Actions". The site is served under the `/Pick_Repo/` base path, which is
configured in `vite.config.ts` (change it there if the repository is renamed).
