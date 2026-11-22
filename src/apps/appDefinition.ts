import {
  type LawGroupId,
  type LawId,
} from "#engine/laws/types";

export const AppId = { Catalog: "catalog",
  NetPay: "net-pay",
  ParentalLeave: "parental-leave",
  ParentalPlanner: "parental-planner",
  MunichMap: "munich-map",
  GiroCode: "girocode",
  Visa: "visa",
  CompanyCar: "company-car",
  SolarEnergy: "solar-energy",
  Housing: "housing",
  Mortgage: "mortgage",
  Kita: "kita",
  MinijobMidijob: "minijob-midijob",
  CommuterAllowance: "commuter-allowance",
  ExpensePlanner: "expense-planner",
  ResignationRunway: "resignation-runway",
  PermanentResidency: "permanent-residency",
  Citizenship: "citizenship",
  FamilyMilestones: "family-milestones",
  ChildcarePlanner: "childcare-planner",
  TravelPlanner: "travel-planner",
  TaxClassSwitch: "tax-class-switch",
  AssetAffordability: "asset-affordability",
  PlanningDashboard: "planning-dashboard",
  Mutterschutz: "mutterschutz",
  ProgressionTax: "progression-tax",
  KindergeldComparison: "kindergeld-comparison",
  ElterngeldQuick: "elterngeld-quick",
  SalaryRaise: "salary-raise",
  KalteProgression: "kalte-progression",
  CashReconciliation: "cash-reconciliation",
  AgeRelief: "age-relief" } as const;
export type AppId = (typeof AppId)[keyof typeof AppId];
export function toAppId(value: string): AppId {
  if (!Object.values(AppId).includes(value as AppId)) {
    throw new TypeError(`Unknown calculator app: ${value}`);
  }
  return value as AppId;
}

export const CalculatorCategory = { Money: "Money & taxes",
  Family: "Family & leave",
  Everyday: "Everyday" } as const;
export type CalculatorCategory = (typeof CalculatorCategory)[keyof typeof CalculatorCategory];
export function toCalculatorCategory(value: string): CalculatorCategory {
  if (!Object.values(CalculatorCategory).includes(value as CalculatorCategory)) {
    throw new TypeError(`Unknown calculator category: ${value}`);
  }
  return value as CalculatorCategory;
}

export const CalculatorReleaseStatus = {
  Published: "published",
  Draft: "draft",
} as const;
export type CalculatorReleaseStatus = (typeof CalculatorReleaseStatus)[keyof typeof CalculatorReleaseStatus];
export function toCalculatorReleaseStatus(value: string): CalculatorReleaseStatus {
  if (!Object.values(CalculatorReleaseStatus).includes(value as CalculatorReleaseStatus)) {
    throw new TypeError(`Unknown calculator release status: ${value}`);
  }
  return value as CalculatorReleaseStatus;
}

export const CalculatorReleaseBadge = {
  Beta: "beta",
  New: "new",
  Deprecated: "deprecated",
} as const;
export type CalculatorReleaseBadge = (typeof CalculatorReleaseBadge)[keyof typeof CalculatorReleaseBadge];
export function toCalculatorReleaseBadge(value: string): CalculatorReleaseBadge {
  if (!Object.values(CalculatorReleaseBadge).includes(value as CalculatorReleaseBadge)) {
    throw new TypeError(`Unknown calculator release badge: ${value}`);
  }
  return value as CalculatorReleaseBadge;
}

export interface CalculatorAppDefinition {
  readonly id: Exclude<AppId, typeof AppId.Catalog>;
  readonly title: string;
  readonly description: string;
  readonly category: CalculatorCategory;
  readonly releaseStatus: CalculatorReleaseStatus;
  readonly releaseBadge?: CalculatorReleaseBadge;
  readonly features: readonly string[];
  readonly keywords: readonly string[];
}

export function sitePath(path: string): string {
  const basePath = (import.meta.env?.BASE_URL ?? "/").replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  return relativePath ? `${basePath}/${relativePath}` : `${basePath}/`;
}

export function calculatorPath(id: CalculatorAppDefinition["id"]): string {
  return sitePath(id === AppId.MunichMap ? "/tools/munich-map/" : `/calculators/${id}/`);
}

/** Canonical base path for the full interactive Unified Life Profile & Cross-Calculator Summary page. */
export function lifeProfilePath(): string {
  return sitePath("/profile/");
}

/** Canonical base path for the full interactive Law Reference Directory page. */
export function lawCatalogPath(): string {
  return sitePath("/laws/");
}

/** Canonical path for a dedicated full statute page, optionally carrying a thematic group highlight. */
export function lawDetailPath(
  lawId: LawId,
  groupId?: LawGroupId,
): string {
  const base = sitePath(`/laws/${lawId}/`);
  return groupId ? `${base}?group=${encodeURIComponent(groupId)}` : base;
}
