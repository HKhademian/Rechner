import {
  type ChildcareTaxDeductionFormulaResult,
  type ChildPaidFeeEntry,
  type MunicipalDaycareIncomeBracket,
  evaluateChildcareTaxDeductionFormula,
  evaluateMunicipalDaycareFeeFormula,
} from "#engine/formulas/pure/childcareFormulas";
import {
  type ChildcarePlanConfig,
  type EuroAmount,
  type FullCalendarYear,
  type PercentageRate,
  DaycareBookingHoursTier,
  FederalStateKitaPresetId,
  toDaycareBookingHoursTier,
  toEuroAmount,
  toFederalStateKitaPresetId,
  toFullCalendarYear,
  toPercentageRate,
} from "#engine/types";
import childcareRulesJson from "../../data/childcareRules.json" with { type: "json" };
import municipalDaycareTablesJson from "../../data/municipalDaycareTables.json" with { type: "json" };

export interface MunicipalDaycarePreset {
  readonly id: FederalStateKitaPresetId;
  readonly label: string;
  readonly federalState: string;
  readonly isIllustrativeReferenceModel: boolean;
  readonly description: string;
  readonly source: string;
  readonly siblingDiscountRateSecondChild: PercentageRate;
  readonly siblingStepDownBrackets: number;
  readonly siblingDiscountRateThirdPlusChild: PercentageRate;
  readonly feeFreeFromAgeMonths: number | null;
  readonly defaultMonthlyMealFee: EuroAmount;
  readonly incomeBrackets: readonly MunicipalDaycareIncomeBracket[];
  readonly bookingHourTiers?: Readonly<
    Partial<Record<DaycareBookingHoursTier, readonly MunicipalDaycareIncomeBracket[]>>
  >;
}

export interface ActiveDaycareChild {
  readonly childKey: string;
  readonly ageMonths: number;
}

export interface MonthlyChildcareCostBreakdownItem {
  readonly childKey: string;
  readonly ageMonths: number;
  readonly siblingCareRank: number;
  readonly baseBracketFee: EuroAmount;
  /** Deductible monthly core care fee (§ 10 Abs. 1 Nr. 5 EStG). */
  readonly netMonthlyFee: EuroAmount;
  /** Non-deductible monthly meal fee (Verpflegungsgeld, § 10 Abs. 1 Nr. 5 Satz 1 Halbsatz 2 EStG). */
  readonly monthlyMealFee: EuroAmount;
  readonly isFeeFreeByAge: boolean;
}

export interface MonthlyChildcarePlanResult {
  /** Total monthly household outflow (core care fee + optional non-deductible meal fee). */
  readonly totalMonthlyFee: EuroAmount;
  /** Total monthly deductible core care fee (§ 10 Abs. 1 Nr. 5 EStG). */
  readonly totalMonthlyCareFee: EuroAmount;
  /** Total monthly non-deductible meal contribution (Verpflegungsgeld). */
  readonly totalMonthlyMealFee: EuroAmount;
  readonly perChildFees: readonly MonthlyChildcareCostBreakdownItem[];
}

export interface ChildcareTaxRulesSnapshot {
  readonly calendarYear: FullCalendarYear;
  readonly sourceYear: FullCalendarYear;
  readonly effectiveFrom: string;
  readonly projected: boolean;
  readonly deductibleFraction: PercentageRate;
  readonly maxAnnualDeductionPerChild: EuroAmount;
  readonly maxChildAgeYears: number;
}

function freezeIncomeBrackets(
  brackets: readonly { readonly maxAnnualGrossIncome: number | null;
    readonly monthlyFee: number }[],
): readonly MunicipalDaycareIncomeBracket[] {
  return Object.freeze(
    brackets.map((bracket) =>
      Object.freeze({
        maxAnnualGrossIncome: bracket.maxAnnualGrossIncome,
        monthlyFee: bracket.monthlyFee,
      })),
  );
}

const MUNICIPAL_PRESET_MAP: ReadonlyMap<FederalStateKitaPresetId, MunicipalDaycarePreset> = new Map(
  Object.values(municipalDaycareTablesJson).map((entry) => {
    const id = toFederalStateKitaPresetId(entry.id);
    const siblingStepDownBrackets =
      "siblingStepDownBrackets" in entry && typeof entry.siblingStepDownBrackets === "number"
        ? entry.siblingStepDownBrackets
        : 0;
    const defaultMonthlyMealFee = toEuroAmount(
      "defaultMonthlyMealFee" in entry && typeof entry.defaultMonthlyMealFee === "number"
        ? entry.defaultMonthlyMealFee
        : 0,
    );
    let bookingHourTiers:
      | Readonly<Partial<Record<DaycareBookingHoursTier, readonly MunicipalDaycareIncomeBracket[]>>>
      | undefined;
    if ("bookingHourTiers" in entry && entry.bookingHourTiers && typeof entry.bookingHourTiers === "object") {
      const tiersMap: Partial<Record<DaycareBookingHoursTier, readonly MunicipalDaycareIncomeBracket[]>> = {};
      for (const [tierKey, rawBrackets] of Object.entries(entry.bookingHourTiers)) {
        const validTier = toDaycareBookingHoursTier(tierKey);
        tiersMap[validTier] = freezeIncomeBrackets(rawBrackets);
      }
      bookingHourTiers = Object.freeze(tiersMap);
    }

    const preset: MunicipalDaycarePreset = Object.freeze({
      id,
      label: entry.label,
      federalState: entry.federalState,
      isIllustrativeReferenceModel: entry.isIllustrativeReferenceModel,
      description: entry.description,
      source: entry.source,
      siblingDiscountRateSecondChild: toPercentageRate(entry.siblingDiscountRateSecondChild),
      siblingStepDownBrackets,
      siblingDiscountRateThirdPlusChild: toPercentageRate(entry.siblingDiscountRateThirdPlusChild),
      feeFreeFromAgeMonths: entry.feeFreeFromAgeMonths,
      defaultMonthlyMealFee,
      incomeBrackets: freezeIncomeBrackets(entry.incomeBrackets),
      ...(bookingHourTiers ? { bookingHourTiers } : {}),
    });
    return [id, preset];
  }),
);

/**
 * Default household municipal daycare (Kita) configuration (disabled by default
 * so baseline simulations preserve bit-for-bit statutory parity until opted in).
 * Defaults to Landeshauptstadt München official S580 Krippe/Kindergarten brackets.
 */
export function createDefaultChildcarePlanConfig(): ChildcarePlanConfig {
  return Object.freeze({
    enabled: false,
    presetId: FederalStateKitaPresetId.BavariaMunich,
    customMonthlyFeePerChild: toEuroAmount(250),
    startAgeMonths: 12,
    endAgeMonths: 72,
  });
}

/** Returns all federal-state / municipal daycare fee reference tables. */
export function getAllMunicipalDaycarePresets(): readonly MunicipalDaycarePreset[] {
  return Object.freeze([...MUNICIPAL_PRESET_MAP.values()]);
}

/** Looks up one federal-state / municipal daycare fee reference table. */
export function getMunicipalDaycarePreset(presetId: FederalStateKitaPresetId): MunicipalDaycarePreset {
  if (presetId === FederalStateKitaPresetId.Custom) {
    throw new TypeError("Custom daycare preset does not map to a municipal reference table.");
  }
  const preset = MUNICIPAL_PRESET_MAP.get(presetId);
  if (!preset) {
    throw new TypeError(`Unknown municipal daycare preset: ${presetId}`);
  }
  return preset;
}

/**
 * Computes monthly parental daycare fees across all active children inside
 * `[startAgeMonths, endAgeMonths)` using either a fixed custom monthly rate
 * or a municipal income-tiered schedule (e.g. Munich S580 booking-hour tiers,
 * sibling bracket step-downs, Kindergarten fee exemption, and separate non-deductible
 * Verpflegungsgeld meal contributions).
 */
export function computeMonthlyChildcarePlanCosts(
  config: ChildcarePlanConfig,
  householdAnnualGrossIncome: EuroAmount,
  children: readonly ActiveDaycareChild[],
  existingSimultaneousCareSiblings = 0,
): MonthlyChildcarePlanResult {
  if (!config.enabled) {
    return Object.freeze({
      totalMonthlyFee: toEuroAmount(0),
      totalMonthlyCareFee: toEuroAmount(0),
      totalMonthlyMealFee: toEuroAmount(0),
      perChildFees: Object.freeze([]),
    });
  }
  if (!Number.isFinite(config.customMonthlyFeePerChild) || config.customMonthlyFeePerChild < 0) {
    throw new TypeError("Custom monthly childcare fee must be non-negative.");
  }
  if (
    !Number.isInteger(existingSimultaneousCareSiblings) ||
    existingSimultaneousCareSiblings < 0
  ) {
    throw new TypeError("Existing simultaneous daycare siblings count must be a non-negative integer.");
  }
  if (
    config.monthlyMealFeePerChild !== undefined &&
    (!Number.isFinite(config.monthlyMealFeePerChild) || config.monthlyMealFeePerChild < 0)
  ) {
    throw new TypeError("Monthly meal fee per child must be non-negative.");
  }
  if (!Number.isFinite(config.startAgeMonths) || !Number.isFinite(config.endAgeMonths) ||
    config.startAgeMonths < 0 || config.endAgeMonths < config.startAgeMonths) {
    throw new TypeError("Daycare age window [startAgeMonths, endAgeMonths) is invalid.");
  }

  const qualifying = children
    .filter((child) => child.ageMonths >= config.startAgeMonths && child.ageMonths < config.endAgeMonths)
    .sort((a, b) => (b.ageMonths !== a.ageMonths ? b.ageMonths - a.ageMonths : a.childKey.localeCompare(b.childKey)));

  if (qualifying.length === 0) {
    return Object.freeze({
      totalMonthlyFee: toEuroAmount(0),
      totalMonthlyCareFee: toEuroAmount(0),
      totalMonthlyMealFee: toEuroAmount(0),
      perChildFees: Object.freeze([]),
    });
  }

  if (config.presetId === FederalStateKitaPresetId.Custom) {
    const flatFee = toEuroAmount(config.customMonthlyFeePerChild);
    const mealFee = config.includeMealFees
      ? toEuroAmount(config.monthlyMealFeePerChild ?? 0)
      : toEuroAmount(0);
    const items = qualifying.map((child, idx): MonthlyChildcareCostBreakdownItem =>
      Object.freeze({
        childKey: child.childKey,
        ageMonths: child.ageMonths,
        siblingCareRank: existingSimultaneousCareSiblings + idx + 1,
        baseBracketFee: flatFee,
        netMonthlyFee: flatFee,
        monthlyMealFee: mealFee,
        isFeeFreeByAge: false,
      }));
    const totalCare = toEuroAmount(flatFee * items.length);
    const totalMeal = toEuroAmount(mealFee * items.length);
    return Object.freeze({
      totalMonthlyFee: toEuroAmount(totalCare + totalMeal),
      totalMonthlyCareFee: totalCare,
      totalMonthlyMealFee: totalMeal,
      perChildFees: Object.freeze(items),
    });
  }

  const preset = getMunicipalDaycarePreset(config.presetId);
  const bookingTier = config.bookingHoursTier ?? DaycareBookingHoursTier.H8_9;
  const activeBrackets = preset.bookingHourTiers?.[bookingTier] ?? preset.incomeBrackets;
  const mealFeePerChild = config.includeMealFees
    ? toEuroAmount(config.monthlyMealFeePerChild ?? preset.defaultMonthlyMealFee)
    : toEuroAmount(0);

  let totalMonthlyCare = 0;
  let totalMonthlyMeal = 0;
  const items = qualifying.map((child, idx): MonthlyChildcareCostBreakdownItem => {
    const siblingCareRank = existingSimultaneousCareSiblings + idx + 1;
    const result = evaluateMunicipalDaycareFeeFormula({
      householdAnnualGrossIncome,
      childAgeMonths: child.ageMonths,
      siblingCareRank,
      feeFreeFromAgeMonths: preset.feeFreeFromAgeMonths,
      siblingDiscountRateSecondChild: preset.siblingDiscountRateSecondChild,
      siblingStepDownBrackets: preset.siblingStepDownBrackets,
      siblingDiscountRateThirdPlusChild: preset.siblingDiscountRateThirdPlusChild,
      incomeBrackets: activeBrackets,
    });
    totalMonthlyCare += result.netMonthlyFee;
    totalMonthlyMeal += mealFeePerChild;
    return Object.freeze({
      childKey: child.childKey,
      ageMonths: child.ageMonths,
      siblingCareRank,
      baseBracketFee: result.baseBracketFee,
      netMonthlyFee: result.netMonthlyFee,
      monthlyMealFee: mealFeePerChild,
      isFeeFreeByAge: result.isFeeFreeByAge,
    });
  });

  return Object.freeze({
    totalMonthlyFee: toEuroAmount(totalMonthlyCare + totalMonthlyMeal),
    totalMonthlyCareFee: toEuroAmount(totalMonthlyCare),
    totalMonthlyMealFee: toEuroAmount(totalMonthlyMeal),
    perChildFees: Object.freeze(items),
  });
}

/**
 * Resolves § 10 Abs. 1 Nr. 5 EStG childcare deduction parameters for a calendar year,
 * automatically transitioning from the 2024 limit (2/3, €4,000) to the JStG 2024
 * 2025+ limit (80%, €4,800).
 */
export function resolveChildcareTaxRulesForYear(
  calendarYear: FullCalendarYear,
): ChildcareTaxRulesSnapshot {
  const requested = toFullCalendarYear(calendarYear);
  const availableYears = Object.keys(childcareRulesJson)
    .map(Number)
    .filter((year) => year <= requested)
    .sort((a, b) => b - a);
  const sourceYearNum = availableYears[0] ?? Math.min(...Object.keys(childcareRulesJson).map(Number));
  const profile = childcareRulesJson[String(sourceYearNum) as keyof typeof childcareRulesJson];

  return Object.freeze({
    calendarYear: requested,
    sourceYear: toFullCalendarYear(sourceYearNum),
    effectiveFrom: profile.effectiveFrom,
    projected: requested !== sourceYearNum,
    deductibleFraction: toPercentageRate(profile.parameters.deductibleFraction.value),
    maxAnnualDeductionPerChild: toEuroAmount(profile.parameters.maxAnnualDeductionPerChild.value),
    maxChildAgeYears: profile.parameters.maxChildAgeYears.value,
  });
}

/**
 * Evaluates annual § 10 Abs. 1 Nr. 5 EStG Sonderausgaben childcare deduction across
 * all paid per-child childcare fees in a calendar year.
 */
export function computeAnnualChildcareTaxDeduction(
  calendarYear: FullCalendarYear,
  paidFeesPerChild: readonly ChildPaidFeeEntry[],
  overrides?: {
    readonly deductibleFraction?: PercentageRate;
    readonly maxAnnualDeductionPerChild?: EuroAmount;
    readonly maxChildAgeYears?: number;
  },
): ChildcareTaxDeductionFormulaResult {
  const snapshot = resolveChildcareTaxRulesForYear(calendarYear);
  return evaluateChildcareTaxDeductionFormula({
    paidFeesPerChild,
    deductibleFraction: overrides?.deductibleFraction ?? snapshot.deductibleFraction,
    maxAnnualDeductionPerChild: overrides?.maxAnnualDeductionPerChild ?? snapshot.maxAnnualDeductionPerChild,
    maxChildAgeYears: overrides?.maxChildAgeYears ?? snapshot.maxChildAgeYears,
  });
}
