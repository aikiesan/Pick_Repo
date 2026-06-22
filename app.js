"use strict";

/*
 * Pick Me Up Reader.
 * Loads chapters_index.json, renders chapters from local Markdown with marked.js,
 * and persists theme, font size, and reading position in localStorage.
 * All assets are local so the app works fully offline once the service worker
 * has precached everything.
 */
(function () {
  const INDEX_URL = "chapters_index.json";

  // localStorage keys (namespaced so they do not collide with anything else)
  const LS = {
    theme: "pmu.theme",
    font: "pmu.fontScale",
    position: "pmu.position", // {num, ratio}
  };

  const FONT_MIN = 0.8;
  const FONT_MAX = 1.8;
  const FONT_STEP = 0.1;

  // ---- State ----
  let chapters = []; // [{num, title, file}] sorted by num
  const byNum = new Map(); // num -> entry
  const orderIndex = new Map(); // num -> index within chapters
  const renderCache = new Map(); // num -> rendered HTML string (in-memory session cache)
  let currentNum = null;
  let saveTimer = null;
  // When set, the next loadChapter restores this scroll ratio instead of jumping
  // to the top. Used so resume and refresh land at the exact saved position.
  let pendingScrollRatio = null;

  const el = {};

  function $(id) {
    return document.getElementById(id);
  }

  function cacheEls() {
    el.list = $("chapter-list");
    el.content = $("chapter-content");
    el.scroll = $("chapter-scroll");
    el.prev = $("prev-btn");
    el.next = $("next-btn");
    el.indicator = $("chapter-indicator");
    el.resume = $("resume-banner");
    el.resumeText = $("resume-text");
    el.resumeBtn = $("resume-btn");
    el.resumeDismiss = $("resume-dismiss");
    el.sidebarToggle = $("sidebar-toggle");
    el.backdrop = $("sidebar-backdrop");
    el.themeToggle = $("theme-toggle");
    el.fontInc = $("font-inc");
    el.fontDec = $("font-dec");
  }

  // ---- Theme ----
  function systemPrefersDark() {
    return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme;
    // Keep the browser chrome (address bar, etc.) in sync with the resolved --bg.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--bg").trim();
      if (bg) meta.setAttribute("content", bg);
    }
  }

  function initTheme() {
    const stored = localStorage.getItem(LS.theme);
    applyTheme(stored || (systemPrefersDark() ? "dark" : "light"));
  }

  function toggleTheme() {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyTheme(next);
    localStorage.setItem(LS.theme, next);
  }

  // ---- Font size ----
  function getFontScale() {
    const v = parseFloat(localStorage.getItem(LS.font));
    return isNaN(v) ? 1 : Math.min(FONT_MAX, Math.max(FONT_MIN, v));
  }

  function applyFontScale(scale) {
    document.documentElement.style.setProperty("--font-scale", String(scale));
  }

  function changeFont(delta) {
    let scale = Math.round((getFontScale() + delta) * 10) / 10;
    scale = Math.min(FONT_MAX, Math.max(FONT_MIN, scale));
    applyFontScale(scale);
    localStorage.setItem(LS.font, String(scale));
  }

  // ---- Reading position ----
  function savePosition() {
    if (currentNum == null) return;
    const max = el.scroll.scrollHeight - el.scroll.clientHeight;
    const ratio = max > 0 ? el.scroll.scrollTop / max : 0;
    localStorage.setItem(LS.position, JSON.stringify({ num: currentNum, ratio: ratio }));
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(savePosition, 250);
  }

  function applyScrollRatio(ratio) {
    // Reading scrollHeight forces a synchronous layout, so this is accurate
    // immediately without waiting for requestAnimationFrame (which is throttled
    // in background tabs).
    const max = el.scroll.scrollHeight - el.scroll.clientHeight;
    el.scroll.scrollTop = max > 0 ? ratio * max : 0;
  }

  function getSavedPosition() {
    try {
      return JSON.parse(localStorage.getItem(LS.position));
    } catch (e) {
      return null;
    }
  }

  // ---- Routing (hash based: #/chapter/N) ----
  function parseHash() {
    const m = location.hash.match(/^#\/chapter\/(\d+)$/);
    return m ? parseInt(m[1], 10) : null;
  }

  function goToChapter(num) {
    const target = "#/chapter/" + num;
    if (location.hash === target) {
      loadChapter(num); // hashchange will not fire, so load directly
    } else {
      location.hash = target; // triggers onHashChange -> loadChapter
    }
  }

  function onHashChange() {
    const num = parseHash();
    if (num != null) loadChapter(num);
  }

  // ---- Markdown rendering ----
  function renderMarkdown(md) {
    // The real title is "# Chapter N". The scraper also leaves a bare "# N"
    // heading right below it; drop those so two large headings do not stack.
    let text = md.replace(/^#\s+\d+\s*$/gm, "");
    // Chapters store one sentence per line with no blank line between them, which
    // Markdown would otherwise collapse into a single paragraph. Re-separate every
    // non-empty line with a blank line so each renders as its own block.
    const blocks = text
      .split("\n")
      .map(function (l) {
        return l.trim();
      })
      .filter(Boolean)
      .join("\n\n");
    return marked.parse(blocks);
  }

  async function loadChapter(num) {
    const entry = byNum.get(num);
    if (!entry) {
      el.content.innerHTML =
        '<p class="chapter-error">Chapter ' + num + " is not in the index.</p>";
      return;
    }

    currentNum = num;
    hideResume();

    // Capture and clear any pending scroll restore for this load.
    const restoreRatio = pendingScrollRatio;
    pendingScrollRatio = null;

    let html = renderCache.get(num);
    if (html == null) {
      try {
        const res = await fetch(entry.file);
        if (!res.ok) throw new Error("HTTP " + res.status);
        const md = await res.text();
        html = renderMarkdown(md);
        renderCache.set(num, html); // cache so revisiting does not re-fetch/re-parse
      } catch (err) {
        el.content.innerHTML =
          '<p class="chapter-error">Could not load this chapter. ' +
          "If you are offline it may not be cached yet.</p>";
        return;
      }
    }

    el.content.innerHTML = html;
    document.title = entry.title + " - Pick Me Up Reader";
    updateActiveLink(num);
    updateNav(num);
    closeSidebar();

    // Restore scroll if resuming, else jump to the top. A short timeout re-applies
    // the position after web fonts swap in and shift the layout height.
    el.scroll.scrollTop = 0;
    if (restoreRatio != null) {
      applyScrollRatio(restoreRatio);
      setTimeout(function () {
        applyScrollRatio(restoreRatio);
      }, 120);
    }
    savePosition();
  }

  function updateActiveLink(num) {
    const links = el.list.querySelectorAll(".chapter-link");
    links.forEach(function (a) {
      const on = parseInt(a.dataset.num, 10) === num;
      a.classList.toggle("active", on);
      if (on) a.scrollIntoView({ block: "nearest" });
    });
  }

  function updateNav(num) {
    const i = orderIndex.get(num);
    const prev = i > 0 ? chapters[i - 1] : null;
    const next = i < chapters.length - 1 ? chapters[i + 1] : null;
    el.prev.disabled = !prev;
    el.next.disabled = !next;
    el.prev.dataset.num = prev ? prev.num : "";
    el.next.dataset.num = next ? next.num : "";
    el.indicator.textContent = "Chapter " + num + " of " + chapters.length;
  }

  // ---- Sidebar ----
  function buildSidebar() {
    const frag = document.createDocumentFragment();
    chapters.forEach(function (c) {
      const li = document.createElement("li");
      const a = document.createElement("button");
      a.className = "chapter-link";
      a.type = "button";
      a.dataset.num = c.num;
      a.textContent = c.title;
      li.appendChild(a);
      frag.appendChild(li);
    });
    el.list.innerHTML = "";
    el.list.appendChild(frag);
  }

  function openSidebar() {
    document.body.classList.add("sidebar-open");
    el.sidebarToggle.setAttribute("aria-expanded", "true");
  }

  function closeSidebar() {
    document.body.classList.remove("sidebar-open");
    el.sidebarToggle.setAttribute("aria-expanded", "false");
  }

  function toggleSidebar() {
    if (document.body.classList.contains("sidebar-open")) closeSidebar();
    else openSidebar();
  }

  // ---- Welcome / resume ----
  function showWelcome() {
    el.content.innerHTML =
      '<div class="welcome"><h2>Pick Me Up Reader</h2>' +
      "<p>Select a chapter from the list to begin.</p></div>";
    el.indicator.textContent = "";
    el.prev.disabled = true;
    el.next.disabled = true;
  }

  function showResume(num) {
    el.resumeText.textContent = "Resume reading Chapter " + num + "?";
    el.resume.hidden = false;
  }

  function hideResume() {
    el.resume.hidden = true;
  }

  // ---- Events ----
  function onKeydown(e) {
    const t = e.target;
    if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === "ArrowLeft" && !el.prev.disabled) {
      goToChapter(parseInt(el.prev.dataset.num, 10));
    } else if (e.key === "ArrowRight" && !el.next.disabled) {
      goToChapter(parseInt(el.next.dataset.num, 10));
    }
  }

  function wireEvents() {
    window.addEventListener("hashchange", onHashChange);
    document.addEventListener("keydown", onKeydown);
    el.scroll.addEventListener("scroll", scheduleSave, { passive: true });
    window.addEventListener("beforeunload", savePosition);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "hidden") savePosition();
    });

    el.list.addEventListener("click", function (e) {
      const a = e.target.closest(".chapter-link");
      if (a) goToChapter(parseInt(a.dataset.num, 10));
    });
    el.prev.addEventListener("click", function () {
      if (!el.prev.disabled) goToChapter(parseInt(el.prev.dataset.num, 10));
    });
    el.next.addEventListener("click", function () {
      if (!el.next.disabled) goToChapter(parseInt(el.next.dataset.num, 10));
    });

    el.sidebarToggle.addEventListener("click", toggleSidebar);
    el.backdrop.addEventListener("click", closeSidebar);
    el.themeToggle.addEventListener("click", toggleTheme);
    el.fontInc.addEventListener("click", function () {
      changeFont(FONT_STEP);
    });
    el.fontDec.addEventListener("click", function () {
      changeFont(-FONT_STEP);
    });

    el.resumeBtn.addEventListener("click", function () {
      const saved = getSavedPosition();
      hideResume();
      if (saved && byNum.has(saved.num)) {
        pendingScrollRatio = saved.ratio;
        goToChapter(saved.num);
      } else if (chapters.length) {
        goToChapter(chapters[0].num);
      }
    });
    el.resumeDismiss.addEventListener("click", hideResume);
  }

  // ---- Service worker (added in the PWA layer; harmless if sw.js is absent) ----
  function registerSW() {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", function () {
        navigator.serviceWorker.register("sw.js").catch(function (err) {
          console.warn("Service worker registration failed:", err);
        });
      });
    }
  }

  // ---- Init ----
  async function init() {
    cacheEls();
    initTheme();
    applyFontScale(getFontScale());
    registerSW();
    wireEvents();

    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) throw new Error("HTTP " + res.status);
      chapters = await res.json();
    } catch (err) {
      el.list.innerHTML =
        '<li class="chapter-list-loading">Could not load the chapter index.</li>';
      el.content.innerHTML =
        '<p class="chapter-error">Failed to load chapters_index.json.</p>';
      return;
    }

    chapters.sort(function (a, b) {
      return a.num - b.num;
    });
    chapters.forEach(function (c, i) {
      byNum.set(c.num, c);
      orderIndex.set(c.num, i);
    });
    buildSidebar();

    const hashNum = parseHash();
    const saved = getSavedPosition();

    if (hashNum != null && byNum.has(hashNum)) {
      // Deep link or refresh: if it matches the saved chapter, restore scroll too.
      if (saved && saved.num === hashNum) pendingScrollRatio = saved.ratio;
      loadChapter(hashNum);
    } else if (saved && byNum.has(saved.num)) {
      // No hash but we have a saved spot: offer to resume rather than auto-jump.
      showWelcome();
      showResume(saved.num);
    } else if (chapters.length) {
      goToChapter(chapters[0].num);
    } else {
      showWelcome();
    }
  }

  document.addEventListener("DOMContentLoaded", init);
})();
