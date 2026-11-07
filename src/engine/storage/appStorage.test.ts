import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  appStorageKey,
  APPLICATION_VERSION,
  APPLICATION_RELEASE_HASH,
  createAppStorage,
  browserAppStorage,
  getStorageMode,
  setStorageMode,
  StorageMode,
  STORAGE_VALUE_VERSION,
  toStorageMode,
} from "#engine/storage/appStorage";

const memoryStorage = (values: Map<string, string>) => ({ getItem: (key: string) => values.get(key) ?? null,
  setItem: (key: string, value: string) => {
    values.set(key, value); 
  },
  removeItem: (key: string) => {
    values.delete(key); 
  } });

function browserStorage(values: Map<string, string>) {
  return {
    get length(): number {
      return values.size;
    },
    key(index: number): string | null {
      return [...values.keys()][index] ?? null;
    },
    getItem(key: string): string | null {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string): void {
      values.set(key, value);
    },
    removeItem(key: string): void {
      values.delete(key);
    },
  };
}

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

it("wraps values in timestamped, versioned SHA-256 envelopes and rejects changed contents", () => {
  const values = new Map<string, string>();
  const storage = createAppStorage(AppId.NetPay, memoryStorage(values));
  assert.equal(storage.setItem("grossIncome", "50000"), true);
  const key = appStorageKey(AppId.NetPay, "grossIncome");
  const envelope = JSON.parse(values.get(key) ?? "{}") as Record<string, unknown>;
  assert.equal(envelope.format, "rechner-storage-value");
  assert.equal(envelope.version, STORAGE_VALUE_VERSION);
  assert.equal(envelope.applicationVersion, APPLICATION_VERSION);
  assert.equal(envelope.applicationReleaseHash, APPLICATION_RELEASE_HASH);
  assert.equal(envelope.value, "50000");
  assert.equal(typeof envelope.timestamp, "string");
  assert.equal(Number.isNaN(Date.parse(envelope.timestamp as string)), false);
  assert.match(envelope.hash as string, /^sha256:[a-f0-9]{64}$/);
  assert.equal(storage.getItem("grossIncome"), "50000");

  values.set(key, JSON.stringify({ ...envelope,
    value: "edited" }));
  assert.equal(storage.getItem("grossIncome"), null);
  values.set(key, JSON.stringify({ ...envelope,
    applicationReleaseHash: `${APPLICATION_RELEASE_HASH}-changed` }));
  assert.equal(storage.getItem("grossIncome"), null);
});

it("upgrades previously stored raw values when they are read", () => {
  const key = appStorageKey(AppId.NetPay, "grossIncome");
  const values = new Map([[key, "50000"]]);
  const storage = createAppStorage(AppId.NetPay, memoryStorage(values));
  assert.equal(storage.getItem("grossIncome"), "50000");
  const upgraded = JSON.parse(values.get(key) ?? "{}") as Record<string, unknown>;
  assert.equal(upgraded.value, "50000");
  assert.equal(upgraded.applicationVersion, APPLICATION_VERSION);
  assert.equal(upgraded.applicationReleaseHash, APPLICATION_RELEASE_HASH);
  assert.equal(typeof upgraded.timestamp, "string");
  assert.match(upgraded.hash as string, /^sha256:[a-f0-9]{64}$/);
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

it("keeps new calculator data in memory until the user selects a storage mode", () => {
  const previousWindow = Reflect.get(globalThis, "window");
  const local = browserStorage(new Map([[appStorageKey(AppId.NetPay, "grossIncome"), "older saved value"], ["grossIncome", "legacy value"]]));
  const session = browserStorage(new Map());
  Object.defineProperty(globalThis, "window", { configurable: true,
    value: { localStorage: local,
      sessionStorage: session } });
  try {
    const storage = browserAppStorage(AppId.NetPay);
    assert.equal(getStorageMode(AppId.NetPay), StorageMode.Memory);
    assert.equal(storage.getItem("grossIncome"), null);
    assert.equal(storage.setItem("grossIncome", "50000"), true);
    assert.equal(storage.getItem("grossIncome"), "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), "older saved value");
    assert.equal(session.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);

    assert.equal(setStorageMode(AppId.NetPay, StorageMode.Session), true);
    assert.equal(getStorageMode(AppId.NetPay), StorageMode.Session);
    assert.equal(JSON.parse(session.getItem(appStorageKey(AppId.NetPay, "grossIncome")) ?? "{}").value, "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);
    assert.equal(local.getItem("grossIncome"), null);
    assert.equal(setStorageMode(AppId.NetPay, StorageMode.Persistent), false);
    assert.equal(setStorageMode(AppId.NetPay, StorageMode.Persistent, true), true);
    assert.equal(getStorageMode(AppId.NetPay), StorageMode.Persistent);
    assert.equal(JSON.parse(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")) ?? "{}").value, "50000");

    local.setItem(appStorageKey(AppId.ParentalLeave, "state"), "other calculator data");
    assert.equal(setStorageMode(AppId.NetPay, StorageMode.Memory), true);
    assert.equal(storage.getItem("grossIncome"), "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);
    assert.equal(local.getItem("rechner:privacy:net-pay:storage-mode:v1"), null);
    assert.equal(session.getItem("rechner:privacy:net-pay:storage-mode:v1"), null);
    assert.equal(local.getItem(appStorageKey(AppId.ParentalLeave, "state")), "other calculator data");
  }
  finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    }
    else {
      Object.defineProperty(globalThis, "window", { configurable: true,
        value: previousWindow });
    }
  }
});

it("validates storage mode values", () => {
  assert.equal(toStorageMode("session"), StorageMode.Session);
  assert.throws(() => toStorageMode("cookie"), TypeError);
});
