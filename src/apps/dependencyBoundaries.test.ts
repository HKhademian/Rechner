import assert from "node:assert/strict";
import {
  existsSync,
  readFileSync,
  readdirSync,
} from "node:fs";
import {
  createRequire,
} from "node:module";
import {
  dirname,
  resolve,
} from "node:path";
import {
  it,
} from "node:test";
import ts from "typescript";

/** Follow runtime source imports only; shared interfaces do not initialize another app. */
function runtimeDependencies(entry: string): Set<string> {
  const visited = new Set<string>();
  const visit = (file: string): void => {
    if (visited.has(file) || !/\.tsx?$/.test(file)) {
      return;
    }
    visited.add(file);
    const source = ts.createSourceFile(file, readFileSync(file, "utf8"), ts.ScriptTarget.Latest, true, file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
    const follow = (specifier: string): void => {
      let target: string | undefined;
      if (specifier.startsWith("#")) {
        target = createRequire(file).resolve(specifier);
      }
      else if (specifier.startsWith(".")) {
        const base = resolve(dirname(file), specifier);
        target = [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find(existsSync);
      }
      if (target) {
        visit(target);
      }
    };
    for (const statement of source.statements) {
      if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
        const clause = statement.importClause;
        const names = clause?.namedBindings;
        const typesOnly = clause?.isTypeOnly || (!clause?.name && names && ts.isNamedImports(names) && names.elements.every((item) => item.isTypeOnly));
        if (!typesOnly) {
          follow(statement.moduleSpecifier.text);
        }
      }
      if (ts.isExportDeclaration(statement) && !statement.isTypeOnly && statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
        const names = statement.exportClause;
        if (!names || !ts.isNamedExports(names) || names.elements.some((item) => !item.isTypeOnly)) {
          follow(statement.moduleSpecifier.text);
        }
      }
    }
  };
  visit(resolve(entry));
  return visited;
}

const NET_PAY_STORE = resolve("src/store/calculatorStore.ts");
const TAX_STORE = resolve("src/store/taxConfigStore.ts");
const PARENTAL_STORE = resolve("src/store/elterngeldStore.ts");
const GIROCODE_STORE = resolve("src/apps/girocode/girocodeStore.ts");
const VISA_STORE = resolve("src/apps/visa/visaStore.ts");
const COMPANY_CAR_STORE = resolve("src/apps/company-car/companyCarStore.ts");
const SOLAR_ENERGY_STORE = resolve("src/apps/solar-energy/solarEnergyStore.ts");
const HOUSING_STORE = resolve("src/apps/housing/housingStore.ts");

const ALL_CALCULATOR_STORES = [
  NET_PAY_STORE,
  TAX_STORE,
  PARENTAL_STORE,
  GIROCODE_STORE,
  VISA_STORE,
  COMPANY_CAR_STORE,
  SOLAR_ENERGY_STORE,
  HOUSING_STORE,
] as const;

it("catalog and app entries cannot initialize another calculator's financial stores", () => {
  const catalog = runtimeDependencies("src/components/CalculatorCatalog.tsx");
  const profileSummary = runtimeDependencies("src/components/LifeProfileSummaryPage.tsx");
  for (const store of ALL_CALCULATOR_STORES) {
    assert.equal(catalog.has(store), false, `Catalog imports ${store}`);
    assert.equal(profileSummary.has(store), false, `LifeProfileSummaryPage imports ${store}`);
  }

  const entryOwnStores: readonly [string, readonly string[]][] = [
    ["src/apps/net-pay/App.tsx", [NET_PAY_STORE, TAX_STORE]],
    ["src/apps/parental-leave/App.tsx", [PARENTAL_STORE]],
    ["src/apps/girocode/App.tsx", [GIROCODE_STORE]],
    ["src/apps/visa/App.tsx", [VISA_STORE]],
    ["src/apps/company-car/App.tsx", [COMPANY_CAR_STORE]],
    ["src/apps/solar-energy/App.tsx", [SOLAR_ENERGY_STORE]],
    ["src/apps/housing/App.tsx", [HOUSING_STORE]],
  ];

  for (const [entryPath, owned] of entryOwnStores) {
    const deps = runtimeDependencies(entryPath);
    for (const store of owned) {
      assert.equal(deps.has(store), true, `${entryPath} must import ${store}`);
    }
    for (const other of ALL_CALCULATOR_STORES) {
      if (!owned.includes(other)) {
        assert.equal(deps.has(other), false, `${entryPath} leaks foreign store ${other}`);
      }
    }
  }
});

it("shared UI primitives and LawReferencePage never import calculator-specific financial stores", () => {
  const uiEntries = readdirSync("src/components/ui")
    .filter((name) => /\.tsx?$/.test(name) && !name.endsWith(".test.ts"))
    .map((name) => `src/components/ui/${name}`);

  for (const sharedFile of [...uiEntries, "src/components/laws/LawReferencePage.tsx"]) {
    const deps = runtimeDependencies(sharedFile);
    for (const store of ALL_CALCULATOR_STORES) {
      assert.equal(deps.has(store), false, `${sharedFile} must not import ${store}`);
    }
  }
});
