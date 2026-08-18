import type {
  JSX, 
} from "preact";
import {
  activeThemeMode, setThemeMode, 
} from "#store/themeStore";
import {
  ThemeMode, 
} from "#engine/types";
import {
  LightThemeIcon,
  DarkThemeIcon,
  SystemThemeIcon,
} from "#components/Icons";

export default function ThemeToggle(): JSX.Element {
  const currentMode = activeThemeMode.value;

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        background: "var(--bg-surface-secondary)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "var(--border-radius-sm)",
        padding: "2px",
      }}
    >
      {/* Light Mode Button */}
      <button
        type="button"
        onClick={() => setThemeMode(ThemeMode.Light)}
        title="Institutional Light Theme (Default)"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: currentMode === ThemeMode.Light ? 700 : 500,
          color:
            currentMode === ThemeMode.Light
              ? "var(--text-primary)"
              : "var(--text-muted)",
          backgroundColor:
            currentMode === ThemeMode.Light
              ? "var(--bg-surface)"
              : "transparent",
          boxShadow:
            currentMode === ThemeMode.Light ? "var(--shadow-sm)" : "none",
          transition: "var(--transition)",
        }}
      >
        <LightThemeIcon size={13} />
        <span>Light</span>
      </button>

      {/* Dark Mode Button */}
      <button
        type="button"
        onClick={() => setThemeMode(ThemeMode.Dark)}
        title="Dark Theme"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: currentMode === ThemeMode.Dark ? 700 : 500,
          color:
            currentMode === ThemeMode.Dark
              ? "var(--text-primary)"
              : "var(--text-muted)",
          backgroundColor:
            currentMode === ThemeMode.Dark
              ? "var(--bg-surface)"
              : "transparent",
          boxShadow:
            currentMode === ThemeMode.Dark ? "var(--shadow-sm)" : "none",
          transition: "var(--transition)",
        }}
      >
        <DarkThemeIcon size={13} />
        <span>Dark</span>
      </button>

      {/* System Preference Button */}
      <button
        type="button"
        onClick={() => setThemeMode(ThemeMode.System)}
        title="Follow System OS Preference"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "4px",
          padding: "4px 8px",
          border: "none",
          borderRadius: "4px",
          cursor: "pointer",
          fontSize: "0.75rem",
          fontWeight: currentMode === ThemeMode.System ? 700 : 500,
          color:
            currentMode === ThemeMode.System
              ? "var(--text-primary)"
              : "var(--text-muted)",
          backgroundColor:
            currentMode === ThemeMode.System
              ? "var(--bg-surface)"
              : "transparent",
          boxShadow:
            currentMode === ThemeMode.System ? "var(--shadow-sm)" : "none",
          transition: "var(--transition)",
        }}
      >
        <SystemThemeIcon size={13} />
        <span>Auto</span>
      </button>
    </div>
  );
}
