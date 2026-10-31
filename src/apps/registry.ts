import {
  type CalculatorAppDefinition,
  type CalculatorCategory,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  netPayApp,
} from "#/apps/net-pay/manifest.ts";
import {
  parentalLeaveApp,
} from "#/apps/parental-leave/manifest.ts";

/** Metadata only: the catalog must never initialize a calculator's financial store. */
export const calculatorApps: readonly CalculatorAppDefinition[] = Object.freeze([netPayApp, parentalLeaveApp]);
export const CATALOG_PAGE_SIZE = 6;

export function calculatorAtPath(pathname: string): CalculatorAppDefinition | undefined {
  const normalized = pathname.replace(/\/+$/, "");
  return calculatorApps.find((app) => calculatorPath(app.id).replace(/\/$/, "") === normalized);
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
