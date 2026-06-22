# Pick Me Up Reader

A static, installable Progressive Web App for reading the *Pick Me Up: Infinite Gacha*
light novel fully offline. No backend, no framework, no build step. It is deployed
to GitHub Pages and works offline once installed.

Live site: https://aikiesan.github.io/Pick_Repo/

## How it works

- `chapters/` holds the chapter Markdown files (`001_Chapter_1.md` ... `400_Chapter_400.md`).
- `generate_index.py` scans `chapters/` and writes `chapters_index.json`, the list the app loads first.
- `index.html` + `styles.css` + `app.js` are the reader. Chapters are fetched on demand and rendered with a locally vendored copy of `marked.js`.
- `sw.js` is a service worker that precaches the whole app (shell, fonts, marked, every chapter) so it works offline.
- Fonts (Lora for prose, Inter for UI) are self-hosted in `fonts/`. Nothing loads from a CDN at runtime.

## Features

- Sidebar chapter list, collapsible on mobile.
- Previous / Next buttons and ArrowLeft / ArrowRight keyboard shortcuts.
- URL hash routing (`#/chapter/42`) so links and refresh keep your place.
- Reading position memory with a resume prompt on reopen.
- Dark / light theme (defaults to your OS setting) and font size controls, both persisted.

## Recurring maintenance (READ THIS WHEN YOU ADD CHAPTERS)

Every time you add or change any content or code, do BOTH of these:

1. Regenerate the index:
   ```
   python generate_index.py
   ```
2. Bump the cache version in `sw.js`:
   ```
   const CACHE_NAME = "reader-v1";   // -> "reader-v2", then "reader-v3", ...
   ```

Why step 2 matters: the service worker is cache-first, so returning visitors keep
seeing the OLD cached files until `CACHE_NAME` changes. Bumping it makes the new
service worker precache the new version and delete the old cache on activation.
If you skip it, readers will not see your new chapters. This is the single most
common source of bugs in this kind of app, so it is worth turning into a habit.

The deploy workflow runs `generate_index.py` for you automatically, but it cannot
guess when to bump `CACHE_NAME`, so that step is on you.

## Run locally

A service worker and `fetch()` need http (not the `file://` protocol), so serve
the folder rather than opening `index.html` directly:

```
python -m http.server 8000
```

Then open http://localhost:8000/.

To test offline: open DevTools, go to the Application tab, tick "Offline" under
Service Workers, and reload. The app and all chapters should still load.

## Regenerate placeholder icons (optional)

The icons in `icons/` are simple generated placeholders. To regenerate them:

```
pip install pillow
python generate_icons.py
```

To use your own artwork instead, just replace the PNGs in `icons/` with files of
the same names and sizes.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which regenerates the
index, stages the static files, and publishes to GitHub Pages.

One-time setup: in the repository settings, under Pages, set the build and
deployment source to "GitHub Actions".
