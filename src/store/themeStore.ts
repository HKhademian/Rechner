import {
  effect,
  signal,
} from "@preact/signals";
import {
  browserWebStorageForCurrentMode,
  clearSharedBrowserKey,
} from "#engine/storage/appStorage";
import {
  type ThemePalette,
  ThemeMode,
} from "#engine/types";
import {
  type AppearanceSettings,
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_SETTINGS,
  LEGACY_APPEARANCE_KEYS,
  parseAppearanceSettings,
  resolveEffectiveTheme,
  serializeAppearanceSettings,
} from "#utils/themeConfig";

function readInitialAppearanceSettings(): AppearanceSettings {
  if (typeof window === "undefined") {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
  const storage = browserWebStorageForCurrentMode();
  if (!storage) {
    return DEFAULT_APPEARANCE_SETTINGS;
  }
  try {
    const shared = parseAppearanceSettings(storage.getItem(APPEARANCE_STORAGE_KEY));
    if (shared) {
      return shared;
    }
    for (const legacyKey of LEGACY_APPEARANCE_KEYS) {
      const legacyParsed = parseAppearanceSettings(storage.getItem(legacyKey));
      if (legacyParsed) {
        return legacyParsed;
      }
    }
  }
  catch {
    // Ignore storage read exceptions (e.g. private browsing)
  }
  return DEFAULT_APPEARANCE_SETTINGS;
}

const initialAppearance = readInitialAppearanceSettings();

/** Reactive signal tracking the active theme mode preference (light, dark, or system). */
export const activeThemeMode = signal<ThemeMode>(initialAppearance.mode);

/** Reactive signal tracking the active institutional color palette site-wide. */
export const activeThemePalette = signal<ThemePalette>(initialAppearance.palette);

function persistCurrentAppearance(settings: AppearanceSettings): void {
  const storage = browserWebStorageForCurrentMode();
  if (!storage) {
    return;
  }
  try {
    storage.setItem(APPEARANCE_STORAGE_KEY, serializeAppearanceSettings(settings));
  }
  catch {
    // Ignore storage write exceptions
  }
}

/**
 * Applies the effective theme ("light" | "dark") and selected palette to the root document element.
 */
export function applyThemeToDocument(
  mode: ThemeMode,
  palette: ThemePalette = activeThemePalette.value,
): void {
  if (typeof document === "undefined") {
    return;
  }
  const systemPrefersDark =
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const effectiveTheme = resolveEffectiveTheme(mode, systemPrefersDark);
  const root = document.documentElement;
  root.setAttribute("data-theme", effectiveTheme);
  root.setAttribute("data-palette", palette);
}

/**
 * Updates the active theme mode site-wide, persists it under the active Privacy `StorageMode`,
 * and updates the document attributes.
 */
export function setThemeMode(newMode: ThemeMode): void {
  activeThemeMode.value = newMode;
  persistCurrentAppearance({
    mode: newMode,
    palette: activeThemePalette.value,
  });
  applyThemeToDocument(newMode, activeThemePalette.value);
}

/**
 * Updates the active institutional color palette site-wide, persists it under the active
 * Privacy `StorageMode`, and updates the document attributes.
 */
export function setThemePalette(newPalette: ThemePalette): void {
  activeThemePalette.value = newPalette;
  persistCurrentAppearance({
    mode: activeThemeMode.value,
    palette: newPalette,
  });
  applyThemeToDocument(activeThemeMode.value, newPalette);
}

/** Resets shared theme mode and palette to defaults and clears shared appearance keys. */
export function resetAppearance(): void {
  activeThemeMode.value = DEFAULT_APPEARANCE_SETTINGS.mode;
  activeThemePalette.value = DEFAULT_APPEARANCE_SETTINGS.palette;
  clearSharedBrowserKey(APPEARANCE_STORAGE_KEY);
  applyThemeToDocument(
    DEFAULT_APPEARANCE_SETTINGS.mode,
    DEFAULT_APPEARANCE_SETTINGS.palette,
  );
}

/** Reloads site-wide appearance settings from storage (used for cross-tab storage events). */
export function reloadAppearanceFromStorage(): void {
  const reloaded = readInitialAppearanceSettings();
  activeThemeMode.value = reloaded.mode;
  activeThemePalette.value = reloaded.palette;
  applyThemeToDocument(reloaded.mode, reloaded.palette);
}

// Client-side initialization, system change listener, and cross-tab synchronization
if (typeof window !== "undefined") {
  applyThemeToDocument(activeThemeMode.value, activeThemePalette.value);

  effect(() => {
    applyThemeToDocument(activeThemeMode.value, activeThemePalette.value);
  });

  if (typeof window.matchMedia === "function") {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", () => {
      if (activeThemeMode.value === ThemeMode.System) {
        applyThemeToDocument(ThemeMode.System, activeThemePalette.value);
      }
    });
  }

  if (typeof window.addEventListener === "function") {
    window.addEventListener("storage", (event: StorageEvent) => {
      if (event.key === APPEARANCE_STORAGE_KEY || event.key === null) {
        reloadAppearanceFromStorage();
      }
    });
  }
}
