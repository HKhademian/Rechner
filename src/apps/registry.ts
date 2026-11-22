import {
  type CalculatorAppDefinition,
  type CalculatorCategory,
  CalculatorReleaseStatus,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  ageReliefApp,
} from "#/apps/age-relief/manifest.ts";
import {
  assetAffordabilityApp,
} from "#/apps/asset-affordability/manifest.ts";
import {
  cashReconciliationApp,
} from "#/apps/cash-reconciliation/manifest.ts";
import {
  childcarePlannerApp,
} from "#/apps/childcare-planner/manifest.ts";
import {
  citizenshipApp,
} from "#/apps/citizenship/manifest.ts";
import {
  companyCarApp,
} from "#/apps/company-car/manifest.ts";
import {
  commuterAllowanceApp,
} from "#/apps/commuter-allowance/manifest.ts";
import {
  elterngeldQuickApp,
} from "#/apps/elterngeld-quick/manifest.ts";
import {
  expensePlannerApp,
} from "#/apps/expense-planner/manifest.ts";
import {
  familyMilestonesApp,
} from "#/apps/family-milestones/manifest.ts";
import {
  giroCodeApp,
} from "#/apps/girocode/manifest.ts";
import {
  housingApp,
} from "#/apps/housing/manifest.ts";
import {
  kalteProgressionApp,
} from "#/apps/kalte-progression/manifest.ts";
import {
  kindergeldComparisonApp,
} from "#/apps/kindergeld-comparison/manifest.ts";
import {
  kitaApp,
} from "#/apps/kita/manifest.ts";
import {
  minijobMidijobApp,
} from "#/apps/minijob-midijob/manifest.ts";
import {
  mortgageApp,
} from "#/apps/mortgage/manifest.ts";
import {
  munichMapApp,
} from "#/apps/munich-map/manifest.ts";
import {
  mutterschutzApp,
} from "#/apps/mutterschutz/manifest.ts";
import {
  netPayApp,
} from "#/apps/net-pay/manifest.ts";
import {
  parentalLeaveApp,
} from "#/apps/parental-leave/manifest.ts";
import {
  parentalPlannerApp,
} from "#/apps/parental-planner/manifest.ts";
import {
  permanentResidencyApp,
} from "#/apps/permanent-residency/manifest.ts";
import {
  planningDashboardApp,
} from "#/apps/planning-dashboard/manifest.ts";
import {
  progressionTaxApp,
} from "#/apps/progression-tax/manifest.ts";
import {
  resignationRunwayApp,
} from "#/apps/resignation-runway/manifest.ts";
import {
  salaryRaiseApp,
} from "#/apps/salary-raise/manifest.ts";
import {
  solarEnergyApp,
} from "#/apps/solar-energy/manifest.ts";
import {
  taxClassSwitchApp,
} from "#/apps/tax-class-switch/manifest.ts";
import {
  travelPlannerApp,
} from "#/apps/travel-planner/manifest.ts";
import {
  visaApp,
} from "#/apps/visa/manifest.ts";

/** Metadata only: the catalog must never initialize a calculator's financial store. */
export const allCalculatorApps: readonly CalculatorAppDefinition[] = Object.freeze([
  netPayApp,
  parentalPlannerApp,
  parentalLeaveApp,
  giroCodeApp,
  munichMapApp,
  visaApp,
  companyCarApp,
  solarEnergyApp,
  housingApp,
  mortgageApp,
  kitaApp,
  minijobMidijobApp,
  commuterAllowanceApp,
  expensePlannerApp,
  resignationRunwayApp,
  permanentResidencyApp,
  citizenshipApp,
  familyMilestonesApp,
  childcarePlannerApp,
  travelPlannerApp,
  taxClassSwitchApp,
  assetAffordabilityApp,
  planningDashboardApp,
  mutterschutzApp,
  progressionTaxApp,
  kindergeldComparisonApp,
  elterngeldQuickApp,
  salaryRaiseApp,
  kalteProgressionApp,
  cashReconciliationApp,
  ageReliefApp,
]);

/** Default release catalog shown on the home page. */
export const calculatorApps: readonly CalculatorAppDefinition[] = Object.freeze(
  allCalculatorApps.filter((app) => app.releaseStatus === CalculatorReleaseStatus.Published),
);

/** Returns catalog apps filtered by optional opt-in demo visibility. */
export function visibleCatalogApps(
  apps: readonly CalculatorAppDefinition[],
  includeDemos = false,
): readonly CalculatorAppDefinition[] {
  return includeDemos
    ? apps
    : apps.filter((app) => app.releaseStatus === CalculatorReleaseStatus.Published);
}

export const CATALOG_PAGE_SIZE = 9;

export function calculatorAtPath(pathname: string): CalculatorAppDefinition | undefined {
  const normalized = pathname.replace(/\/+$/, "");
  return allCalculatorApps.find((app) => calculatorPath(app.id).replace(/\/$/, "") === normalized);
}

/** Clamp after filtering so category/search changes cannot leave an empty out-of-range page. */
export function catalogPage(apps: readonly CalculatorAppDefinition[], query: string, category: CalculatorCategory | undefined, requestedPage: number, pageSize = CATALOG_PAGE_SIZE) {
  if (!Number.isInteger(pageSize) || pageSize < 1) {
    throw new TypeError("Catalog page size must be a positive integer.");
  }
  const term = query.trim().toLocaleLowerCase();
  const matches = apps.filter((app) => (!category || app.category === category) && [app.title, app.description, ...app.keywords].join(" ").toLocaleLowerCase().includes(term));
  const pages = Math.max(1, Math.ceil(matches.length / pageSize));
  const page = Math.min(pages, Math.max(1, Number.isFinite(requestedPage) ? Math.floor(requestedPage) : 1));
  return { items: matches.slice((page - 1) * pageSize, page * pageSize),
    total: matches.length,
    page,
    pages };
}
