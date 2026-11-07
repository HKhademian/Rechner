import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  it,
} from "node:test";

it("net-pay boot migrates owned values and never initializes parental-leave storage", () => {
  const script = `
    import assert from "node:assert/strict";
    const values = new Map([["grossIncome", "12345"], ["payroll_taxYear", "2025"], ["savedScenarios", "[]"], ["elterngeld_simulator_state_v1", "{}"]]);
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
    assert.equal(setStorageMode("net-pay", StorageMode.Persistent, true), true);
    const store = await import("#store/calculatorStore");
    assert.equal(store.grossIncome.value, 12345);
    assert.equal(store.getCurrentInputs().taxYear, 2025);
    store.grossIncome.value = 0;
    assert.equal(values.get("rechner:net-pay:v1:grossIncome"), "0");
    assert.equal(values.get("grossIncome"), "12345");
    assert.ok(![...values.keys()].some(key => key.startsWith("rechner:parental-leave:")));
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
    stdio: "pipe" }));
});

it("parental-leave boot migrates its plan without initializing net-pay storage", () => {
  const script = `
    import assert from "node:assert/strict";
    const plan = JSON.stringify({ husbandGross: 4321, customPregnancies: [], customSalaryRaises: [], customTaxClassSwitches: [] });
    const values = new Map([["grossIncome", "12345"], ["elterngeld_simulator_state_v1", plan]]);
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
    assert.equal(setStorageMode("parental-leave", StorageMode.Persistent, true), true);
    const store = await import("#store/elterngeldStore");
    assert.equal(store.husbandGross.value, 4321);
    store.husbandGross.value = 5000;
    assert.equal(JSON.parse(values.get("rechner:parental-leave:v1:state")).husbandGross, 5000);
    assert.equal(values.get("elterngeld_simulator_state_v1"), plan);
    assert.ok(![...values.keys()].some(key => key.startsWith("rechner:net-pay:")));
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
    stdio: "pipe" }));
});

it("appearance preferences are scoped to the current app route", () => {
  for (const app of ["net-pay", "parental-leave", "catalog"]) {
    const script = `
      import assert from "node:assert/strict";
      const values = new Map([["german_calc_theme_mode", "dark"]]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/${app === "catalog" ? "" : `calculators/${app}/`}");
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
      assert.equal(setStorageMode("${app}", StorageMode.Persistent, true), true);
      const theme = await import("#store/themeStore");
      assert.equal(theme.activeThemeMode.value, "dark");
      theme.setThemeMode("light");
      assert.equal(values.get("rechner:${app}:v1:theme"), "light");
      assert.equal(values.get("german_calc_theme_mode"), "dark");
      assert.ok([...values.keys()].filter(key => key.startsWith("rechner:") && !key.startsWith("rechner:privacy:")).every(key => key.startsWith("rechner:${app}:")));
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
      stdio: "pipe" }));
  }
});
