import {
  ThemeMode,
  ThemePalette,
  toThemeMode,
  toThemePalette,
} from "#engine/types";

export const APPEARANCE_STORAGE_KEY = "rechner:shared:appearance:v1";

export const LEGACY_APPEARANCE_KEYS = [
  "german_calc_theme_mode",
  "rechner:catalog:v1:theme",
  "rechner:net-pay:v1:theme",
  "rechner:parental-leave:v1:theme",
  "rechner:girocode:v1:theme",
] as const;

export interface AppearanceSettings {
  readonly mode: ThemeMode;
  readonly palette: ThemePalette;
}

export const DEFAULT_APPEARANCE_SETTINGS: AppearanceSettings = {
  mode: ThemeMode.Light,
  palette: ThemePalette.Cobalt,
};

export interface ThemePaletteOption {
  readonly value: ThemePalette;
  readonly label: string;
  readonly description: string;
}

export const THEME_PALETTE_OPTIONS: readonly ThemePaletteOption[] = [
  {
    value: ThemePalette.Cobalt,
    label: "Cobalt",
    description: "Slate & Cobalt",
  },
  {
    value: ThemePalette.Forest,
    label: "Forest",
    description: "Sage & Emerald",
  },
  {
    value: ThemePalette.Indigo,
    label: "Indigo",
    description: "Cool Indigo",
  },
  {
    value: ThemePalette.Stone,
    label: "Stone",
    description: "Warm Stone",
  },
] as const;

/** Resolves the effective DOM `data-theme` value ("light" or "dark") from a `ThemeMode`. */
export function resolveEffectiveTheme(
  mode: ThemeMode,
  systemPrefersDark: boolean,
): "light" | "dark" {
  if (mode === ThemeMode.Dark) {
    return "dark";
  }
  if (mode === ThemeMode.System) {
    return systemPrefersDark ? "dark" : "light";
  }
  return "light";
}

/** Serializes shared theme mode and palette settings for browser storage. */
export function serializeAppearanceSettings(settings: AppearanceSettings): string {
  return JSON.stringify({
    mode: settings.mode,
    palette: settings.palette,
  });
}

function tryParseMode(value: unknown): ThemeMode | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return toThemeMode(value);
  }
  catch {
    return null;
  }
}

function tryParsePalette(value: unknown): ThemePalette | null {
  if (typeof value !== "string") {
    return null;
  }
  try {
    return toThemePalette(value);
  }
  catch {
    return null;
  }
}

/**
 * Parses stored appearance settings from the shared JSON format, a bare legacy theme string
 * ("light" | "dark" | "system"), or a versioned `rechner-storage-value` envelope.
 */
export function parseAppearanceSettings(raw: string | null): AppearanceSettings | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const bareMode = tryParseMode(trimmed);
  if (bareMode !== null) {
    return {
      mode: bareMode,
      palette: DEFAULT_APPEARANCE_SETTINGS.palette,
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  }
  catch {
    return null;
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const candidate = parsed as Record<string, unknown>;
  if (
    candidate.format === "rechner-storage-value" &&
    typeof candidate.value === "string"
  ) {
    return parseAppearanceSettings(candidate.value);
  }

  const mode = tryParseMode(candidate.mode);
  const palette = tryParsePalette(candidate.palette);
  if (mode === null && palette === null) {
    return null;
  }

  return {
    mode: mode ?? DEFAULT_APPEARANCE_SETTINGS.mode,
    palette: palette ?? DEFAULT_APPEARANCE_SETTINGS.palette,
  };
}
