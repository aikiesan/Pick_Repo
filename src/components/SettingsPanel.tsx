import { useEffect } from "react";
import type { Theme } from "../types";
import type { FontControls } from "../hooks/useFontScale";
import type {
  LineSpacing,
  ReaderSettings,
  TextWidth,
} from "../hooks/useReaderSettings";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  font: FontControls;
  fontFamily: "serif" | "sans";
  onToggleFontFamily: () => void;
  settings: ReaderSettings;
  onUpdate: <K extends keyof ReaderSettings>(key: K, value: ReaderSettings[K]) => void;
}

const THEMES: { value: Theme; label: string }[] = [
  { value: "dark", label: "Dark" },
  { value: "black", label: "Black" },
  { value: "light", label: "Light" },
  { value: "sepia", label: "Sepia" },
];

const SPACINGS: { value: LineSpacing; label: string }[] = [
  { value: "compact", label: "Compact" },
  { value: "normal", label: "Normal" },
  { value: "relaxed", label: "Relaxed" },
];

const WIDTHS: { value: TextWidth; label: string }[] = [
  { value: "narrow", label: "Narrow" },
  { value: "normal", label: "Normal" },
  { value: "wide", label: "Wide" },
];

// The "Aa" reading menu: every comfort setting in one thumb-reachable sheet.
export function SettingsPanel({
  open,
  onClose,
  theme,
  onSetTheme,
  font,
  fontFamily,
  onToggleFontFamily,
  settings,
  onUpdate,
}: SettingsPanelProps) {
  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="settings-backdrop" onClick={onClose} aria-hidden="true" />
      <div className="settings-panel" role="dialog" aria-label="Reading settings">
        <div className="settings-row">
          <span className="settings-label">Font size</span>
          <div className="settings-controls">
            <button
              className="icon-btn"
              onClick={font.decrease}
              disabled={!font.canDecrease}
              aria-label="Decrease font size"
            >
              A−
            </button>
            <span className="settings-value">{Math.round(font.scale * 100)}%</span>
            <button
              className="icon-btn"
              onClick={font.increase}
              disabled={!font.canIncrease}
              aria-label="Increase font size"
            >
              A+
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Font</span>
          <div className="chip-group" role="group" aria-label="Font family">
            <button
              className={"chip" + (fontFamily === "serif" ? " selected" : "")}
              onClick={() => fontFamily !== "serif" && onToggleFontFamily()}
            >
              Serif
            </button>
            <button
              className={"chip" + (fontFamily === "sans" ? " selected" : "")}
              onClick={() => fontFamily !== "sans" && onToggleFontFamily()}
            >
              Sans
            </button>
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Theme</span>
          <div className="chip-group" role="group" aria-label="Theme">
            {THEMES.map((t) => (
              <button
                key={t.value}
                className={"chip chip-theme-" + t.value + (theme === t.value ? " selected" : "")}
                onClick={() => onSetTheme(t.value)}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Line spacing</span>
          <div className="chip-group" role="group" aria-label="Line spacing">
            {SPACINGS.map((s) => (
              <button
                key={s.value}
                className={"chip" + (settings.lineSpacing === s.value ? " selected" : "")}
                onClick={() => onUpdate("lineSpacing", s.value)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="settings-row">
          <span className="settings-label">Text width</span>
          <div className="chip-group" role="group" aria-label="Text width">
            {WIDTHS.map((w) => (
              <button
                key={w.value}
                className={"chip" + (settings.textWidth === w.value ? " selected" : "")}
                onClick={() => onUpdate("textWidth", w.value)}
              >
                {w.label}
              </button>
            ))}
          </div>
        </div>

        <label className="settings-row settings-switch-row">
          <span className="settings-label">
            Tap edges to turn page
            <small>Tap the left / right side of the page for previous / next chapter</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.edgeTap}
            onChange={(e) => onUpdate("edgeTap", e.target.checked)}
          />
        </label>

        <label className="settings-row settings-switch-row">
          <span className="settings-label">
            Keep screen on
            <small>Stops the screen from dimming while you read</small>
          </span>
          <input
            type="checkbox"
            className="switch"
            checked={settings.keepAwake}
            onChange={(e) => onUpdate("keepAwake", e.target.checked)}
          />
        </label>
      </div>
    </>
  );
}
