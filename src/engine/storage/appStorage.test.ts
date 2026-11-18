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
  browserAppStorage,
  browserWebStorageForCurrentMode,
  clearAllData,
  clearSharedBrowserKey,
  exportAllData,
  importAllData,
  createAppStorage,
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
    assert.equal(getStorageMode(), StorageMode.Memory);
    assert.equal(storage.getItem("grossIncome"), null);
    assert.equal(storage.setItem("grossIncome", "50000"), true);
    assert.equal(storage.getItem("grossIncome"), "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), "older saved value");
    assert.equal(session.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);

    assert.equal(setStorageMode(StorageMode.Session), true);
    assert.equal(getStorageMode(), StorageMode.Session);
    assert.equal(JSON.parse(session.getItem(appStorageKey(AppId.NetPay, "grossIncome")) ?? "{}").value, "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);
    assert.equal(local.getItem("grossIncome"), null);
    assert.equal(setStorageMode(StorageMode.Persistent), false);
    assert.equal(setStorageMode(StorageMode.Persistent, true), true);
    assert.equal(getStorageMode(), StorageMode.Persistent);
    assert.equal(JSON.parse(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")) ?? "{}").value, "50000");

    local.setItem(appStorageKey(AppId.ParentalLeave, "state"), "other calculator data");
    assert.equal(setStorageMode(StorageMode.Memory), true);
    assert.equal(storage.getItem("grossIncome"), "50000");
    assert.equal(local.getItem(appStorageKey(AppId.NetPay, "grossIncome")), null);
    assert.equal(local.getItem("rechner:privacy:storage-mode:v1"), null);
    assert.equal(session.getItem("rechner:privacy:storage-mode:v1"), null);
    assert.equal(local.getItem(appStorageKey(AppId.ParentalLeave, "state")), null);
    assert.equal(browserAppStorage(AppId.ParentalLeave).getItem("state"), "other calculator data");
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

it("resolves and clears centralized shared Web Storage by active StorageMode", () => {
  const local = browserStorage(new Map<string, string>());
  const session = browserStorage(new Map<string, string>());
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")?.value;
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: local,
      sessionStorage: session,
    },
  });
  try {
    setStorageMode(StorageMode.Memory);
    assert.ok(browserWebStorageForCurrentMode());

    setStorageMode(StorageMode.Session);
    assert.equal(browserWebStorageForCurrentMode(), session);
    session.setItem("rechner:test:shared", "session-val");

    setStorageMode(StorageMode.Persistent, true);
    assert.equal(browserWebStorageForCurrentMode(), local);
    local.setItem("rechner:test:shared", "local-val");

    clearSharedBrowserKey("rechner:test:shared");
    assert.equal(local.getItem("rechner:test:shared"), null);
    assert.equal(session.getItem("rechner:test:shared"), null);
  }
  finally {
    if (previousWindow === undefined) {
      Reflect.deleteProperty(globalThis, "window");
    }
    else {
      Object.defineProperty(globalThis, "window", {
        configurable: true,
        value: previousWindow,
      });
    }
  }
});


it("preserves people across older backups and rejects unsupported records before replacing data", () => {
  const local = browserStorage(new Map<string, string>());
  const session = browserStorage(new Map<string, string>());
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")?.value;
  Object.defineProperty(globalThis, "window", { configurable: true,
    value: { localStorage: local,
      sessionStorage: session } });
  try {
    assert.equal(setStorageMode(StorageMode.Session), true);
    const key = "rechner:life-profile:people:v1";
    const people = JSON.stringify({ version: 1,
      people: [{ id: "one",
        name: "Alex" }] });
    session.setItem(key, people);
    const backup = exportAllData();
    const oldBackup = JSON.stringify({ format: "rechner-backup",
      version: 1,
      entries: {} });
    importAllData(oldBackup);
    assert.equal(session.getItem(key), people);
    const bad = JSON.parse(backup);
    bad.entries[key].value.version = 2;
    assert.throws(() => importAllData(JSON.stringify(bad)));
    assert.equal(session.getItem(key), people);
    session.setItem(key, '{"version":2,"people":[]}');
    assert.throws(() => importAllData(backup));
    assert.equal(session.getItem(key), '{"version":2,"people":[]}');
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

it("backs up and restores all active calculator data and rejects invalid backups", () => {
  const local = browserStorage(new Map<string, string>());
  const session = browserStorage(new Map<string, string>());
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")?.value;
  Object.defineProperty(globalThis, "window", { configurable: true,
    value: { localStorage: local,
      sessionStorage: session } });
  try {
    setStorageMode(StorageMode.Session);
    const netPay = browserAppStorage(AppId.NetPay);
    const giro = browserAppStorage(AppId.GiroCode);
    netPay.setItem("grossIncome", "42000");
    giro.setItem("draft", "example");
    session.setItem("rechner:shared:parameters:v1", "settings");
    const backup = exportAllData();
    netPay.setItem("grossIncome", "1");
    assert.throws(() => importAllData('{"format":"rechner-backup","version":1,"entries":{"other":"bad"}}'));
    assert.equal(netPay.getItem("grossIncome"), "1");
    importAllData(backup);
    assert.equal(netPay.getItem("grossIncome"), "42000");
    assert.equal(giro.getItem("draft"), "example");
    assert.equal(session.getItem("rechner:shared:parameters:v1"), "settings");
    clearAllData();
    assert.equal(netPay.getItem("grossIncome"), null);
    assert.equal(giro.getItem("draft"), null);
    assert.equal(session.getItem("rechner:shared:parameters:v1"), null);
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

it("exports readable values and imports both structured and original backups losslessly", () => {
  const local = browserStorage(new Map<string, string>());
  const session = browserStorage(new Map<string, string>());
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")?.value;
  Object.defineProperty(globalThis, "window", { configurable: true,
    value: { localStorage: local,
      sessionStorage: session } });
  try {
    assert.equal(setStorageMode(StorageMode.Session), true);
    const storage = browserAppStorage(AppId.NetPay);
    storage.setItem("grossIncome", "42000");
    storage.setItem("hasPartner", "true");
    storage.setItem("savedScenarios", JSON.stringify([{ name: "Family",
      values: [1, 2] }]));
    storage.setItem("theme", "light");
    storage.setItem("noncanonical", '{ "amount": 3 }');
    const sharedKey = "rechner:shared:parameters:v1";
    session.setItem(sharedKey, '{"year":2026,"overrides":{}}');
    const grossKey = appStorageKey(AppId.NetPay, "grossIncome");
    const scenarioKey = appStorageKey(AppId.NetPay, "savedScenarios");
    const themeKey = appStorageKey(AppId.NetPay, "theme");
    const originalGross = session.getItem(grossKey);
    const legacyBackup = JSON.stringify({ format: "rechner-backup",
      version: 1,
      entries: {
        [grossKey]: originalGross,
        [scenarioKey]: session.getItem(scenarioKey),
        [sharedKey]: session.getItem(sharedKey),
      } });
    const backup = exportAllData();
    const parsed = JSON.parse(backup);
    assert.equal(parsed.version, 2);
    assert.equal(parsed.entries[grossKey].value, 42000);
    assert.equal(parsed.entries[appStorageKey(AppId.NetPay, "hasPartner")].value, true);
    assert.deepEqual(parsed.entries[scenarioKey].value, [{ name: "Family",
      values: [1, 2] }]);
    assert.equal(parsed.entries[themeKey].value, "light");
    assert.equal(parsed.entries[themeKey].kind, "envelope");
    assert.deepEqual(parsed.entries[sharedKey].value, { year: 2026,
      overrides: {} });
    assert.equal(parsed.entries[appStorageKey(AppId.NetPay, "noncanonical")].value, '{ "amount": 3 }');
    assert.equal(parsed.entries[appStorageKey(AppId.NetPay, "noncanonical")].encoding, "text");

    parsed.entries[grossKey].value = 42001;
    assert.throws(() => importAllData(JSON.stringify(parsed)));
    assert.equal(storage.getItem("grossIncome"), "42000");
    importAllData(backup);
    assert.equal(storage.getItem("grossIncome"), "42000");
    assert.equal(storage.getItem("savedScenarios"), '[{"name":"Family","values":[1,2]}]');
    assert.equal(storage.getItem("noncanonical"), '{ "amount": 3 }');
    assert.equal(session.getItem(grossKey), originalGross);
    storage.setItem("grossIncome", "99");
    importAllData(legacyBackup);
    assert.equal(storage.getItem("grossIncome"), "42000");
    assert.equal(storage.getItem("savedScenarios"), '[{"name":"Family","values":[1,2]}]');
    assert.equal(session.getItem(sharedKey), '{"year":2026,"overrides":{}}');
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

it("rolls back structured imports if browser storage rejects a write", () => {
  const local = browserStorage(new Map<string, string>());
  const backing = browserStorage(new Map<string, string>());
  let failKey: string | null = null;
  const session = { ...backing,
    get length() {
      return backing.length; 
    },
    setItem(key: string, value: string) {
      if (key === failKey) {
        failKey = null;
        throw new Error("quota");
      }
      backing.setItem(key, value);
    } };
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")?.value;
  Object.defineProperty(globalThis, "window", { configurable: true,
    value: { localStorage: local,
      sessionStorage: session } });
  try {
    assert.equal(setStorageMode(StorageMode.Session), true);
    const storage = browserAppStorage(AppId.NetPay);
    storage.setItem("grossIncome", "12345");
    const backup = exportAllData();
    storage.setItem("grossIncome", "67890");
    failKey = appStorageKey(AppId.NetPay, "grossIncome");
    assert.throws(() => importAllData(backup));
    assert.equal(storage.getItem("grossIncome"), "67890");
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
