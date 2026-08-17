import type { JSX } from "preact";
import { activeThemeMode, setThemeMode } from "#store/themeStore";
import { ThemeMode } from "#engine/types";

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
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
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
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
        </svg>
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
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <rect width="20" height="14" x="2" y="3" rx="2" />
          <line x1="8" x2="16" y1="21" y2="21" />
          <line x1="12" x2="12" y1="17" y2="21" />
        </svg>
        <span>Auto</span>
      </button>
    </div>
  );
}
