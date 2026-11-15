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
    const values = new Map([
      ["rechner:privacy:storage-mode:v1", "persistent"],
      ["grossIncome", "12345"],
      ["payroll_taxYear", "2025"],
      ["savedScenarios", "[]"],
      ["elterngeld_simulator_state_v1", "{}"],
    ]);
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { getStorageMode, StorageMode } = await import("#engine/storage/appStorage");
    assert.equal(getStorageMode(), StorageMode.Persistent);
    const store = await import("#store/calculatorStore");
    assert.equal(store.grossIncome.value, 12345);
    assert.equal(store.getCurrentInputs().taxYear, 2025);
    store.grossIncome.value = 0;
    assert.equal(JSON.parse(values.get("rechner:net-pay:v1:grossIncome")).value, "0");
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
    const values = new Map([
      ["rechner:privacy:storage-mode:v1", "persistent"],
      ["grossIncome", "12345"],
      ["elterngeld_simulator_state_v1", plan],
    ]);
    globalThis.window = globalThis;
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { getStorageMode, StorageMode } = await import("#engine/storage/appStorage");
    assert.equal(getStorageMode(), StorageMode.Persistent);
    const store = await import("#store/elterngeldStore");
    assert.equal(store.husbandGross.value, 4321);
    store.husbandGross.value = 5000;
    assert.equal(JSON.parse(JSON.parse(values.get("rechner:parental-leave:v1:state")).value).husbandGross, 5000);
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
      const values = new Map([
        ["rechner:privacy:storage-mode:v1", "persistent"],
        ["german_calc_theme_mode", "dark"],
      ]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/${app === "catalog" ? "" : `calculators/${app}/`}");
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { getStorageMode, StorageMode } = await import("#engine/storage/appStorage");
      assert.equal(getStorageMode(), StorageMode.Persistent);
      const theme = await import("#store/themeStore");
      assert.equal(theme.activeThemeMode.value, "dark");
      theme.setThemeMode("light");
      assert.equal(JSON.parse(values.get("rechner:${app}:v1:theme")).value, "light");
      assert.equal(values.get("german_calc_theme_mode"), "dark");
      assert.ok([...values.keys()].filter(key => key.startsWith("rechner:") && !key.startsWith("rechner:privacy:")).every(key => key.startsWith("rechner:${app}:")));
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
      stdio: "pipe" }));
  }
});

it("girocode boot stores drafts only under its own namespace without initializing other calculators", () => {
  const script = `
    import assert from "node:assert/strict";
    const values = new Map([["grossIncome", "12345"], ["elterngeld_simulator_state_v1", "{}"]]);
    globalThis.window = globalThis;
    globalThis.location = new URL("http://example.test/calculators/girocode/");
    globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
    globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
    const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
    assert.equal(setStorageMode(StorageMode.Persistent, true), true);
    const keysBeforeBoot = new Set(values.keys());
    const store = await import("./src/apps/girocode/girocodeStore.ts");
    assert.equal(store.giroCodeDraft.value.iban, "");
    store.updateGiroCodeField("iban", "DE89 3704 0044 0532 0130 00");
    assert.equal(JSON.parse(JSON.parse(values.get("rechner:girocode:v1:draft")).value).iban, "DE89 3704 0044 0532 0130 00");
    const theme = await import("#store/themeStore");
    assert.equal(theme.activeThemeMode.value, "light");
    theme.setThemeMode("dark");
    assert.equal(JSON.parse(values.get("rechner:girocode:v1:theme")).value, "dark");
    const keysAddedByGiroCode = [...values.keys()].filter(key => !keysBeforeBoot.has(key));
    assert.ok(keysAddedByGiroCode.length >= 2);
    assert.ok(keysAddedByGiroCode.every(key => key.startsWith("rechner:girocode:")));
  `;
  assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
    stdio: "pipe" }));
});

it("track 3 domain calculators isolate persisted state exclusively under their own namespaces", () => {
  const cases: readonly { app: string;
    storeFile: string;
    updateExpr: string }[] = [
    { app: "visa",
      storeFile: "./src/apps/visa/visaStore.ts",
      updateExpr: `store.updateVisaField("applicantAgeYears", 37)` },
    { app: "company-car",
      storeFile: "./src/apps/company-car/companyCarStore.ts",
      updateExpr: `store.updateCompanyCarField("commuteOneWayKm", 25)` },
    { app: "solar-energy",
      storeFile: "./src/apps/solar-energy/solarEnergyStore.ts",
      updateExpr: `store.updateSolarEnergyField("capacityKwp", 14)` },
    { app: "housing",
      storeFile: "./src/apps/housing/housingStore.ts",
      updateExpr: `store.updateHousingField("dependentChildrenCount", 2)` },
  ];
  for (const item of cases) {
    const script = `
      import assert from "node:assert/strict";
      const values = new Map([["grossIncome", "12345"], ["elterngeld_simulator_state_v1", "{}"]]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/calculators/${item.app}/");
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
      assert.equal(setStorageMode(StorageMode.Persistent, true), true);
      const keysBeforeBoot = new Set(values.keys());
      const store = await import("${item.storeFile}");
      ${item.updateExpr};
      const added = [...values.keys()].filter(key => !keysBeforeBoot.has(key));
      assert.equal(added.length, 1);
      assert.ok(added[0].startsWith("rechner:${item.app}:v1:"));
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
      stdio: "pipe" }));
  }
});

it("track 3 Sync Life Profile only persists under the target app and shared parameter namespaces", () => {
  const cases: readonly { app: string;
    storeFile: string;
    syncCall: string }[] = [
    { app: "visa",
      storeFile: "./src/apps/visa/visaStore.ts",
      syncCall: "store.syncVisaFromLifeProfile()" },
    { app: "company-car",
      storeFile: "./src/apps/company-car/companyCarStore.ts",
      syncCall: "store.syncCompanyCarFromLifeProfile()" },
    { app: "solar-energy",
      storeFile: "./src/apps/solar-energy/solarEnergyStore.ts",
      syncCall: "store.syncSolarEnergyFromLifeProfile()" },
    { app: "housing",
      storeFile: "./src/apps/housing/housingStore.ts",
      syncCall: "store.syncHousingFromLifeProfile()" },
  ];
  for (const item of cases) {
    const script = `
      import assert from "node:assert/strict";
      const values = new Map([["grossIncome", "12345"], ["elterngeld_simulator_state_v1", "{}"]]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/calculators/${item.app}/");
      globalThis.localStorage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { setStorageMode, StorageMode } = await import("#engine/storage/appStorage");
      assert.equal(setStorageMode(StorageMode.Persistent, true), true);
      const keysBeforeBoot = new Set(values.keys());
      const store = await import("${item.storeFile}");
      ${item.syncCall};
      const added = [...values.keys()].filter(key => !keysBeforeBoot.has(key));
      assert.ok(added.some(key => key.startsWith("rechner:${item.app}:v1:")));
      assert.ok(added.every(key => key.startsWith("rechner:${item.app}:v1:") || key === "rechner:shared:parameters:v1"));
    `;
    assert.doesNotThrow(() => execFileSync(process.execPath, ["--input-type=module", "-e", script], { cwd: process.cwd(),
      stdio: "pipe" }));
  }
});

