import { signal, effect } from "@preact/signals";
import { ThemeMode, toThemeMode } from "#engine/types";

const THEME_STORAGE_KEY = "german_calc_theme_mode";

/**
 * Initializes the default theme mode from storage or defaults to institutional Light
 */
function getInitialThemeMode(): ThemeMode {
  if (typeof window === "undefined") {
    return ThemeMode.Light;
  }
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored) {
      return toThemeMode(stored);
    }
  } catch {
    // Ignore storage read exceptions (e.g. private browsing)
  }
  return ThemeMode.Light;
}

/** Reactive signal tracking the active theme mode preference (light, dark, or system). */
export const activeThemeMode = signal<ThemeMode>(getInitialThemeMode());

/**
 * Applies the effective theme (light / dark) to the root document element.
 *
 * @param mode - Theme mode to activate.
 */
export function applyThemeToDocument(mode: ThemeMode): void {
  if (typeof document === "undefined") return;

  let effectiveDark = false;
  if (mode === ThemeMode.Dark) {
    effectiveDark = true;
  } else if (mode === ThemeMode.System) {
    if (typeof window !== "undefined" && window.matchMedia) {
      effectiveDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
  }

  const root = document.documentElement;
  if (effectiveDark) {
    root.setAttribute("data-theme", "dark");
  } else {
    root.setAttribute("data-theme", "light");
  }
}

/**
 * Updates the active theme mode signal, persists preference to localStorage, and updates document DOM attribute.
 *
 * @param newMode - Selected `ThemeMode` (Light, Dark, or System).
 */
export function setThemeMode(newMode: ThemeMode): void {
  activeThemeMode.value = newMode;
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newMode);
    } catch {
      // Ignore storage write exceptions
    }
  }
  applyThemeToDocument(newMode);
}

// Client-side initialization and system change listener
if (typeof window !== "undefined") {
  // Apply immediately on load
  applyThemeToDocument(activeThemeMode.value);

  // Sync on reactive signal changes
  effect(() => {
    applyThemeToDocument(activeThemeMode.value);
  });

  // Listen for OS color scheme adjustments when in System mode
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (activeThemeMode.value === ThemeMode.System) {
        applyThemeToDocument(ThemeMode.System);
      }
    });
  }
}
