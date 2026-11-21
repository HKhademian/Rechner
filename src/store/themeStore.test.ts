import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  describe,
  it,
} from "node:test";

describe("Global Theme Store", () => {
  it("applies mode & palette to documentElement and follows system dark-mode changes", () => {
    const script = `
      import assert from "node:assert/strict";
      const attrs = new Map();
      let mediaMatches = false;
      const listeners = [];
      globalThis.document = {
        documentElement: {
          setAttribute: (k, v) => attrs.set(k, v),
          getAttribute: (k) => attrs.get(k) ?? null,
        },
      };
      globalThis.window = {
        matchMedia: () => ({
          get matches() { return mediaMatches; },
          addEventListener: (_type, cb) => listeners.push(cb),
        }),
        addEventListener: () => {},
      };
      const store = await import("#store/themeStore");
      const { ThemeMode, ThemePalette, ThemeStyle } = await import("#engine/types");
      assert.equal(attrs.get("data-theme"), "light");
      assert.equal(attrs.get("data-palette"), "cobalt");
      assert.equal(attrs.get("data-style"), "swiss");

      store.setThemeMode(ThemeMode.Dark);
      store.setThemePalette(ThemePalette.Forest);
      store.setThemeStyle(ThemeStyle.Editorial);
      assert.equal(attrs.get("data-theme"), "dark");
      assert.equal(attrs.get("data-palette"), "forest");
      assert.equal(attrs.get("data-style"), "editorial");

      store.setThemeMode(ThemeMode.System);
      assert.equal(attrs.get("data-theme"), "light");
      mediaMatches = true;
      for (const cb of listeners) {
        cb();
      }
      assert.equal(attrs.get("data-theme"), "dark");

      store.resetAppearance();
      assert.equal(store.activeThemeMode.value, ThemeMode.Light);
      assert.equal(store.activeThemePalette.value, ThemePalette.Cobalt);
      assert.equal(store.activeThemeStyle.value, ThemeStyle.Swiss);
      assert.equal(attrs.get("data-theme"), "light");
      assert.equal(attrs.get("data-palette"), "cobalt");
      assert.equal(attrs.get("data-style"), "swiss");
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      stdio: "pipe",
    }));
  });

  it("respects Privacy StorageMode (Memory/Session/Persistent) and cross-tab reload", () => {
    const script = `
      import assert from "node:assert/strict";
      const localMap = new Map();
      const sessionMap = new Map();
      const mkStorage = (m) => ({
        getItem: (k) => m.get(k) ?? null,
        setItem: (k, v) => m.set(k, v),
        removeItem: (k) => m.delete(k),
      });
      globalThis.window = globalThis;
      globalThis.localStorage = mkStorage(localMap);
      globalThis.sessionStorage = mkStorage(sessionMap);

      const storageMod = await import("#engine/storage/appStorage");
      const store = await import("#store/themeStore");
      const { ThemeMode, ThemePalette, ThemeStyle } = await import("#engine/types");
      const { APPEARANCE_STORAGE_KEY } = await import("#utils/themeConfig");

      // Memory mode keeps selection in memory without writing browser storage
      assert.equal(storageMod.getStorageMode(), storageMod.StorageMode.Memory);
      store.setThemeMode(ThemeMode.Dark);
      assert.equal(localMap.has(APPEARANCE_STORAGE_KEY), false);
      assert.equal(sessionMap.has(APPEARANCE_STORAGE_KEY), false);

      // Session mode persists to sessionStorage only
      assert.equal(storageMod.setStorageMode(storageMod.StorageMode.Session), true);
      store.setThemePalette(ThemePalette.Indigo);
      store.setThemeStyle(ThemeStyle.Utility);
      assert.equal(localMap.has(APPEARANCE_STORAGE_KEY), false);
      assert.equal(
        JSON.parse(sessionMap.get(APPEARANCE_STORAGE_KEY)).palette,
        ThemePalette.Indigo,
      );
      assert.equal(
        JSON.parse(sessionMap.get(APPEARANCE_STORAGE_KEY)).style,
        ThemeStyle.Utility,
      );

      // Persistent mode persists to localStorage and reloads on storage updates
      assert.equal(storageMod.setStorageMode(storageMod.StorageMode.Persistent, true), true);
      store.setThemePalette(ThemePalette.Stone);
      assert.equal(
        JSON.parse(localMap.get(APPEARANCE_STORAGE_KEY)).palette,
        ThemePalette.Stone,
      );

      localMap.set(APPEARANCE_STORAGE_KEY, JSON.stringify({ mode: "light", palette: "forest", style: "editorial" }));
      store.reloadAppearanceFromStorage();
      assert.equal(store.activeThemeMode.value, ThemeMode.Light);
      assert.equal(store.activeThemePalette.value, ThemePalette.Forest);
      assert.equal(store.activeThemeStyle.value, ThemeStyle.Editorial);

      store.resetAppearance();
      assert.equal(localMap.has(APPEARANCE_STORAGE_KEY), false);
      assert.equal(sessionMap.has(APPEARANCE_STORAGE_KEY), false);
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      stdio: "pipe",
    }));
  });

  it("falls back to legacy per-app or global keys in storage without writing on boot", () => {
    const script = `
      import assert from "node:assert/strict";
      const localMap = new Map([
        ["rechner:privacy:storage-mode:v1", "persistent"],
        ["german_calc_theme_mode", "dark"],
      ]);
      globalThis.window = globalThis;
      globalThis.localStorage = {
        getItem: (k) => localMap.get(k) ?? null,
        setItem: (k, v) => localMap.set(k, v),
        removeItem: (k) => localMap.delete(k),
      };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };

      const store = await import("#store/themeStore");
      const { ThemeMode, ThemePalette, ThemeStyle } = await import("#engine/types");
      const { APPEARANCE_STORAGE_KEY } = await import("#utils/themeConfig");

      assert.equal(store.activeThemeMode.value, ThemeMode.Dark);
      assert.equal(store.activeThemePalette.value, ThemePalette.Cobalt);
      assert.equal(store.activeThemeStyle.value, ThemeStyle.Swiss);
      assert.equal(localMap.has(APPEARANCE_STORAGE_KEY), false);
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], {
      cwd: process.cwd(),
      stdio: "pipe",
    }));
  });
});
