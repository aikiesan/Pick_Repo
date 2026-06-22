import type { Theme } from "../types";

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onFontInc: () => void;
  onFontDec: () => void;
  canFontInc: boolean;
  canFontDec: boolean;
  fontFamily: "serif" | "sans";
  onToggleFontFamily: () => void;
}

export function Topbar({
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  onFontInc,
  onFontDec,
  canFontInc,
  canFontDec,
  fontFamily,
  onToggleFontFamily,
}: TopbarProps) {
  return (
    <header className="topbar">
      <button
        className="icon-btn sidebar-toggle"
        onClick={onToggleSidebar}
        aria-label="Toggle chapter list"
        aria-expanded={sidebarOpen}
      >
        <span className="bars" aria-hidden="true" />
      </button>

      <h1 className="topbar-title">
        Pick Me Up <span className="topbar-sub">Infinite Gacha</span>
      </h1>

      <div className="controls">
        <button
          className="icon-btn font-control-btn"
          onClick={onFontDec}
          disabled={!canFontDec}
          aria-label="Decrease font size"
        >
          <span className="font-label small-a">A</span>
          <span className="font-arrow down-arrow">▼</span>
        </button>
        <button
          className="icon-btn font-control-btn"
          onClick={onFontInc}
          disabled={!canFontInc}
          aria-label="Increase font size"
        >
          <span className="font-label large-a">A</span>
          <span className="font-arrow up-arrow">▲</span>
        </button>
        <button
          className={`icon-btn font-family-btn font-family-${fontFamily}`}
          onClick={onToggleFontFamily}
          aria-label="Toggle font family"
          title={fontFamily === "serif" ? "Switch to sans-serif font" : "Switch to serif font"}
        >
          {fontFamily === "serif" ? "Serif" : "Sans"}
        </button>
        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label="Toggle theme mode"
          title={
            theme === "dark"
              ? "Switch to light mode"
              : theme === "light"
              ? "Switch to sepia mode"
              : "Switch to dark mode"
          }
        >
          {theme === "dark" ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sun-icon"
            >
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : theme === "light" ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="sepia-icon"
            >
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="moon-icon"
            >
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
