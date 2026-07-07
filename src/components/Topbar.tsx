import type { Theme } from "../types";

interface TopbarProps {
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  canBookmark: boolean;
  onBookmark: () => void;
  settingsOpen: boolean;
  onToggleSettings: () => void;
}

const THEME_TITLES: Record<Theme, string> = {
  dark: "Switch to black (OLED) mode",
  black: "Switch to light mode",
  light: "Switch to sepia mode",
  sepia: "Switch to dark mode",
};

export function Topbar({
  sidebarOpen,
  onToggleSidebar,
  theme,
  onToggleTheme,
  canBookmark,
  onBookmark,
  settingsOpen,
  onToggleSettings,
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
        {canBookmark && (
          <button
            className="icon-btn bookmark-btn"
            onClick={onBookmark}
            aria-label="Bookmark this spot"
            title="Bookmark this spot (select text first to save a quote)"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2Z" />
            </svg>
          </button>
        )}

        <button
          className="icon-btn theme-toggle-btn"
          onClick={onToggleTheme}
          aria-label="Toggle theme mode"
          title={THEME_TITLES[theme]}
        >
          {theme === "dark" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="moon-icon">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : theme === "black" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="moon-icon">
              <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
            </svg>
          ) : theme === "light" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sun-icon">
              <circle cx="12" cy="12" r="4" />
              <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="sepia-icon">
              <path d="M17 8h1a4 4 0 1 1 0 8h-1" />
              <path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z" />
              <line x1="6" y1="2" x2="6" y2="4" />
              <line x1="10" y1="2" x2="10" y2="4" />
              <line x1="14" y1="2" x2="14" y2="4" />
            </svg>
          )}
        </button>

        <button
          className={"icon-btn settings-btn" + (settingsOpen ? " active" : "")}
          onClick={onToggleSettings}
          aria-label="Reading settings"
          aria-expanded={settingsOpen}
          title="Reading settings"
        >
          Aa
        </button>
      </div>
    </header>
  );
}
