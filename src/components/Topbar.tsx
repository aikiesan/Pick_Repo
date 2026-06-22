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
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label="Toggle dark and light mode"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
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
