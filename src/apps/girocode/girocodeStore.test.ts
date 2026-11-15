import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  EMPTY_GIROCODE_DRAFT,
  SAMPLE_GIROCODE_DRAFT,
  clearGiroCodeDraft,
  giroCodeBuild,
  giroCodeDraft,
  loadSampleGiroCodeDraft,
  updateGiroCodeField,
} from "#/apps/girocode/girocodeStore.ts";
import {
  GiroCodeCharsetMode,
  RemittanceKind,
} from "#engine/payments/girocode";

describe("girocodeStore", () => {
  beforeEach(() => {
    clearGiroCodeDraft();
  });

  afterEach(() => {
    clearGiroCodeDraft();
  });

  it("initializes empty draft, updates fields reactively, and builds valid EPC QR payloads", () => {
    assert.deepEqual(giroCodeDraft.value, EMPTY_GIROCODE_DRAFT);
    assert.equal(giroCodeBuild.value.isReady, false);

    updateGiroCodeField("beneficiaryName", "Musterfirma GmbH");
    updateGiroCodeField("iban", "DE89 3704 0044 0532 0130 00");
    updateGiroCodeField("amount", "125.00");
    updateGiroCodeField("unstructuredReference", "Invoice 2026-01");

    assert.equal(giroCodeDraft.value.beneficiaryName, "Musterfirma GmbH");
    assert.equal(giroCodeBuild.value.isReady, true);
    assert.ok(giroCodeBuild.value.payload);

    loadSampleGiroCodeDraft();
    assert.deepEqual(giroCodeDraft.value, SAMPLE_GIROCODE_DRAFT);
    assert.equal(giroCodeBuild.value.isReady, true);

    clearGiroCodeDraft();
    assert.deepEqual(giroCodeDraft.value, EMPTY_GIROCODE_DRAFT);
    assert.equal(giroCodeBuild.value.isReady, false);
  });

  it("defensively sanitizes corrupted or oversized persisted drafts at boot", () => {
    const oversizedName = "A".repeat(200);
    const corruptedScript = `
      import assert from "node:assert/strict";
      const values = new Map([
        ["rechner:privacy:storage-mode:v1", "persistent"],
      ]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/calculators/girocode/");
      globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { AppId } = await import("#/apps/appDefinition.ts");
      const { browserAppStorage } = await import("#engine/storage/appStorage");
      browserAppStorage(AppId.GiroCode).setItem("draft", JSON.stringify({
        beneficiaryName: ${JSON.stringify(oversizedName)},
        iban: 12345,
        remittanceKind: "INVALID_KIND",
        charsetMode: "INVALID_CHARSET",
      }));
      const store = await import("./src/apps/girocode/girocodeStore.ts");
      assert.equal(store.giroCodeDraft.value.beneficiaryName.length, 140);
      assert.equal(store.giroCodeDraft.value.iban, "");
      assert.equal(store.giroCodeDraft.value.remittanceKind, ${JSON.stringify(RemittanceKind.Unstructured)});
      assert.equal(store.giroCodeDraft.value.charsetMode, ${JSON.stringify(GiroCodeCharsetMode.Utf8)});
    `;
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", corruptedScript], {
        cwd: process.cwd(),
        stdio: "pipe",
      }));

    const invalidJsonScript = `
      import assert from "node:assert/strict";
      const values = new Map([
        ["rechner:privacy:storage-mode:v1", "persistent"],
      ]);
      globalThis.window = globalThis;
      globalThis.location = new URL("http://example.test/calculators/girocode/");
      globalThis.localStorage = { getItem: (k) => values.get(k) ?? null, setItem: (k, v) => values.set(k, v), removeItem: (k) => values.delete(k) };
      globalThis.sessionStorage = { getItem: () => null, setItem: () => {}, removeItem: () => {} };
      const { AppId } = await import("#/apps/appDefinition.ts");
      const { browserAppStorage } = await import("#engine/storage/appStorage");
      browserAppStorage(AppId.GiroCode).setItem("draft", "{not-json");
      const store = await import("./src/apps/girocode/girocodeStore.ts");
      assert.equal(store.giroCodeDraft.value.beneficiaryName, "");
    `;
    assert.doesNotThrow(() =>
      execFileSync(process.execPath, ["--input-type=module", "-e", invalidJsonScript], {
        cwd: process.cwd(),
        stdio: "pipe",
      }));
  });
});
