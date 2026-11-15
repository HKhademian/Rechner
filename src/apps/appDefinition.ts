import {
  type LawGroupId,
  type LawId,
} from "#engine/laws/types";

export const AppId = { Catalog: "catalog",
  NetPay: "net-pay",
  ParentalLeave: "parental-leave",
  GiroCode: "girocode",
  Visa: "visa",
  CompanyCar: "company-car",
  SolarEnergy: "solar-energy",
  Housing: "housing" } as const;
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

export interface CalculatorAppDefinition {
  readonly id: Exclude<AppId, typeof AppId.Catalog>;
  readonly title: string;
  readonly description: string;
  readonly category: CalculatorCategory;
  readonly releaseStatus: CalculatorReleaseStatus;
  readonly features: readonly string[];
  readonly keywords: readonly string[];
}

export function sitePath(path: string): string {
  const basePath = (import.meta.env?.BASE_URL ?? "/").replace(/\/+$/, "");
  const relativePath = path.replace(/^\/+/, "");
  return relativePath ? `${basePath}/${relativePath}` : `${basePath}/`;
}

export function calculatorPath(id: CalculatorAppDefinition["id"]): string {
  return sitePath(`/calculators/${id}/`);
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
