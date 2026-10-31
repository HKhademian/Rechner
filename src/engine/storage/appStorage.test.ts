import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  appStorageKey,
  createAppStorage,
} from "#engine/storage/appStorage";

const memoryStorage = (values: Map<string, string>) => ({ getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value); 
  },
  removeItem: (key: string) => {
    values.delete(key); 
  } });

it("copies owned legacy data once without overwriting destinations or crossing app boundaries", () => {
  const values = new Map([
    ["grossIncome", "50000"], ["savedScenarios", "[1]"], ["payroll_taxYear", "2025"],
    ["elterngeld_simulator_state_v1", "{\"husbandGross\":4000}"], ["german_calc_theme_mode", "dark"],
    [appStorageKey(AppId.NetPay, "savedScenarios"), "[]"],
  ]);
  const before = new Map(values);
  const raw = memoryStorage(values);
  const net = createAppStorage(AppId.NetPay, raw);
  const parental = createAppStorage(AppId.ParentalLeave, raw);
  assert.equal(net.getItem("grossIncome"), "50000");
  assert.equal(net.getItem("savedScenarios"), "[]");
  assert.equal(net.getItem("payroll_taxYear"), "2025");
  assert.equal(parental.getItem("state"), "{\"husbandGross\":4000}");
  net.setItem("state", "Berlin");
  assert.equal(parental.getItem("state"), "{\"husbandGross\":4000}");
  net.setItem("theme", "light");
  assert.equal(parental.getItem("theme"), "dark");
  parental.removeItem("state");
  assert.equal(createAppStorage(AppId.ParentalLeave, raw).getItem("state"), null);
  net.removeItem("grossIncome");
  assert.equal(createAppStorage(AppId.NetPay, raw).getItem("grossIncome"), null);
  for (const [key, value] of before) {
    if (!key.startsWith("rechner:")) {
      assert.equal(values.get(key), value);
    }
  }
  const catalog = createAppStorage(AppId.Catalog, raw);
  assert.equal(catalog.getItem("savedScenarios"), null);
  assert.equal(catalog.getItem("grossIncome"), null);
});

it("retries incomplete migration and remains usable when browser storage is blocked or full", () => {
  const values = new Map([["grossIncome", "50000"]]);
  let blocked = true;
  const raw = memoryStorage(values);
  const storage = createAppStorage(AppId.NetPay, { ...raw,
    setItem(key, value) {
      if (blocked) {
        throw new Error("quota");
      }
      raw.setItem(key, value);
    } });
  assert.equal(storage.getItem("grossIncome"), "50000");
  assert.equal(storage.setItem("grossIncome", "60000"), false);
  assert.equal(values.has(appStorageKey(AppId.NetPay, "legacy-migrated")), false);
  blocked = false;
  assert.equal(storage.setItem("grossIncome", "60000"), true);
  assert.equal(storage.getItem("grossIncome"), "60000");
  const denied = createAppStorage(AppId.Catalog, { getItem() {
    throw new Error("denied"); 
  },
  setItem() {
    throw new Error("denied"); 
  },
  removeItem() {
    throw new Error("denied"); 
  } });
  assert.equal(denied.getItem("theme"), null);
  assert.equal(denied.setItem("theme", "dark"), false);
  assert.equal(denied.removeItem("theme"), false);
});
