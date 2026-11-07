export const AppId = { Catalog: "catalog",
  NetPay: "net-pay",
  ParentalLeave: "parental-leave" } as const;
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

export interface CalculatorAppDefinition {
  readonly id: Exclude<AppId, typeof AppId.Catalog>;
  readonly title: string;
  readonly description: string;
  readonly category: CalculatorCategory;
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
