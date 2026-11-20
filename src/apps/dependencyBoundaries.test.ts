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
const KITA_STORE = resolve("src/apps/kita/kitaStore.ts");
const MINIJOB_MIDIJOB_STORE = resolve("src/apps/minijob-midijob/minijobMidijobStore.ts");
const COMMUTER_ALLOWANCE_STORE = resolve("src/apps/commuter-allowance/commuterAllowanceStore.ts");
const EXPENSE_PLANNER_STORE = resolve("src/apps/expense-planner/expensePlannerStore.ts");
const RESIGNATION_RUNWAY_STORE = resolve("src/apps/resignation-runway/resignationRunwayStore.ts");
const PERMANENT_RESIDENCY_STORE = resolve("src/apps/permanent-residency/permanentResidencyStore.ts");
const CITIZENSHIP_STORE = resolve("src/apps/citizenship/citizenshipStore.ts");
const FAMILY_MILESTONES_STORE = resolve("src/apps/family-milestones/familyMilestonesStore.ts");
const CHILDCARE_PLANNER_STORE = resolve("src/apps/childcare-planner/childcarePlannerStore.ts");
const TRAVEL_PLANNER_STORE = resolve("src/apps/travel-planner/travelPlannerStore.ts");
const TAX_CLASS_SWITCH_STORE = resolve("src/apps/tax-class-switch/taxClassSwitchStore.ts");
const ASSET_AFFORDABILITY_STORE = resolve("src/apps/asset-affordability/assetAffordabilityStore.ts");
const PLANNING_DASHBOARD_STORE = resolve("src/apps/planning-dashboard/planningDashboardStore.ts");
const MUTTERSCHUTZ_STORE = resolve("src/apps/mutterschutz/mutterschutzStore.ts");
const PROGRESSION_TAX_STORE = resolve("src/apps/progression-tax/progressionTaxStore.ts");
const KINDERGELD_COMPARISON_STORE = resolve("src/apps/kindergeld-comparison/kindergeldComparisonStore.ts");
const ELTERNGELD_QUICK_STORE = resolve("src/apps/elterngeld-quick/elterngeldQuickStore.ts");
const SALARY_RAISE_STORE = resolve("src/apps/salary-raise/salaryRaiseStore.ts");
const KALTE_PROGRESSION_STORE = resolve("src/apps/kalte-progression/kalteProgressionStore.ts");
const CASH_RECONCILIATION_STORE = resolve("src/apps/cash-reconciliation/cashReconciliationStore.ts");
const AGE_RELIEF_STORE = resolve("src/apps/age-relief/ageReliefStore.ts");

const ALL_CALCULATOR_STORES = [
  NET_PAY_STORE,
  TAX_STORE,
  PARENTAL_STORE,
  GIROCODE_STORE,
  VISA_STORE,
  COMPANY_CAR_STORE,
  SOLAR_ENERGY_STORE,
  HOUSING_STORE,
  KITA_STORE,
  MINIJOB_MIDIJOB_STORE,
  COMMUTER_ALLOWANCE_STORE,
  EXPENSE_PLANNER_STORE,
  RESIGNATION_RUNWAY_STORE,
  PERMANENT_RESIDENCY_STORE,
  CITIZENSHIP_STORE,
  FAMILY_MILESTONES_STORE,
  CHILDCARE_PLANNER_STORE,
  TRAVEL_PLANNER_STORE,
  TAX_CLASS_SWITCH_STORE,
  ASSET_AFFORDABILITY_STORE,
  PLANNING_DASHBOARD_STORE,
  MUTTERSCHUTZ_STORE,
  PROGRESSION_TAX_STORE,
  KINDERGELD_COMPARISON_STORE,
  ELTERNGELD_QUICK_STORE,
  SALARY_RAISE_STORE,
  KALTE_PROGRESSION_STORE,
  CASH_RECONCILIATION_STORE,
  AGE_RELIEF_STORE,
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
    ["src/apps/kita/App.tsx", [KITA_STORE]],
    ["src/apps/minijob-midijob/App.tsx", [MINIJOB_MIDIJOB_STORE]],
    ["src/apps/commuter-allowance/App.tsx", [COMMUTER_ALLOWANCE_STORE]],
    ["src/apps/expense-planner/App.tsx", [EXPENSE_PLANNER_STORE]],
    ["src/apps/resignation-runway/App.tsx", [RESIGNATION_RUNWAY_STORE]],
    ["src/apps/permanent-residency/App.tsx", [PERMANENT_RESIDENCY_STORE]],
    ["src/apps/citizenship/App.tsx", [CITIZENSHIP_STORE]],
    ["src/apps/family-milestones/App.tsx", [FAMILY_MILESTONES_STORE]],
    ["src/apps/childcare-planner/App.tsx", [CHILDCARE_PLANNER_STORE]],
    ["src/apps/travel-planner/App.tsx", [TRAVEL_PLANNER_STORE]],
    ["src/apps/tax-class-switch/App.tsx", [TAX_CLASS_SWITCH_STORE]],
    ["src/apps/asset-affordability/App.tsx", [ASSET_AFFORDABILITY_STORE]],
    ["src/apps/planning-dashboard/App.tsx", [PLANNING_DASHBOARD_STORE]],
    ["src/apps/mutterschutz/App.tsx", [MUTTERSCHUTZ_STORE]],
    ["src/apps/progression-tax/App.tsx", [PROGRESSION_TAX_STORE]],
    ["src/apps/kindergeld-comparison/App.tsx", [KINDERGELD_COMPARISON_STORE]],
    ["src/apps/elterngeld-quick/App.tsx", [ELTERNGELD_QUICK_STORE]],
    ["src/apps/salary-raise/App.tsx", [SALARY_RAISE_STORE]],
    ["src/apps/kalte-progression/App.tsx", [KALTE_PROGRESSION_STORE]],
    ["src/apps/cash-reconciliation/App.tsx", [CASH_RECONCILIATION_STORE]],
    ["src/apps/age-relief/App.tsx", [AGE_RELIEF_STORE]],
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
