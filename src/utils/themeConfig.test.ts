import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  ThemeMode,
  ThemePalette,
  ThemeStyle,
} from "#engine/types";
import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE_SETTINGS,
  LEGACY_APPEARANCE_KEYS,
  THEME_PALETTE_OPTIONS,
  THEME_STYLE_OPTIONS,
  parseAppearanceSettings,
  resolveEffectiveTheme,
  serializeAppearanceSettings,
} from "#utils/themeConfig";

describe("Theme Configuration Helpers", () => {
  it("defines shared appearance key, defaults, legacy keys, 4 palettes, and 3 design styles", () => {
    assert.equal(APPEARANCE_STORAGE_KEY, "rechner:shared:appearance:v1");
    assert.deepEqual(DEFAULT_APPEARANCE_SETTINGS, {
      mode: ThemeMode.Light,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Swiss,
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
    assert.deepEqual(
      THEME_STYLE_OPTIONS.map((option) => option.value),
      [
        ThemeStyle.Swiss,
        ThemeStyle.Editorial,
        ThemeStyle.Utility,
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
      style: ThemeStyle.Editorial,
    });
    assert.deepEqual(parseAppearanceSettings(serialized), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Forest,
      style: ThemeStyle.Editorial,
    });
  });

  it("parses legacy bare strings and versioned storage envelopes", () => {
    assert.deepEqual(parseAppearanceSettings("dark"), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Swiss,
    });
    assert.deepEqual(parseAppearanceSettings("system"), {
      mode: ThemeMode.System,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Swiss,
    });
    const envelope = JSON.stringify({
      format: "rechner-storage-value",
      version: 1,
      value: "dark",
    });
    assert.deepEqual(parseAppearanceSettings(envelope), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Swiss,
    });
  });

  it("handles partial objects and rejects empty or invalid payloads", () => {
    assert.deepEqual(parseAppearanceSettings(JSON.stringify({ palette: "indigo" })), {
      mode: ThemeMode.Light,
      palette: ThemePalette.Indigo,
      style: ThemeStyle.Swiss,
    });
    assert.deepEqual(parseAppearanceSettings(JSON.stringify({ style: "utility" })), {
      mode: ThemeMode.Light,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Utility,
    });
    assert.deepEqual(parseAppearanceSettings(JSON.stringify({ mode: "dark",
      palette: "unknown",
      style: "brutalist" })), {
      mode: ThemeMode.Dark,
      palette: ThemePalette.Cobalt,
      style: ThemeStyle.Swiss,
    });
    assert.equal(parseAppearanceSettings(null), null);
    assert.equal(parseAppearanceSettings(""), null);
    assert.equal(parseAppearanceSettings("not-json-or-mode"), null);
    assert.equal(parseAppearanceSettings("[]"), null);
    assert.equal(parseAppearanceSettings(JSON.stringify({ mode: "neon",
      palette: "pink",
      style: "comic" })), null);
  });
});
