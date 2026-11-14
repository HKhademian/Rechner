import {
  type CalculatorAppDefinition,
  AppId,
  lawCatalogPath,
} from "#/apps/appDefinition.ts";
import {
  calculatorApps,
} from "#/apps/registry.ts";
import {
  type FormulaDomain as FormulaDomainType,
  FormulaDomain,
} from "#engine/formulas/types";
import {
  getLawEntry,
  getLawGroupEntry,
} from "#engine/laws/registry";
import {
  type LawEntry,
  type LawGroupId,
  type LawTag,
  LawCode,
  LawId,
  isLawGroupId,
  isLawId,
  toLawTag,
} from "#engine/laws/types";

/**
 * Parsed URL state for the Dedicated Full Law Reference Page (`/laws/` and `/laws/<lawId>/`).
 */
export interface ParsedLawPageLocation {
  readonly lawId?: LawId;
  readonly groupId?: LawGroupId;
  readonly tagFilter?: LawTag;
  readonly searchQuery?: string;
}

/**
 * Human-readable display labels for `FormulaDomain` categories on the Law Page.
 */
export const FORMULA_DOMAIN_LABELS: Readonly<Record<FormulaDomainType, string>> = Object.freeze({
  [FormulaDomain.IncomeTax]: "Income Tax",
  [FormulaDomain.SocialSecurity]: "Social Security",
  [FormulaDomain.ParentalAllowance]: "Parental Allowance",
  [FormulaDomain.MaternityProtection]: "Maternity Protection",
  [FormulaDomain.FamilyBenefits]: "Family Benefits",
  [FormulaDomain.VisaResidence]: "Visa & Residence",
  [FormulaDomain.CompanyCar]: "Company Car & Mobility",
  [FormulaDomain.SolarEnergy]: "Solar & Green Energy",
  [FormulaDomain.HousingProperty]: "Housing & KfW 300",
});

const NET_PAY_LAW_CODES = new Set<string>([
  LawCode.EStG,
  LawCode.SolzG,
  LawCode.SGB3,
  LawCode.SGB4,
  LawCode.SGB5,
  LawCode.SGB6,
  LawCode.SGB11,
  LawCode.BVV,
  LawCode.BMF,
]);

const NET_PAY_EXTRA_LAW_IDS = new Set<LawId>([
  LawId.BEEG_2c,
  LawId.BEEG_2e,
]);

const PARENTAL_LEAVE_LAW_CODES = new Set<string>([
  LawCode.BEEG,
  LawCode.MuSchG,
  LawCode.KfW,
]);

/**
 * Parses a Law Page pathname + query string (accounting for Astro base path like `/Rechner`)
 * into typed `LawId`, `LawGroupId`, `LawTag`, and search query state.
 */
export function parseLawPageLocation(
  pathname: string,
  search: string,
  lawsBaseUrl: string = lawCatalogPath(),
): ParsedLawPageLocation {
  const normalizedBase = lawsBaseUrl.replace(/\/+$/, "");
  const normalizedPath = pathname.replace(/\/+$/, "");

  let pathLawId: LawId | undefined;
  if (normalizedPath.startsWith(`${normalizedBase}/`)) {
    const remainder = normalizedPath.slice(normalizedBase.length + 1);
    const firstSegment = remainder.split("/")[0];
    if (firstSegment && isLawId(firstSegment)) {
      pathLawId = firstSegment;
    }
  }

  const params = new URLSearchParams(search);
  const queryLawRaw = params.get("law");
  const queryGroupRaw = params.get("group");
  const queryTagRaw = params.get("tag");
  const querySearchRaw = params.get("q");

  const queryLawId = queryLawRaw && isLawId(queryLawRaw) ? queryLawRaw : undefined;
  const resolvedLawId = pathLawId ?? queryLawId;

  let groupId: LawGroupId | undefined;
  if (queryGroupRaw && isLawGroupId(queryGroupRaw)) {
    groupId = queryGroupRaw;
  }
  else if (resolvedLawId) {
    groupId = getLawEntry(resolvedLawId).groupId;
  }

  let effectiveLawId = resolvedLawId;
  if (!effectiveLawId && groupId) {
    effectiveLawId = getLawGroupEntry(groupId).primaryLawId;
  }

  let tagFilter: LawTag | undefined;
  if (queryTagRaw) {
    try {
      tagFilter = toLawTag(queryTagRaw);
    }
    catch {
      tagFilter = undefined;
    }
  }

  return {
    lawId: effectiveLawId,
    groupId,
    tagFilter,
    searchQuery: querySearchRaw ? querySearchRaw : undefined,
  };
}

/**
 * Builds the canonical HTML document `<title>` for a dedicated Law Page.
 */
export function buildLawPageTitle(entry: LawEntry): string {
  return `${entry.citation} — ${entry.title} | Rechner`;
}

/**
 * Filters a candidate list of statutes by an optional thematic `LawGroupId`.
 */
export function filterLawsByGroup(
  laws: readonly LawEntry[],
  groupId: LawGroupId | undefined,
): readonly LawEntry[] {
  if (!groupId) {
    return laws;
  }
  const group = getLawGroupEntry(groupId);
  const memberSet = new Set<LawId>(group.memberLawIds);
  return laws.filter((law) => memberSet.has(law.id));
}

/**
 * Resolves the calculator apps (`Net Pay Calculator`, `Parental Leave Planner`)
 * that implement or reference the given statutory `LawEntry`.
 */
export function getCalculatorsUsingLaw(
  entry: LawEntry,
): readonly CalculatorAppDefinition[] {
  const usesNetPay = NET_PAY_LAW_CODES.has(entry.code) || NET_PAY_EXTRA_LAW_IDS.has(entry.id);
  const usesParentalLeave = PARENTAL_LEAVE_LAW_CODES.has(entry.code) ||
    NET_PAY_LAW_CODES.has(entry.code);

  const appMap = new Map(calculatorApps.map((app) => [app.id, app]));
  const result: CalculatorAppDefinition[] = [];

  if (usesNetPay) {
    const netPay = appMap.get(AppId.NetPay);
    if (netPay) {
      result.push(netPay);
    }
  }
  if (usesParentalLeave) {
    const parentalLeave = appMap.get(AppId.ParentalLeave);
    if (parentalLeave) {
      result.push(parentalLeave);
    }
  }
  return result;
}
