import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  ThemeMode,
  ThemePalette,
} from "#engine/types";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_SETTINGS,
  LEGACY_APPEARANCE_KEYS,
  THEME_PALETTE_OPTIONS,
  parseAppearanceSettings,
  resolveEffectiveTheme,
  serializeAppearanceSettings,
} from "#utils/themeConfig";

describe("Theme Configuration Helpers", () => {
  it("defines shared appearance key, defaults, legacy keys, and all 4 palette options", () => {
    assert.equal(APPEARANCE_STORAGE_KEY, "rechner:shared:appearance:v1");
    assert.deepEqual(DEFAULT_APPEARANCE_SETTINGS, {
      mode: ThemeMode.Light,
      palette: ThemePalette.Cobalt,
    });
    assert.ok(LEGACY_APPEARANCE_KEYS.includes("german_calc_theme_mode"));
    assert.deepEqual(
      THEME_PALETTE_OPTIONS.map((option) => option.value),
      [
        ThemePalette.Cobalt,
        ThemePalette.Forest,
        ThemePalette.Indigo,
        ThemePalette.Stone,
      ],
    );
  });

  it("resolves effective light or dark theme from explicit and system modes", () => {
    assert.equal(resolveEffectiveTheme(ThemeMode.Light, true), "light");
    assert.equal(resolveEffectiveTheme(ThemeMode.Light, false), "light");
    assert.equal(resolveEffectiveTheme(ThemeMode.Dark, false), "dark");
    assert.equal(resolveEffectiveTheme(ThemeMode.Dark, true), "dark");
    assert.equal(resolveEffectiveTheme(ThemeMode.System, false), "light");
    assert.equal(resolveEffectiveTheme(ThemeMode.System, true), "dark");
  });

  it("round-trips serialized appearance settings", () => {
    const serialized = serializeAppearanceSettings({
      mode: ThemeMode.Dark,
      palette: ThemePalette.Forest,
    });
    assert.deepEqual(parseAppearanceSettings(serialized), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Forest,
    });
  });

  it("parses legacy bare strings and versioned storage envelopes", () => {
    assert.deepEqual(parseAppearanceSettings("dark"), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
    });
    assert.deepEqual(parseAppearanceSettings("system"), {
      mode: ThemeMode.System,
      palette: ThemePalette.Cobalt,
    });
    const envelope = JSON.stringify({
      format: "rechner-storage-value",
      version: 1,
      value: "dark",
    });
    assert.deepEqual(parseAppearanceSettings(envelope), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
    });
  });

  it("handles partial objects and rejects empty or invalid payloads", () => {
    assert.deepEqual(parseAppearanceSettings(JSON.stringify({ palette: "indigo" })), {
      mode: ThemeMode.Light,
      palette: ThemePalette.Indigo,
    });
    assert.deepEqual(parseAppearanceSettings(JSON.stringify({ mode: "dark",
      palette: "unknown" })), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
    });
    assert.equal(parseAppearanceSettings(null), null);
    assert.equal(parseAppearanceSettings(""), null);
    assert.equal(parseAppearanceSettings("not-json-or-mode"), null);
    assert.equal(parseAppearanceSettings("[]"), null);
    assert.equal(parseAppearanceSettings(JSON.stringify({ mode: "neon",
      palette: "pink" })), null);
  });
});
