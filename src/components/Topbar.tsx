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
          className="icon-btn"
          onClick={onFontDec}
          disabled={!canFontDec}
          aria-label="Decrease font size"
        >
          A-
        </button>
        <button
          className="icon-btn"
          onClick={onFontInc}
          disabled={!canFontInc}
          aria-label="Increase font size"
        >
          A+
        </button>
        <button
          className="icon-btn"
          onClick={onToggleTheme}
          aria-label="Toggle dark and light mode"
          title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        >
          <span className="theme-icon" aria-hidden="true" />
        </button>
      </div>
    </header>
  );
}
