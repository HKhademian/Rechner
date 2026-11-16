import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  readFileSync,
} from "node:fs";
import {
  afterEach,
  beforeEach,
  describe,
  it,
} from "node:test";
import ts from "typescript";
import {
  EMPTY_GIROCODE_BUILD,
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
    assert.equal(EMPTY_GIROCODE_BUILD.isReady, false);
    assert.equal(EMPTY_GIROCODE_BUILD.payload, null);
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

  it("gates persisted draft hydration with useHydrated and isolates QR stage from frame footer", () => {
    const filePath = "src/apps/girocode/GiroCodeGenerator.tsx";
    const sourceText = readFileSync(filePath, "utf8");
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    let importsUseHydrated = false;
    let callsUseHydrated = false;
    let gatesDraftWithHydrated = false;
    let gatesBuildWithHydrated = false;
    let hasCanvasEffectWithHydratedDep = false;
    let frameElement: ts.JsxElement | undefined;

    const getClassName = (attrs: ts.JsxAttributes): string | undefined => {
      for (const prop of attrs.properties) {
        if (
          ts.isJsxAttribute(prop) &&
          ts.isIdentifier(prop.name) &&
          prop.name.text === "className" &&
          prop.initializer &&
          ts.isStringLiteral(prop.initializer)
        ) {
          return prop.initializer.text;
        }
      }
      return undefined;
    };

    const visit = (node: ts.Node): void => {
      if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
        if (node.moduleSpecifier.text === "#/components/ui/useHydrated.ts") {
          const named = node.importClause?.namedBindings;
          if (named && ts.isNamedImports(named)) {
            importsUseHydrated = named.elements.some((el) => el.name.text === "useHydrated");
          }
        }
      }

      if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
        if (node.expression.text === "useHydrated") {
          callsUseHydrated = true;
        }
        if (node.expression.text === "useEffect" && node.arguments.length === 2) {
          const callbackText = node.arguments[0].getText(sourceFile);
          const depsArg = node.arguments[1];
          if (
            callbackText.includes("paintQrSymbolToCanvas(canvas") &&
            ts.isArrayLiteralExpression(depsArg) &&
            depsArg.elements.some((el) => ts.isIdentifier(el) && el.text === "hydrated")
          ) {
            hasCanvasEffectWithHydratedDep = true;
          }
        }
      }

      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer) {
        if (
          node.name.text === "draft" &&
          ts.isConditionalExpression(node.initializer) &&
          node.initializer.condition.getText(sourceFile) === "hydrated" &&
          node.initializer.whenTrue.getText(sourceFile) === "giroCodeDraft.value" &&
          node.initializer.whenFalse.getText(sourceFile) === "EMPTY_GIROCODE_DRAFT"
        ) {
          gatesDraftWithHydrated = true;
        }
        if (
          node.name.text === "build" &&
          ts.isConditionalExpression(node.initializer) &&
          node.initializer.condition.getText(sourceFile) === "hydrated" &&
          node.initializer.whenTrue.getText(sourceFile) === "giroCodeBuild.value" &&
          node.initializer.whenFalse.getText(sourceFile) === "EMPTY_GIROCODE_BUILD"
        ) {
          gatesBuildWithHydrated = true;
        }
      }

      if (ts.isJsxElement(node) && getClassName(node.openingElement.attributes) === "girocode-qr-frame") {
        frameElement = node;
      }

      ts.forEachChild(node, visit);
    };

    visit(sourceFile);

    assert.equal(importsUseHydrated, true, "GiroCodeGenerator.tsx must import useHydrated");
    assert.equal(callsUseHydrated, true, "GiroCodeGenerator.tsx must call useHydrated()");
    assert.equal(gatesDraftWithHydrated, true, "draft must gate giroCodeDraft.value with hydrated ? ... : EMPTY_GIROCODE_DRAFT");
    assert.equal(gatesBuildWithHydrated, true, "build must gate giroCodeBuild.value with hydrated ? ... : EMPTY_GIROCODE_BUILD");
    assert.equal(hasCanvasEffectWithHydratedDep, true, "QR canvas useEffect must include hydrated dependency");

    assert.ok(frameElement, "GiroCodeGenerator.tsx must render .girocode-qr-frame");
    const frameChildren = frameElement.children
      .filter((child): child is ts.JsxElement => ts.isJsxElement(child))
      .map((child) => getClassName(child.openingElement.attributes));
    assert.deepEqual(frameChildren, [
      "girocode-qr-frame__stage",
      "girocode-qr-frame__footer",
    ]);
  });

  it("uses general GiroCode wording in UI and manifest with zero QR Code trademark strings", () => {
    const forbiddenPattern = /qr[\s-]*code|denso\s+wave/i;
    const filesToCheck: readonly { readonly path: string;
      readonly kind: ts.ScriptKind }[] = [
      { path: "src/apps/girocode/GiroCodeGenerator.tsx",
        kind: ts.ScriptKind.TSX },
      { path: "src/apps/girocode/manifest.ts",
        kind: ts.ScriptKind.TS },
    ];

    const violations: string[] = [];
    for (const item of filesToCheck) {
      const sourceText = readFileSync(item.path, "utf8");
      const sourceFile = ts.createSourceFile(
        item.path,
        sourceText,
        ts.ScriptTarget.Latest,
        true,
        item.kind,
      );
      const visit = (node: ts.Node): void => {
        if (ts.isImportDeclaration(node)) {
          return;
        }
        if (
          ts.isStringLiteral(node) ||
          ts.isNoSubstitutionTemplateLiteral(node) ||
          ts.isJsxText(node)
        ) {
          const text = node.text.trim();
          if (text && forbiddenPattern.test(text)) {
            violations.push(`${item.path}: ${text}`);
          }
        }
        ts.forEachChild(node, visit);
      };
      visit(sourceFile);
    }

    assert.deepEqual(violations, []);
    const generatorText = readFileSync("src/apps/girocode/GiroCodeGenerator.tsx", "utf8");
    assert.equal(generatorText.includes("Scan GiroCode"), true);
  });
});
