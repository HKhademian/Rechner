import type {
  assessCoupleBenefitIncome,
} from "#engine/benefits/incomeEligibility";
import type {
  AnnualTaxRecord,
} from "#engine/tax/annualTaxRecords";
/**
 * German Elterngeld & Parental Leave 5-Year Financial Simulator - Domain Type System
 *
 * Core strongly-typed nominal domain definitions, strict const enums, runtime constructors,
 * validation type guards, ledger structures, and statutory tax modeling interfaces.
 * Adheres strictly to nominal branding patterns (Rule 10, Rule 12) and const enums (Rule 11).
 */
import {
  type BenefitRules,
  type SourceUrl,
} from "#engine/config/benefitRules";

import {
  type TaxRules,
} from "#engine/tax/taxRules";
import type {
  PayrollOptions,
} from "#engine/tax/payroll";
import type {
  TimelineConventions,
} from "#engine/config/timelineConventions";

/**
 * Unique symbol discriminators enforcing nominal subtyping hierarchies at compile time.
 * Prevents structural unit confusion (e.g. GrossSalary vs NetSalary vs EuroAmount).
 */
declare const _BRAND_TAG: unique symbol;
declare const _SUB_BRAND_TAG: unique symbol;
declare const _ACTION_SUB_BRAND_TAG: unique symbol;

/**
 * Generic nominal brand type wrapper.
 * Intersects base primitive `Base` with a unique readonly symbol discriminator tagged with `Tag`.
 */
export type Brand<Base, Tag extends string> = Base & {
  readonly [_BRAND_TAG]: Tag;
};

/**
 * Generic nominal subtype brand wrapper for single-level specialization.
 * Enables nominal subtyping hierarchies (e.g. `GrossSalary` is a subtype of `EuroAmount`).
 */
export type SubBrand<ParentBrand, SubTag extends string> = ParentBrand & {
  readonly [_SUB_BRAND_TAG]: SubTag;
};

/**
 * Generic nominal action subtype wrapper for discrete milestone action identifiers.
 * Enables specialization of `ActionId` into domain-specific action keys (e.g. `PregnancyId`, `SwitchId`).
 */
export type ActionSubBrand<ParentBrand, SubTag extends string> = ParentBrand & {
  readonly [_ACTION_SUB_BRAND_TAG]: SubTag;
};

// ============================================================================
// 1. Temporal & Timeline Nominal Types
// ============================================================================

/** Discrete 1-based chronological simulation month index within the active timeline horizon (1..120). */
export type SimulationMonth = Brand<number, "SimulationMonth">;

/** 1-based chronological simulation horizon year index (1..10). */
export type SimulationYear = Brand<number, "SimulationYear">;

/** Alias for simulation horizon year index (1..10). */
export type CalendarYear = SimulationYear;

/** 4-digit Gregorian calendar year (1900..2100 e.g. 2025, 2026, 2027). */
export type FullCalendarYear = Brand<number, "FullCalendarYear">;

/** 1-based Gregorian calendar month number (1=Jan, 2=Feb, ..., 12=Dec). */
export type CalendarMonth = Brand<number, "CalendarMonth">;

/** Finite duration, span, or offset measured in elapsed months (0..120). */
export type MonthDuration = Brand<number, "MonthDuration">;

/** Immutable absolute calendar month identifier formatted as 'M<MM>.<YYYY>' (e.g. 'M09.2027'). */
export type MonthId = SubBrand<EntityId, "MonthId">;

/** Statutory pregnancy-relative month reference anchored to positive test M1 (e.g. 'M1 (Pregnancy Positive)', 'M-8', 'M9 (Birth 1)'). */
export type MonthRef = SubBrand<EntityId, "MonthRef">;

/** Simulation-start relative reference notation (e.g. 'Sim1', 'Sim21', 'Sim60'). */
export type MonthSimRef = SubBrand<EntityId, "MonthSimRef">;

/** Formatted Gregorian calendar date label formatted as 'MM.YYYY' (e.g. '01.2026', '09.2027'). */
export type CalendarLabel = SubBrand<EntityId, "CalendarLabel">;

/** Weekly contractual or actual employment working hours (0..60 hours/week). */
export type WorkingHours = Brand<number, "WorkingHours">;

/** Statutory married couple income tax factor under § 39f EStG, truncated to three decimals. */
export type TaxFactor = Brand<number, "TaxFactor">;

/** Numeric percentage rate or ratio represented as a decimal fraction (0.0..1.0). */
export type PercentageRate = Brand<number, "PercentageRate">;

// ============================================================================
// 2. Demographic & Child Nominal Types
// ============================================================================

/** Count of living dependent children in the household (0..10). */
export type ChildrenCount = Brand<number, "ChildrenCount">;

/** 1-based ordinal child index within the family structure (1=First child, 2=Second child, ...). */
export type ChildIndex = Brand<number, "ChildIndex">;

// ============================================================================
// 3. Monetary Hierarchy Nominal Types
// ============================================================================

/** Euro financial amount rounded to cents (EUR). */
export type EuroAmount = Brand<number, "EuroAmount">;

/** Pre-tax gross earned employment salary in EUR (nominal subtype of EuroAmount). */
export type GrossSalary = SubBrand<EuroAmount, "GrossSalary">;

/** Post-withholding net take-home salary in EUR (nominal subtype of EuroAmount). */
export type NetSalary = SubBrand<EuroAmount, "NetSalary">;

/** Statutory annual child tax-free allowance under § 32 Abs. 6 EStG (Kinderfreibetrag + BEA). */
export type KinderfreibetragAnnualAmount = SubBrand<
  EuroAmount,
  "KinderfreibetragAnnualAmount"
>;

/** Exact integer euro cents amount (1 EUR = 100 EuroCents). */
export type EuroCents = Brand<number, "EuroCents">;

// ============================================================================
// 4. Entity & Action Identifier Nominal Types
// ============================================================================

/** Base nominal string identifier for system entities and ledger records. */
export type EntityId = Brand<string, "EntityId">;

/** Formal statutory legal citation string (e.g. 'BEEG § 2b', 'EStG § 26b', 'MuSchG § 19'). */
export type StatutoryCitation = SubBrand<EntityId, "StatutoryCitation">;

/** Unique immutable identifier for an accounting transaction ledger entry. */
export type TransactionId = SubBrand<EntityId, "TransactionId">;

/** Unique immutable identifier for a special life, bonus, or tax refund event. */
export type EventId = SubBrand<EntityId, "EventId">;

/** Base nominal identifier for discrete timeline milestone actions. */
export type ActionId = SubBrand<EntityId, "ActionId">;

/** Unique nominal identifier for a pregnancy positive milestone action (e.g. 'PREG-CHILD-1'). */
export type PregnancyId = ActionSubBrand<ActionId, "PregnancyId">;

/** Unique nominal identifier for a spousal tax class switch action (e.g. 'SWAP-PREG-1'). */
export type SwitchId = ActionSubBrand<ActionId, "SwitchId">;

/** Unique nominal identifier for a career advancement or salary raise action (e.g. 'RAISE-HUSBAND-1'). */
export type RaiseId = ActionSubBrand<ActionId, "RaiseId">;

/** Unique nominal identifier for a working hours schedule adjustment action (e.g. 'HOURS-WIFE-1'). */
export type HoursChangeId = ActionSubBrand<ActionId, "HoursChangeId">;

/** Unique nominal identifier for a discrete financial inflow or cost event (e.g. 'FEVENT-EQUIP-1'). */
export type FinancialEventId = ActionSubBrand<ActionId, "FinancialEventId">;

// ============================================================================
// 5. Categorical Const Enums (Rule 11: No Raw Strings)
// ============================================================================

/** German statutory wage tax classes under § 38b EStG (Lohnsteuerklassen I through VI). */
export const TaxClass = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
  VI: "VI",
} as const;
export type TaxClass = (typeof TaxClass)[keyof typeof TaxClass];

/**
 * Discrete statutory simulation strategies evaluated across the timeline.
 */
export const SimulationStrategy = {
  /** Continuous dual-career wage progression without children or parental leave (formerly Scenario A). */
  StatusQuo: "status_quo",
  /** Parental leave with standard static tax classes without proactive switching (formerly Scenario B). */
  UnoptimizedBaseline: "unoptimized_baseline",
  /** Statutorily optimized with proactive § 2b tax switch, max § 4 ElterngeldPlus, § 2a Sibling Bonus, § 26b Joint Refund (formerly Scenario C). */
  StatutoryOptimized: "statutory_optimized",
} as const;
export type SimulationStrategy =
  (typeof SimulationStrategy)[keyof typeof SimulationStrategy];

/** Primary Strategy Identifier alias for SimulationStrategy. */
export const StrategyId = SimulationStrategy;
export type StrategyId = SimulationStrategy;

/** Legacy alias for SimulationStrategy / StrategyId */
export const ScenarioId = {
  A: SimulationStrategy.StatusQuo,
  B: SimulationStrategy.UnoptimizedBaseline,
  C: SimulationStrategy.StatutoryOptimized,
  StatusQuo: SimulationStrategy.StatusQuo,
  UnoptimizedBaseline: SimulationStrategy.UnoptimizedBaseline,
  StatutoryOptimized: SimulationStrategy.StatutoryOptimized,
} as const;
export type ScenarioId = SimulationStrategy;

/** Active strategy view selection for reactive dashboard, charting, and ledger auditing. */
export const ActiveStrategyView = {
  StatusQuo: SimulationStrategy.StatusQuo,
  UnoptimizedBaseline: SimulationStrategy.UnoptimizedBaseline,
  StatutoryOptimized: SimulationStrategy.StatutoryOptimized,
  Compare: "compare",
  // Backward compatibility keys
  A: SimulationStrategy.StatusQuo,
  B: SimulationStrategy.UnoptimizedBaseline,
  C: SimulationStrategy.StatutoryOptimized,
} as const;
export type ActiveStrategyView =
  (typeof ActiveStrategyView)[keyof typeof ActiveStrategyView];

/** Backward compatibility alias for ActiveStrategyView */
export const ActiveScenarioView = ActiveStrategyView;
export type ActiveScenarioView = ActiveStrategyView;

/** Visual display modes for timeline cash flow charting. */
export const TimelineChartMode = {
  StackedBar: "stacked_bar",
  Lines: "lines",
  Area: "area",
  Compare: "compare",
} as const;
export type TimelineChartMode =
  (typeof TimelineChartMode)[keyof typeof TimelineChartMode];

/** Timeline horizontal zoom and milestone filtering presets. */
export const TimelineTimeRangeFilter = {
  All: "all",
  Child1: "child1",
  Child2: "child2",
  Post: "post",
} as const;
export type TimelineTimeRangeFilter =
  (typeof TimelineTimeRangeFilter)[keyof typeof TimelineTimeRangeFilter];

/** High-level classification categories for user milestone actions. */
export const ActionCategory = {
  Pregnancy: "PREGNANCY",
  TaxSwitch: "TAX_SWITCH",
  SalaryRaise: "SALARY_RAISE",
  WorkingHours: "WORKING_HOURS",
  FinancialEvent: "FINANCIAL_EVENT",
  ElterngeldReallocation: "ELTERNGELD_REALLOCATION",
} as const;
export type ActionCategory =
  (typeof ActionCategory)[keyof typeof ActionCategory];

/** Specific discrete milestone trigger types occurring along the simulation timeline. */
export const ActionType = {
  PregnancyPositive: "PREGNANCY_POSITIVE",
  ChildDelivery: "CHILD_DELIVERY",
  TaxClassSwitchEffective: "TAX_CLASS_SWITCH_EFFECTIVE",
  TaxClassSwitchRevert: "TAX_CLASS_SWITCH_REVERT",
  SalaryRaiseEffective: "SALARY_RAISE_EFFECTIVE",
  WorkingHoursChangeEffective: "WORKING_HOURS_CHANGE_EFFECTIVE",
  FinancialCostOutflow: "FINANCIAL_COST_OUTFLOW",
  FinancialIncomeInflow: "FINANCIAL_INCOME_INFLOW",
  ElterngeldReallocation: "ELTERNGELD_REALLOCATION",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

/** Standard categories for discrete one-off life expenses, grants, and financial milestones. */
export const FinancialEventCategory = {
  BabyEquipment: "Baby Equipment (*Erstausstattung*)",
  ChildcareFees: "Childcare (*Kita/Betreuung*)",
  CareerBonus: "Career & Bonus (*Sonderzahlung*)",
  HousingNursery: "Housing & Nursery (*Wohnen/Umzug*)",
  HealthcareFamily: "Healthcare & Family (*Familienleistung*)",
  TaxAdjustment: "Tax Office (*Finanzamt*)",
  InvestmentReturn: "Investment & Capital (*Kapitalertrag*)",
  CustomSpecial: "Custom Financial Event (*Sonderposten*)",
} as const;
export type FinancialEventCategory =
  (typeof FinancialEventCategory)[keyof typeof FinancialEventCategory];

/** Target spouse or family household recipient for salary raises and employment adjustments. */
export const TargetPerson = {
  Both: "BOTH",
  Husband: "HUSBAND",
  Wife: "WIFE",
} as const;
export type TargetPerson = (typeof TargetPerson)[keyof typeof TargetPerson];

/** Internal calculation event discriminators for non-monthly timeline cash flows. */
export const SpecialEventType = {
  Bonus40: "bonus_40",
  Bonus60: "bonus_60",
  TaxReturn: "tax_return",
  CustomCost: "custom_cost",
  CustomIncome: "custom_income",
} as const;
export type SpecialEventType =
  (typeof SpecialEventType)[keyof typeof SpecialEventType];

/** Descriptive categories for special life and accounting events rendered in ledger sub-rows. */
export const SpecialEventCategory = {
  ThirteenthSalary: "13th Salary (*13. Monatsgehalt*)",
  FourteenthSalary: "14th Salary (*14. Monatsgehalt*)",
  FifteenthSalary: "15th Salary (*15. Monatsgehalt*)",
  SalaryBonus: "Special Salary Bonus (*Sonderzahlung*)",
  TaxOffice: "Tax Office (*Finanzamt*)",
  BabyEquipment: "Baby Equipment (*Erstausstattung*)",
  ChildcareFees: "Childcare (*Kita/Betreuung*)",
  CareerBonus: "Career & Bonus (*Sonderzahlung*)",
  HousingNursery: "Housing & Nursery (*Wohnen/Umzug*)",
  HealthcareFamily: "Healthcare & Family (*Familienleistung*)",
  InvestmentReturn: "Investment & Capital (*Kapitalertrag*)",
  CustomSpecial: "Custom Financial Event (*Sonderposten*)",
} as const;
export type SpecialEventCategory =
  (typeof SpecialEventCategory)[keyof typeof SpecialEventCategory];

/** Double-entry accounting transaction classification types for ledger auditing. */
export const TransactionType = {
  SalaryBase: "SALARY_BASE",
  SalaryBonus13thVacation: "SALARY_BONUS_13TH_VACATION",
  SalaryBonus13thChristmas: "SALARY_BONUS_13TH_CHRISTMAS",
  SalaryBonus14th: "SALARY_BONUS_14TH",
  SalaryBonus15th: "SALARY_BONUS_15TH",
  SalaryBonusSpecial: "SALARY_BONUS_SPECIAL",
  BenefitMutterschutz: "BENEFIT_MUTTERSCHUTZ",
  BenefitElterngeldPlusMother: "BENEFIT_ELTERNGELD_PLUS_MOTHER",
  BenefitElterngeldPlusFather: "BENEFIT_ELTERNGELD_PLUS_FATHER",
  BenefitPartnerschaftsbonus: "BENEFIT_PARTNERSCHAFTSBONUS",
  BenefitKindergeld: "BENEFIT_KINDERGELD",
  TaxReconciliationRefund: "TAX_RECONCILIATION_REFUND",
  ExpenseOutflow: "EXPENSE_OUTFLOW",
  SpecialIncome: "SPECIAL_INCOME",
} as const;
export type TransactionType =
  (typeof TransactionType)[keyof typeof TransactionType];

/** Cash flow movement direction in double-entry bookkeeping ledger. */
export const TransactionDirection = {
  Inflow: "INFLOW",
  Outflow: "OUTFLOW",
} as const;
export type TransactionDirection =
  (typeof TransactionDirection)[keyof typeof TransactionDirection];

/** Data keys for columns rendered in the timeline ledger table. */
export const FieldColumnKey = {
  Month: "month",
  Phase: "phase",
  TaxClass: "taxClass",
  HusbandSalary: "husbandSalary",
  WifeSalary: "wifeSalary",
  Mutterschutz: "mutterschutz",
  WifeElterngeld: "wifeElterngeld",
  HusbandElterngeld: "husbandElterngeld",
  Kindergeld: "kindergeld",
  SpecialEvents: "specialEvents",
  NetInflow: "netInflow",
  CumulativeTotal: "cumulativeTotal",
} as const;
export type FieldColumnKey =
  (typeof FieldColumnKey)[keyof typeof FieldColumnKey];

/** Data keys for field-level drill-down mathematical derivations in explainer modals. */
export const ExplanationFieldKey = {
  Month: "month",
  Phase: "phase",
  TaxClass: "taxClass",
  HusbandSalary: "husbandSalary",
  WifeSalary: "wifeSalary",
  Mutterschutz: "mutterschutz",
  WifeElterngeld: "wifeElterngeld",
  HusbandElterngeld: "husbandElterngeld",
  Kindergeld: "kindergeld",
  SpecialEvents: "specialEvents",
  NetInflow: "netInflow",
  CumulativeTotal: "cumulativeTotal",
  Title: "title",
  Amount: "amount",
} as const;
export type ExplanationFieldKey =
  (typeof ExplanationFieldKey)[keyof typeof ExplanationFieldKey];

/** Structural type tag for rows displayed in the row explanation modal. */
export const ExplainerRowType = {
  Month: "MONTH",
  Action: "ACTION",
  SpecialEvent: "SPECIAL_EVENT",
} as const;
export type ExplainerRowType =
  (typeof ExplainerRowType)[keyof typeof ExplainerRowType];

/** Headless CLI reporting format options. */
export const CliOutputFormat = {
  Table: "table",
  Summary: "summary",
  Milestones: "milestones",
  Json: "json",
} as const;
export type CliOutputFormat =
  (typeof CliOutputFormat)[keyof typeof CliOutputFormat];

/** Institutional UI design system color theme modes. */
export const ThemeMode = {
  Light: "light",
  Dark: "dark",
  System: "system",
} as const;
export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

/**
 * Validates and casts an arbitrary string into a strongly-typed `ThemeMode`.
 * @throws {TypeError} if input does not match a valid `ThemeMode` member.
 */
export function toThemeMode(val: string): ThemeMode {
  const values = Object.values(ThemeMode) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ThemeMode: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ThemeMode;
}

/** User input mode for salary specifications (Gross pre-tax vs Net take-home). */
export const SalaryInputMode = {
  Gross: "GROSS",
  Net: "NET",
} as const;
export type SalaryInputMode =
  (typeof SalaryInputMode)[keyof typeof SalaryInputMode];

/** Salary payment cadence (Monthly vs Yearly). */
export const SalaryPeriod = {
  Monthly: "MONTHLY",
  Yearly: "YEARLY",
} as const;
export type SalaryPeriod = (typeof SalaryPeriod)[keyof typeof SalaryPeriod];

/** Statutory income tax tariff zones under § 32a Abs. 1 EStG. */
export const WageTaxZone = {
  Zone1Null: "ZONE_1_NULL",
  Zone2Progression1: "ZONE_2_PROGRESSION_1",
  Zone3Progression2: "ZONE_3_PROGRESSION_2",
  Zone4Proportional42: "ZONE_4_PROPORTIONAL_42",
  Zone5Reichensteuer45: "ZONE_5_REICHENSTEUER_45",
} as const;
export type WageTaxZone = (typeof WageTaxZone)[keyof typeof WageTaxZone];

/** Tax withholding calculation method for one-off bonuses (Sonstige Bezüge § 39b Abs. 3 EStG). */
export const BonusTaxMethod = {
  RegularWage: "REGULAR_WAGE",
  SonstigeBezuegeAnnualDiff: "SONSTIGE_BEZUEGE_ANNUAL_DIFF",
} as const;
export type BonusTaxMethod =
  (typeof BonusTaxMethod)[keyof typeof BonusTaxMethod];

/** Total annual employment salary payments for a person (12, 13, 14, or 15). */
export const AnnualSalariesCount = {
  Twelve: 12,
  Thirteen: 13,
  Fourteen: 14,
  Fifteen: 15,
} as const;
export type AnnualSalariesCount =
  (typeof AnnualSalariesCount)[keyof typeof AnnualSalariesCount];

/** Standard bonus distribution preset patterns for 13th, 14th, and 15th salaries. */
export const BonusDistributionPreset = {
  Ratio40_60: "ratio_40_60",
  Ratio50_50: "ratio_50_50",
  Single100Nov: "single_100_nov",
  Single100Dec: "single_100_dec",
  Double100_100: "double_100_100",
  Triple100_100_100: "triple_100_100_100",
  Quarterly: "quarterly",
  Custom: "custom",
} as const;
export type BonusDistributionPreset =
  (typeof BonusDistributionPreset)[keyof typeof BonusDistributionPreset];

/**
 * Itemized bonus distribution installment slot within a calendar year.
 */
export interface SalaryBonusSlot {
  /** 1-based calendar month of disbursement (1..12). */
  readonly calendarMonth: CalendarMonth;
  /** Percentage / fraction of regular monthly net take-home salary (0.01 .. 2.00, e.g. 0.4, 0.5, 0.6, 1.0). */
  readonly payoutFraction: PercentageRate;
  /** Optional descriptive title (e.g. "13th Salary (Vacation Pay)", "13th Salary (Christmas Bonus)"). */
  readonly label?: string;
}

// ============================================================================
// 6. Runtime Branded Constructors & Type Guards (Rule 12)
// ============================================================================

/**
 * Constructs a validated `SimulationMonth` (integer 1..120).
 * @throws {TypeError} if value is not an integer between 1 and 120.
 */
export function toSimulationMonth(val: number): SimulationMonth {
  if (!Number.isInteger(val) || val < 1 || val > 120) {
    throw new TypeError(
      `Invalid SimulationMonth: ${val}. Must be integer between 1 and 120.`,
    );
  }
  return val as SimulationMonth;
}

/**
 * Constructs a validated `CalendarYear` (integer 1..10).
 * @throws {TypeError} if value is not an integer between 1 and 10.
 */
export function toCalendarYear(val: number): CalendarYear {
  if (!Number.isInteger(val) || val < 1 || val > 10) {
    throw new TypeError(
      `Invalid CalendarYear: ${val}. Must be integer between 1 and 10.`,
    );
  }
  return val as CalendarYear;
}

/**
 * Constructs a validated 4-digit `FullCalendarYear` (1900..2100).
 * @throws {TypeError} if value is not a valid 4-digit calendar year.
 */
export function toFullCalendarYear(val: number | string): FullCalendarYear {
  const num = typeof val === "string" ? Number(val) : val;
  if (
    typeof num !== "number" ||
    Number.isNaN(num) ||
    !Number.isFinite(num) ||
    !Number.isInteger(num) ||
    num < 1900 ||
    num > 2100
  ) {
    throw new TypeError(
      `Invalid FullCalendarYear: ${val}. Must be integer 4-digit calendar year between 1900 and 2100 (e.g. 2025, 2026).`,
    );
  }
  return num as FullCalendarYear;
}

/**
 * Constructs a validated `CalendarMonth` (integer 1..12).
 * @throws {TypeError} if value is not an integer between 1 and 12.
 */
export function toCalendarMonth(val: number): CalendarMonth {
  if (!Number.isInteger(val) || val < 1 || val > 12) {
    throw new TypeError(
      `Invalid CalendarMonth: ${val}. Must be integer between 1 and 12.`,
    );
  }
  return val as CalendarMonth;
}

/**
 * Constructs a validated `MonthDuration` (finite number 0..120).
 * @throws {TypeError} if value is out of bounds or not finite.
 */
export function toMonthDuration(val: number | string): MonthDuration {
  const num = typeof val === "string" ? Number(val) : val;
  if (
    typeof num !== "number" ||
    Number.isNaN(num) ||
    !Number.isFinite(num) ||
    num < 0 ||
    num > 120
  ) {
    throw new TypeError(
      `Invalid MonthDuration: ${val}. Must be finite number between 0 and 120.`,
    );
  }
  return num as MonthDuration;
}

/**
 * Constructs a validated `ChildrenCount` (integer 0..10).
 * @throws {TypeError} if value is out of bounds or non-integer.
 */
export function toChildrenCount(val: number | string): ChildrenCount {
  const num = typeof val === "string" ? Number(val) : val;
  if (
    typeof num !== "number" ||
    Number.isNaN(num) ||
    !Number.isFinite(num) ||
    !Number.isInteger(num) ||
    num < 0 ||
    num > 10
  ) {
    throw new TypeError(
      `Invalid ChildrenCount: ${val}. Must be integer between 0 and 10.`,
    );
  }
  return num as ChildrenCount;
}

/**
 * Constructs a validated `ChildIndex` (1-based ordinal child number 1..10).
 * @throws {TypeError} if value is out of bounds or non-integer.
 */
export function toChildIndex(val: number | string): ChildIndex {
  const num = typeof val === "string" ? Number(val) : val;
  if (
    typeof num !== "number" ||
    Number.isNaN(num) ||
    !Number.isFinite(num) ||
    !Number.isInteger(num) ||
    num < 1 ||
    num > 10
  ) {
    throw new TypeError(
      `Invalid ChildIndex: ${val}. Must be integer between 1 and 10.`,
    );
  }
  return num as ChildIndex;
}

/**
 * Constructs a validated `PercentageRate` (normalized decimal 0.0..1.0).
 * Automatically converts percentage inputs (> 1.0) by dividing by 100.
 * @throws {TypeError} if input is negative or exceeds 100%.
 */
export function toPercentageRate(val: number | string): PercentageRate {
  let num = typeof val === "string" ? Number(val) : val;
  if (
    typeof num !== "number" ||
    Number.isNaN(num) ||
    !Number.isFinite(num) ||
    num < 0 ||
    num > 100
  ) {
    throw new TypeError(
      `Invalid PercentageRate: ${val}. Must be numeric value between 0.0 and 1.0 (or 0%..100%).`,
    );
  }
  if (num > 1.0) {
    num = num / 100;
  }
  return (Math.round(num * 100000) / 100000) as PercentageRate;
}

/**
 * Constructs a validated `WorkingHours` weekly employment duration (0..60 hours/week).
 * @throws {TypeError} if hours are negative, non-finite, or exceed 60 hours/week.
 */
export function toWorkingHours(val: number): WorkingHours {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0 ||
    val > 60
  ) {
    throw new TypeError(
      `Invalid WorkingHours: ${val}. Must be between 0 and 60.`,
    );
  }
  return val as WorkingHours;
}

/**
 * Constructs a validated `EuroAmount` rounded to cents, with half cents away from zero.
 * Decimal exponent shifting avoids binary rounding errors such as 1.005 -> 1.00.
 * BEEG guidelines 2.0.3.3.1 require cent rounding of monetary intermediates:
 * https://www.bmbfsfj.bund.de/resource/blob/243236/6d06137220a52d1a18905493c3ab6199/richtlinien-zum-beeg-data.pdf
 * @throws {TypeError} if value is not a finite number.
 */
export function toEuroAmount(val: number): EuroAmount {
  if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
    throw new TypeError(`Invalid EuroAmount: ${val}. Must be a valid number.`);
  }
  const [coefficient, exponent = "0"] = Math.abs(val).toString().split("e");
  const cents = Math.round(Number(`${coefficient}e${Number(exponent) + 2}`));
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError(`Invalid EuroAmount: ${val}. Must fit in safe integer cents.`);
  }
  return (Math.sign(val) * cents / 100 || 0) as EuroAmount;
}

/**
 * Constructs a validated `EuroCents` integer cents value.
 * @throws {TypeError} if value is not an integer.
 */
export function toEuroCents(val: number): EuroCents {
  if (!Number.isInteger(val)) {
    throw new TypeError(`Invalid EuroCents: ${val}. Must be integer cents.`);
  }
  return val as EuroCents;
}

/**
 * Constructs a validated `GrossSalary` rounded to non-negative euro cents.
 * @throws {TypeError} if value is negative or not a finite number.
 */
export function toGrossSalary(val: number): GrossSalary {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0
  ) {
    throw new TypeError(`Invalid GrossSalary: ${val}. Must be non-negative.`);
  }
  return toEuroAmount(val) as GrossSalary;
}

/**
 * Constructs a validated `NetSalary` rounded to non-negative euro cents.
 * @throws {TypeError} if value is negative or not a finite number.
 */
export function toNetSalary(val: number): NetSalary {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0
  ) {
    throw new TypeError(`Invalid NetSalary: ${val}. Must be non-negative.`);
  }
  return toEuroAmount(val) as NetSalary;
}

/**
 * Constructs a validated `TaxFactor` under § 39f EStG truncated to 3 decimal places (0 <= factor <= 1.0).
 * https://www.gesetze-im-internet.de/estg/__39f.html
 * @throws {TypeError} if ratio is outside [0..1.0].
 */
export function toTaxFactor(val: number): TaxFactor {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0 ||
    val > 1
  ) {
    throw new TypeError(
      `Invalid TaxFactor: ${val}. Must be a valid ratio between 0 and 1.0.`,
    );
  }
  return (Math.floor(val * 1000) / 1000) as TaxFactor;
}

/**
 * Constructs a validated `StatutoryCitation` string.
 * @throws {TypeError} if citation string is empty.
 */
export function toStatutoryCitation(val: string): StatutoryCitation {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid StatutoryCitation: ${val}. Must be non-empty string.`,
    );
  }
  return val as StatutoryCitation;
}

/**
 * Constructs a validated `TransactionId` string.
 * @throws {TypeError} if transaction ID is empty.
 */
export function toTransactionId(val: string): TransactionId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid TransactionId: ${val}. Must be non-empty string.`,
    );
  }
  return val as TransactionId;
}

/**
 * Constructs a validated `EventId` string.
 * @throws {TypeError} if event ID is empty.
 */
export function toEventId(val: string): EventId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid EventId: ${val}. Must be non-empty string.`);
  }
  return val as EventId;
}

/**
 * Constructs a validated `ActionId` string.
 * @throws {TypeError} if action ID is empty.
 */
export function toActionId(val: string): ActionId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid ActionId: ${val}. Must be non-empty string.`);
  }
  return val as ActionId;
}

/**
 * Constructs a validated `PregnancyId` string.
 * @throws {TypeError} if pregnancy action ID is empty.
 */
export function toPregnancyId(val: string): PregnancyId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid PregnancyId: ${val}. Must be non-empty string.`,
    );
  }
  return val as PregnancyId;
}

/**
 * Constructs a validated `SwitchId` string.
 * @throws {TypeError} if tax switch action ID is empty.
 */
export function toSwitchId(val: string): SwitchId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid SwitchId: ${val}. Must be non-empty string.`);
  }
  return val as SwitchId;
}

/**
 * Constructs a validated `RaiseId` string.
 * @throws {TypeError} if salary raise action ID is empty.
 */
export function toRaiseId(val: string): RaiseId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid RaiseId: ${val}. Must be non-empty string.`);
  }
  return val as RaiseId;
}

/**
 * Constructs a validated `HoursChangeId` string.
 * @throws {TypeError} if working hours action ID is empty.
 */
export function toHoursChangeId(val: string): HoursChangeId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid HoursChangeId: ${val}. Must be non-empty string.`,
    );
  }
  return val as HoursChangeId;
}

/**
 * Constructs a validated `FinancialEventId` string.
 * @throws {TypeError} if financial event action ID is empty.
 */
export function toFinancialEventId(val: string): FinancialEventId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid FinancialEventId: ${val}. Must be non-empty string.`,
    );
  }
  return val as FinancialEventId;
}

/**
 * Constructs a validated generic `EntityId` string.
 * @throws {TypeError} if entity ID is empty.
 */
export function toEntityId(val: string): EntityId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid EntityId: ${val}. Must be non-empty string.`);
  }
  return val as EntityId;
}

/**
 * Constructs an immutable, absolute `MonthId` formatted as 'M<MM>.<YYYY>'.
 * Examples: `toMonthId(9, 2027)` -> `'M09.2027'`, `toMonthId("M09.2027")` -> `'M09.2027'`.
 * @throws {TypeError} if month or year are out of valid Gregorian calendar bounds.
 */
export function toMonthId(
  calendarMonthOrStr: number | string,
  calendarYear?: number,
): MonthId {
  if (typeof calendarMonthOrStr === "string") {
    const cleaned = calendarMonthOrStr.trim().toUpperCase();
    const match = cleaned.match(/^M(0[1-9]|1[0-2])\.?(\d{4})$/);
    if (!match) {
      throw new TypeError(
        `Invalid MonthId string format: "${calendarMonthOrStr}". Expected format 'M<MM>.<YYYY>' (e.g. 'M09.2027').`,
      );
    }
    return `M${match[1]}.${match[2]}` as MonthId;
  }
  const m = Number(calendarMonthOrStr);
  const y = Number(calendarYear);
  if (
    !Number.isInteger(m) ||
    m < 1 ||
    m > 12 ||
    !Number.isInteger(y) ||
    y < 1900 ||
    y > 2200
  ) {
    throw new TypeError(
      `Invalid MonthId parameters: month=${calendarMonthOrStr}, year=${calendarYear}. Must be integer month 1..12 and 4-digit year.`,
    );
  }
  return `M${String(m).padStart(2, "0")}.${y}` as MonthId;
}

/** Type guard verifying if an unknown value satisfies the `MonthId` format 'M<MM>.<YYYY>'. */
export function isMonthId(val: unknown): val is MonthId {
  return typeof val === "string" && /^M(0[1-9]|1[0-2])\.\d{4}$/.test(val);
}

/**
 * Constructs an immutable, nominal `MonthRef` representing statutory relative month notation
 * anchored to the first pregnancy positive test (M1).
 * Examples: `toMonthRef(12)` -> `'M12'`, `toMonthRef(1, "Pregnancy Positive")` -> `'M1 (Pregnancy Positive)'`.
 * @throws {TypeError} if input does not conform to relative month pattern 'M<signed_int>'.
 */
export function toMonthRef(
  monthRefOrIndex: number | string,
  suffix?: string,
): MonthRef {
  if (typeof monthRefOrIndex === "number") {
    if (!Number.isInteger(monthRefOrIndex)) {
      throw new TypeError(
        `Invalid MonthRef relative index: ${monthRefOrIndex}. Must be an integer.`,
      );
    }
    const base = `M${monthRefOrIndex}`;
    return (suffix ? `${base} (${suffix})` : base) as MonthRef;
  }
  if (!monthRefOrIndex || typeof monthRefOrIndex !== "string") {
    throw new TypeError(
      `Invalid MonthRef: ${monthRefOrIndex}. Must be non-empty string or integer.`,
    );
  }
  const trimmed = monthRefOrIndex.trim();
  if (!/^M-?\d+(\s*\(.*\))?$/i.test(trimmed)) {
    throw new TypeError(
      `Invalid MonthRef string format: "${monthRefOrIndex}". Expected format 'M<signed_int>' or 'M<signed_int> (<label>)' (e.g. 'M12', 'M-8', 'M1 (Pregnancy Positive)').`,
    );
  }
  return trimmed as MonthRef;
}

/** Type guard verifying if an unknown value satisfies the `MonthRef` relative month format. */
export function isMonthRef(val: unknown): val is MonthRef {
  return typeof val === "string" && /^M-?\d+(\s*\(.*\))?$/i.test(val.trim());
}

/**
 * Constructs an immutable, nominal `MonthSimRef` representing chronological simulation index (Sim1..Sim120).
 * Examples: `toMonthSimRef(1)` -> `'Sim1'`, `toMonthSimRef("21")` -> `'Sim21'`.
 * @throws {TypeError} if index is not between 1 and 120.
 */
export function toMonthSimRef(simMonthOrStr: number | string): MonthSimRef {
  if (typeof simMonthOrStr === "number") {
    if (
      !Number.isInteger(simMonthOrStr) ||
      simMonthOrStr < 1 ||
      simMonthOrStr > 120
    ) {
      throw new TypeError(
        `Invalid MonthSimRef integer: ${simMonthOrStr}. Must be integer between 1 and 120.`,
      );
    }
    return `Sim${simMonthOrStr}` as MonthSimRef;
  }
  if (!simMonthOrStr || typeof simMonthOrStr !== "string") {
    throw new TypeError(
      `Invalid MonthSimRef: ${simMonthOrStr}. Must be non-empty string or integer.`,
    );
  }
  const trimmed = simMonthOrStr.trim();
  const match = trimmed.match(/^(?:Sim|[Mm])?(\d+)$/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (num >= 1 && num <= 120) {
      return `Sim${num}` as MonthSimRef;
    }
  }
  throw new TypeError(
    `Invalid MonthSimRef string format: "${simMonthOrStr}". Expected format 'Sim<1..120>' (e.g. 'Sim1', 'Sim21', 'Sim60').`,
  );
}

/** Type guard verifying if an unknown value satisfies the `MonthSimRef` pattern 'Sim<1..120>'. */
export function isMonthSimRef(val: unknown): val is MonthSimRef {
  return (
    typeof val === "string" && /^Sim([1-9]\d?|1[01]\d|120)$/.test(val.trim())
  );
}

/**
 * Constructs an immutable, nominal `CalendarLabel` formatted as 'MM.YYYY'.
 * Examples: `toCalendarLabel(1, 2026)` -> `'01.2026'`, `toCalendarLabel("01.2026")` -> `'01.2026'`.
 *
 * @param calendarMonthOrStr - 1-based calendar month number (1..12) or pre-formatted 'MM.YYYY' string.
 * @param calendarYear - Optional 4-digit calendar year (1900..2100).
 * @returns Strongly-typed `CalendarLabel`.
 * @throws {TypeError} if month or year are out of valid Gregorian calendar bounds or format is invalid.
 */
export function toCalendarLabel(
  calendarMonthOrStr: number | string,
  calendarYear?: number,
): CalendarLabel {
  if (typeof calendarMonthOrStr === "string") {
    const cleaned = calendarMonthOrStr.trim();
    const match = cleaned.match(/^(0[1-9]|1[0-2])\.(\d{4})$/);
    if (!match) {
      throw new TypeError(
        `Invalid CalendarLabel string format: "${calendarMonthOrStr}". Expected format '<MM>.<YYYY>' (e.g. '01.2026', '09.2027').`,
      );
    }
    return `${match[1]}.${match[2]}` as CalendarLabel;
  }
  const m = Number(calendarMonthOrStr);
  const y = Number(calendarYear);
  if (
    !Number.isInteger(m) ||
    m < 1 ||
    m > 12 ||
    !Number.isInteger(y) ||
    y < 1900 ||
    y > 2100
  ) {
    throw new TypeError(
      `Invalid CalendarLabel parameters: month=${calendarMonthOrStr}, year=${calendarYear}. Must be integer month 1..12 and 4-digit year 1900..2100.`,
    );
  }
  return `${String(m).padStart(2, "0")}.${y}` as CalendarLabel;
}

/** Type guard verifying if an unknown value satisfies the `CalendarLabel` format '<MM>.<YYYY>'. */
export function isCalendarLabel(val: unknown): val is CalendarLabel {
  return typeof val === "string" && /^(0[1-9]|1[0-2])\.\d{4}$/.test(val.trim());
}

/**
 * Constructs a validated `KinderfreibetragAnnualAmount` in EUR.
 * @throws {TypeError} if allowance amount is negative or non-finite.
 */
export function toKinderfreibetragAnnualAmount(
  val: number,
): KinderfreibetragAnnualAmount {
  if (typeof val !== "number" || Number.isNaN(val) || val < 0) {
    throw new TypeError(
      `Invalid KinderfreibetragAnnualAmount: ${val}. Must be non-negative.`,
    );
  }
  return Math.round(val) as KinderfreibetragAnnualAmount;
}

// ============================================================================
// 7. Nominal Subtype Guards
// ============================================================================

/** Type guard verifying if value is a valid numeric `EuroAmount`. */
export function isEuroAmount(val: unknown): val is EuroAmount {
  return typeof val === "number" && !Number.isNaN(val);
}

/** Type guard verifying if value is a valid non-negative `GrossSalary`. */
export function isGrossSalary(val: unknown): val is GrossSalary {
  return typeof val === "number" && !Number.isNaN(val) && val >= 0;
}

/** Type guard verifying if value is a valid non-negative `NetSalary`. */
export function isNetSalary(val: unknown): val is NetSalary {
  return typeof val === "number" && !Number.isNaN(val) && val >= 0;
}

/** Type guard verifying if value is a valid statutory `TaxFactor` ratio (0 < factor <= 1.0). */
export function isTaxFactor(val: unknown): val is TaxFactor {
  return (
    typeof val === "number" &&
    !Number.isNaN(val) &&
    Number.isFinite(val) &&
    val >= 0 &&
    val <= 1
  );
}

/** Type guard verifying if value is a non-empty `ActionId`. */
export function isActionId(val: unknown): val is ActionId {
  return typeof val === "string" && val.length > 0;
}

/** Type guard verifying if value is a `PregnancyId` prefixed with 'PREG'. */
export function isPregnancyId(val: unknown): val is PregnancyId {
  return typeof val === "string" && val.startsWith("PREG");
}

/** Type guard verifying if value is a `SwitchId` prefixed with 'SWAP' or 'SWITCH'. */
export function isSwitchId(val: unknown): val is SwitchId {
  return (
    typeof val === "string" &&
    (val.startsWith("SWAP") || val.startsWith("SWITCH"))
  );
}

/** Type guard verifying if value is a `RaiseId` prefixed with 'RAISE'. */
export function isRaiseId(val: unknown): val is RaiseId {
  return typeof val === "string" && val.startsWith("RAISE");
}

/** Type guard verifying if value is a `FinancialEventId` prefixed with 'FEVENT' or 'FIN-EVENT'. */
export function isFinancialEventId(val: unknown): val is FinancialEventId {
  return (
    typeof val === "string" &&
    (val.startsWith("FEVENT") || val.startsWith("FIN-EVENT"))
  );
}

/**
 * Validates and normalizes string input into a strongly-typed `FinancialEventCategory`.
 * @throws {TypeError} if input does not match any valid category member.
 */
export function toFinancialEventCategory(val: string): FinancialEventCategory {
  for (const [k, v] of Object.entries(FinancialEventCategory)) {
    if (v === val) {
      return v;
    }
    if (k.toLowerCase() === val.toLowerCase().replace(/_/g, "")) {
      return v;
    }
  }
  const values = Object.values(FinancialEventCategory) as string[];
  throw new TypeError(
    `Invalid FinancialEventCategory: ${val}. Expected one of: ${values.join(", ")}.`,
  );
}

/**
 * Validates and normalizes string or FinancialEventCategory input into a strongly-typed `SpecialEventCategory`.
 * @throws {TypeError} if input does not match any valid category member.
 */
export function toSpecialEventCategory(
  val: string | FinancialEventCategory | SpecialEventCategory,
): SpecialEventCategory {
  for (const [k, v] of Object.entries(SpecialEventCategory)) {
    if (v === val) {
      return v;
    }
    if (k.toLowerCase() === val.toLowerCase().replace(/_/g, "")) {
      return v;
    }
  }
  if (val === FinancialEventCategory.TaxAdjustment) {
    return SpecialEventCategory.TaxOffice;
  }
  const values = Object.values(SpecialEventCategory) as string[];
  throw new TypeError(
    `Invalid SpecialEventCategory: ${val}. Expected one of: ${values.join(", ")}.`,
  );
}

/** Type guard confirming whether a value is a valid `SpecialEventCategory`. */
export function isSpecialEventCategory(
  val: unknown,
): val is SpecialEventCategory {
  return (
    typeof val === "string" &&
    Object.values(SpecialEventCategory).includes(val as SpecialEventCategory)
  );
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ActionCategory`.
 * @throws {TypeError} if input does not match a valid `ActionCategory` member.
 */
export function toActionCategory(val: string): ActionCategory {
  const values = Object.values(ActionCategory) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ActionCategory: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ActionCategory;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ActionType`.
 * @throws {TypeError} if input does not match a valid `ActionType` member.
 */
export function toActionType(val: string): ActionType {
  const values = Object.values(ActionType) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ActionType: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ActionType;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `TargetPerson`.
 * @throws {TypeError} if input does not match a valid `TargetPerson` member.
 */
export function toTargetPerson(val: string): TargetPerson {
  const values = Object.values(TargetPerson) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TargetPerson: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TargetPerson;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed German `TaxClass` (I..VI).
 * @throws {TypeError} if input is not a recognized tax bracket.
 */
export function toTaxClass(val: string): TaxClass {
  const values = Object.values(TaxClass) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TaxClass: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TaxClass;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `SimulationStrategy` / `StrategyId`.
 * Supports canonical strategy names ("status_quo", "unoptimized_baseline", "statutory_optimized")
 * and legacy identifiers ("A", "B", "C").
 * @throws {TypeError} if input does not match valid strategy identifiers.
 */
export function toStrategyId(val: string): StrategyId {
  const norm = val.trim().toLowerCase();
  if (norm === "status_quo" || norm === "statusquo" || norm === "a") {
    return SimulationStrategy.StatusQuo;
  }
  if (
    norm === "unoptimized_baseline" ||
    norm === "unoptimized" ||
    norm === "baseline" ||
    norm === "b"
  ) {
    return SimulationStrategy.UnoptimizedBaseline;
  }
  if (norm === "statutory_optimized" || norm === "optimized" || norm === "c") {
    return SimulationStrategy.StatutoryOptimized;
  }
  const values = Object.values(SimulationStrategy) as string[];
  throw new TypeError(
    `Invalid StrategyId: "${val}". Expected one of: ${values.join(", ")} (or legacy A, B, C).`,
  );
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ScenarioId` (alias for `toStrategyId`).
 */
export function toScenarioId(val: string): ScenarioId {
  return toStrategyId(val);
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ActiveStrategyView`.
 * Supports canonical view identifiers ("status_quo", "unoptimized_baseline", "statutory_optimized", "compare")
 * and legacy identifiers ("A", "B", "C").
 * @throws {TypeError} if input does not match active view members.
 */
export function toActiveStrategyView(val: string): ActiveStrategyView {
  const norm = val.trim().toLowerCase();
  if (norm === "compare") {
    return ActiveStrategyView.Compare;
  }
  return toStrategyId(val) as ActiveStrategyView;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ActiveScenarioView` (alias for `toActiveStrategyView`).
 */
export function toActiveScenarioView(val: string): ActiveScenarioView {
  return toActiveStrategyView(val);
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `TimelineChartMode`.
 * @throws {TypeError} if input is not a recognized chart mode.
 */
export function toTimelineChartMode(val: string): TimelineChartMode {
  const norm = val.toLowerCase().replace(/_/g, "");
  for (const v of Object.values(TimelineChartMode)) {
    if (v.toLowerCase().replace(/_/g, "") === norm) {
      return v;
    }
  }
  const values = Object.values(TimelineChartMode) as string[];
  throw new TypeError(
    `Invalid TimelineChartMode: ${val}. Expected one of: ${values.join(", ")}.`,
  );
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `TimelineTimeRangeFilter`.
 * @throws {TypeError} if input is not a recognized time filter.
 */
export function toTimelineTimeRangeFilter(
  val: string,
): TimelineTimeRangeFilter {
  const norm = val.toLowerCase().replace(/_/g, "");
  for (const v of Object.values(TimelineTimeRangeFilter)) {
    if (v.toLowerCase().replace(/_/g, "") === norm) {
      return v;
    }
  }
  const values = Object.values(TimelineTimeRangeFilter) as string[];
  throw new TypeError(
    `Invalid TimelineTimeRangeFilter: ${val}. Expected one of: ${values.join(", ")}.`,
  );
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `FieldColumnKey`.
 * @throws {TypeError} if input is not a recognized ledger table column key.
 */
export function toFieldColumnKey(val: string): FieldColumnKey {
  const values = Object.values(FieldColumnKey) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid FieldColumnKey: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as FieldColumnKey;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ExplanationFieldKey`.
 * @throws {TypeError} if input is not a recognized explanation drill-down field key.
 */
export function toExplanationFieldKey(val: string): ExplanationFieldKey {
  const values = Object.values(ExplanationFieldKey) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExplanationFieldKey: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExplanationFieldKey;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `ExplainerRowType`.
 * @throws {TypeError} if input is not a recognized row explanation type.
 */
export function toExplainerRowType(val: string): ExplainerRowType {
  const values = Object.values(ExplainerRowType) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExplainerRowType: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExplainerRowType;
}

/**
 * Validates and normalizes string input into a strongly-typed `CliOutputFormat`.
 * @throws {TypeError} if input is not a recognized CLI output format.
 */
export function toCliOutputFormat(val: string): CliOutputFormat {
  const normalized = val.toLowerCase();
  const values = Object.values(CliOutputFormat) as string[];
  if (!values.includes(normalized)) {
    throw new TypeError(
      `Invalid CliOutputFormat: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return normalized as CliOutputFormat;
}

/**
 * Validates and casts string input into a strongly-typed `SalaryInputMode` (GROSS or NET).
 * @throws {TypeError} if input is not GROSS or NET.
 */
export function toSalaryInputMode(val: string): SalaryInputMode {
  const upper = val.toUpperCase();
  const values = Object.values(SalaryInputMode) as string[];
  if (!values.includes(upper)) {
    throw new TypeError(
      `Invalid SalaryInputMode: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return upper as SalaryInputMode;
}

/**
 * Validates and normalizes string input into a strongly-typed `SalaryPeriod` (MONTHLY or YEARLY).
 * @throws {TypeError} if input is not recognized as monthly or yearly.
 */
export function toSalaryPeriod(val: string): SalaryPeriod {
  const upper = val.toUpperCase();
  if (upper === "MONTHLY" || upper === "MONTH" || upper === "M") {
    return SalaryPeriod.Monthly;
  }
  if (
    upper === "YEARLY" ||
    upper === "YEAR" ||
    upper === "ANNUAL" ||
    upper === "A" ||
    upper === "Y"
  ) {
    return SalaryPeriod.Yearly;
  }
  throw new TypeError(
    `Invalid SalaryPeriod: ${val}. Expected 'MONTHLY' or 'YEARLY'.`,
  );
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `WageTaxZone`.
 * @throws {TypeError} if input is not a recognized income tax zone.
 */
export function toWageTaxZone(val: string): WageTaxZone {
  const values = Object.values(WageTaxZone) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid WageTaxZone: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as WageTaxZone;
}

/**
 * Validates and casts an arbitrary string into a strongly-typed `BonusTaxMethod`.
 * @throws {TypeError} if input is not a recognized bonus tax deduction method.
 */
export function toBonusTaxMethod(val: string): BonusTaxMethod {
  const values = Object.values(BonusTaxMethod) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid BonusTaxMethod: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as BonusTaxMethod;
}

/**
 * Validates and casts number/string input into a strongly-typed `AnnualSalariesCount` (12, 13, 14, or 15).
 * @throws {TypeError} if input is not 12, 13, 14, or 15.
 */
export function toAnnualSalariesCount(
  val: number | string,
): AnnualSalariesCount {
  const num = typeof val === "string" ? Number(val) : val;
  const values = Object.values(AnnualSalariesCount) as number[];
  if (!values.includes(num)) {
    throw new TypeError(
      `Invalid AnnualSalariesCount: ${val}. Expected one of: 12, 13, 14, 15.`,
    );
  }
  return num as AnnualSalariesCount;
}

/**
 * Validates and casts string input into a strongly-typed `BonusDistributionPreset`.
 * @throws {TypeError} if input does not match recognized bonus presets.
 */
export function toBonusDistributionPreset(
  val: string,
): BonusDistributionPreset {
  const values = Object.values(BonusDistributionPreset) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid BonusDistributionPreset: "${val}". Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as BonusDistributionPreset;
}

// ============================================================================
// 8. Core Domain Interfaces & Financial Ledger Models
// ============================================================================

/**
 * Immutable Double-Entry Accounting Transaction Record.
 * Represents an individual cash inflow or outflow in the monthly ledger with complete statutory audit trail.
 */
export interface AccountingTransaction {
  /** Unique transaction identifier. */
  readonly transactionId: TransactionId;
  /** Absolute calendar month key formatted as 'M<MM>.<YYYY>'. */
  readonly monthId: MonthId;
  /** Statutory relative month reference anchored to positive test M1. */
  readonly monthRef?: MonthRef;
  /** Chronological simulation month reference anchored to simulation start (Sim1..Sim120). */
  readonly monthSimRef?: MonthSimRef;
  /** Display label for relative month reference. */
  readonly relativeMonthLabel?: MonthRef;
  /** 1-based chronological simulation month index (1..120). */
  readonly month: SimulationMonth;
  /** 1-based simulation horizon year index (1..10). */
  readonly year: CalendarYear;
  /** Detailed transaction classification type (e.g. SALARY_BASE, BENEFIT_ELTERNGELD_PLUS_MOTHER). */
  readonly type: TransactionType;
  /** Cash flow movement direction (INFLOW or OUTFLOW). */
  readonly direction: TransactionDirection;
  /** Exact integer EUR transaction amount. */
  readonly amount: EuroAmount;
  /** Statutory legal foundation citation (e.g. 'BEEG § 4', 'EStG § 66'). */
  readonly statutoryCitation: StatutoryCitation;
  /** Active tax class label during transaction execution (e.g. 'III / V'). */
  readonly taxClassLabel: string;
  /** Human-readable transaction summary description. */
  readonly description: string;
  /** Detailed mathematical derivation audit trail string. */
  readonly auditTrail: string;
}

/**
 * Special Life & Accounting Event Item.
 * Represents sub-row visual entries and discrete payments (13th salaries, tax returns, baby equipment).
 */
export interface TaxSettlementAudit {
  readonly calendarYear: FullCalendarYear;
  readonly settlement: EuroAmount;
  readonly creditedIncomeTax: EuroAmount;
  readonly creditedSolidarity: EuroAmount;
  readonly totalLiability: EuroAmount;
}

export interface SpecialEventItem {
  readonly taxSettlement?: TaxSettlementAudit;
  /** Unique event identifier. */
  readonly eventId: EventId;
  /** Absolute calendar month key formatted as 'M<MM>.<YYYY>'. */
  readonly monthId: MonthId;
  /** Statutory relative month reference anchored to positive test M1. */
  readonly monthRef?: MonthRef;
  /** Chronological simulation month reference (Sim1..Sim120). */
  readonly monthSimRef?: MonthSimRef;
  /** 1-based chronological simulation month index (1..120). */
  readonly month: SimulationMonth;
  /** 1-based simulation horizon year index (1..10). */
  readonly year: CalendarYear;
  /** 4-digit Gregorian calendar year (e.g. 2026). */
  readonly calendarYearNum: FullCalendarYear;
  /** 1-based Gregorian calendar month (1..12). */
  readonly calendarMonthNum: CalendarMonth;
  /** Formatted calendar label (e.g. '09.2027'). */
  readonly calendarLabel: CalendarLabel;
  /** Relative birth label reference (e.g. 'M9 (Birth 1)'). */
  readonly relativeBirthLabel: MonthRef;
  /** Relative month reference notation. */
  readonly relativeMonthLabel?: MonthRef;
  /** Internal event type discriminator. */
  readonly type: SpecialEventType;
  /** User-facing event title. */
  readonly title: string;
  /** Display category classification. */
  readonly category: SpecialEventCategory;
  /** Statutory legal reference. */
  readonly statutory: StatutoryCitation;
  /** Active tax class label at time of event. */
  readonly taxClassLabel: string;
  /** Exact EUR monetary cash flow (positive for income, negative for costs). */
  readonly amount: EuroAmount;
  /** Detailed item description. */
  readonly description: string;
}

/**
 * Action Milestone Item.
 * Non-value structural milestone marker placed immediately before the triggering simulation month.
 */
export interface ActionRowItem {
  /** Unique action identifier. */
  readonly actionId: ActionId;
  /** Absolute calendar month key formatted as 'M<MM>.<YYYY>'. */
  readonly monthId: MonthId;
  /** Statutory relative month reference. */
  readonly monthRef?: MonthRef;
  /** Simulation-start relative reference (Sim1..Sim120). */
  readonly monthSimRef?: MonthSimRef;
  /** 1-based simulation month index. */
  readonly month: SimulationMonth;
  /** Formatted calendar date label (e.g. '01.2026'). */
  readonly calendarLabel: CalendarLabel;
  /** Relative birth timing reference. */
  readonly relativeBirthLabel: MonthRef;
  /** Relative month reference notation. */
  readonly relativeMonthLabel?: MonthRef;
  /** Action milestone title header. */
  readonly title: string;
  /** Detailed description of action impact. */
  readonly description: string;
  /** Action category classification. */
  readonly category: ActionCategory;
  /** Specific discrete action type. */
  readonly type: ActionType;
  /** Resulting tax class configuration after action execution. */
  readonly taxClassLabel?: string;
}

/**
 * Monthly Chronological Financial Ledger Entry.
 * Encapsulates the complete financial snapshot, benefit disbursements, tax withholdings, and running totals for one month.
 */
export interface MonthlyLedgerEntry {
  readonly kindergeldDetails?: {
    readonly children: ChildrenCount;
    readonly monthlyPerChild: EuroAmount;
    readonly source: SourceUrl;
  };
  readonly benefitAssessmentAvailable?: boolean;
  readonly benefitPayments?: readonly BenefitPaymentAudit[];
  readonly unavailableReasons?: readonly string[];
  /** Actual modeled withholding; absent when only manual net salaries were supplied. */
  readonly payroll?: { readonly husband: MonthlyPayrollRecord;
    readonly wife: MonthlyPayrollRecord };
  readonly assumptions?: readonly string[];
  /** Absolute calendar month identifier (e.g. 'M09.2027'). */
  readonly monthId: MonthId;
  /** Statutory pregnancy-relative month notation (e.g. 'M9 (Birth 1)'). */
  readonly monthRef: MonthRef;
  /** Simulation start relative index notation (e.g. 'Sim21'). */
  readonly monthSimRef: MonthSimRef;
  /** 1-based chronological simulation month index (1..120). */
  readonly month: SimulationMonth;
  /** 1-based simulation horizon year index (1..10). */
  readonly year: CalendarYear;
  /** Month index within the simulation year (1..12). */
  readonly monthInYear: CalendarMonth;
  /** 4-digit Gregorian calendar year (e.g. 2027). */
  readonly calendarYearNum: FullCalendarYear;
  /** 1-based Gregorian calendar month number (1..12). */
  readonly calendarMonthNum: CalendarMonth;
  /** Formatted calendar month label (e.g. '09.2027'). */
  readonly calendarLabel: CalendarLabel;
  /** Relative birth timing reference label (e.g. 'M9 (Birth 1)'). */
  readonly relativeBirthLabel: MonthRef;
  /** Display relative month reference. */
  readonly relativeMonthLabel: MonthRef;
  /** Relative month signed integer offset from first positive pregnancy test. */
  readonly relativeMonthIndex: number;
  /** Husband's earned monthly take-home salary in EUR. */
  readonly husbandSalary: EuroAmount;
  /** Wife's earned monthly take-home salary in EUR. */
  readonly wifeSalary: EuroAmount;
  /** Maternity protection wage replacement benefit under §§ 19, 20 MuSchG. */
  readonly mutterschutz: EuroAmount;
  /** Mother's parental allowance under §§ 4, 4a BEEG (Basiselterngeld / ElterngeldPlus). */
  readonly wifeElterngeld: EuroAmount;
  /** Father's parental allowance under §§ 4, 4a BEEG. */
  readonly husbandElterngeld: EuroAmount;
  /** Monthly statutory child benefit under § 66 EStG (Kindergeld). */
  readonly kindergeld: EuroAmount;
  /** Annual income tax return refund under § 26b, § 46 EStG (disbursed in tax return month). */
  readonly taxRefund: EuroAmount;
  /** Mid-year 13th salary bonus under 40% vacation pay rule (legacy compatibility). */
  readonly bonus40Amount: EuroAmount;
  /** Year-end 13th salary bonus under 60% Christmas pay rule (legacy compatibility). */
  readonly bonus60Amount: EuroAmount;
  /** Itemized husband extra salary bonus amount disbursed in this month in EUR. */
  readonly husbandBonusAmount?: EuroAmount;
  /** Itemized wife extra salary bonus amount disbursed in this month in EUR. */
  readonly wifeBonusAmount?: EuroAmount;
  /** Total combined extra salary bonus amount for the household in this month in EUR. */
  readonly specialBonusTotal: EuroAmount;
  /** Total sum of all special financial events in the month in EUR. */
  readonly specialEventsTotal: EuroAmount;
  /** Discrete special life, bonus, or tax refund sub-row items occurring in this month. */
  readonly specialEvents: readonly SpecialEventItem[];
  /** Action milestones scheduled to take effect immediately prior to this month. */
  readonly startingActions?: readonly ActionRowItem[];
  /** Standard recurring monthly inflow (salaries + benefits) excluding one-off special events. */
  readonly regularMonthlyTotal: EuroAmount;
  /** Total net household cash inflow for the month including special events and tax refunds. */
  readonly monthlyTotal: EuroAmount;
  /** Total earned employment compensation in this month (regular salaries + 13th salary bonuses). */
  readonly earnedSalaries: EuroAmount;
  /** Total state welfare benefits received in this month (Mutterschutz + Elterngeld + Kindergeld). */
  readonly stateBenefits: EuroAmount;
  /** Cumulative running total of earned salaries from simulation start through this month. */
  readonly cumulatedSalaries: EuroAmount;
  /** Cumulative running total of state benefits from simulation start through this month. */
  readonly cumulatedBenefits: EuroAmount;
  /** Cumulative running total of tax refunds from simulation start through this month. */
  readonly cumulatedTaxRefunds: EuroAmount;
  /** Cumulative grand total household net cash flow from simulation start through this month. */
  readonly cumulatedTotal: EuroAmount;
  /** Active tax class configuration label (e.g. 'III / V', 'IV / IV', 'V / III'). */
  readonly taxClassLabel: string;
  /** Current family life cycle phase description (e.g. 'Pregnancy 1', 'Parental Leave 1'). */
  readonly phaseLabel: string;
  /** Visual event tag label for timeline markers, or null if standard month. */
  readonly eventTag: string | null;
  /** Internal event type string, or null if standard month. */
  readonly eventType: string | null;
  /** Boolean flag indicating whether proactive spousal tax class optimization is active. */
  readonly isSwapActive: boolean;
  /** Boolean flag indicating whether mother is in statutory maternity protection. */
  readonly isMutterschutz: boolean;
  /** Boolean flag indicating whether parents are receiving Partnerschaftsbonus under § 4b BEEG. */
  readonly isPartnerschaftsbonus: boolean;
  /** Boolean flag indicating whether sibling bonus under § 2a BEEG is active. */
  readonly hasSiblingBonus: boolean;
  /** Detailed list of itemized double-entry accounting ledger transactions for this month. */
  readonly transactions: readonly AccountingTransaction[];
}

/**
 * Complete Multi-Year Simulation Scenario Execution Result.
 * Aggregates monthly chronological ledger entries and high-level KPI totals over the full horizon.
 */
export interface BenefitAssessmentAudit {
  readonly incomeEligibility?: ReturnType<typeof assessCoupleBenefitIncome>;
  readonly pregnancyId: PregnancyId;
  readonly parent: TargetPerson;
  readonly birthMonthId: MonthId;
  readonly incomeMode: SalaryInputMode;
  readonly taxClass: TaxClass;
  readonly preBirthNet?: NetSalary;
  readonly postBirthAverageNet?: NetSalary;
  readonly averageRegularGross?: GrossSalary;
  readonly selectedMonths: readonly MonthId[];
  readonly excludedMonths: readonly MonthId[];
  readonly assumedMonths: readonly MonthId[];
  readonly ordinaryClaimMonths: readonly MonthId[];
  readonly partnershipClaimMonths: readonly MonthId[];
  readonly available: boolean;
  readonly required: boolean;
  readonly taxRules?: Pick<TaxRules, "calendarYear" | "sourceYear" | "projected" | "papPublication">;
  readonly reason?: string;
  readonly assumptions: readonly string[];
}

export interface BenefitPaymentAudit {
  readonly reallocated?: boolean;
  readonly pregnancyId: PregnancyId;
  readonly parent: TargetPerson;
  readonly partnershipBonus: boolean;
  readonly grossEntitlement: EuroAmount;
  readonly offset: EuroAmount;
  readonly payment: EuroAmount;
}

export interface ScheduledAnnualTaxRecord extends AnnualTaxRecord {
  readonly settlementMonthId: MonthId;
  readonly scheduledMonthInHorizon: boolean;
}

export interface SimulationResult {
  readonly configuration?: {
    readonly benefitRules: BenefitRules;
    readonly timelineConventions: TimelineConventions;
    readonly taxProfiles: readonly TaxRules[];
  };
  readonly annualTaxRecords?: readonly ScheduledAnnualTaxRecord[];
  readonly taxComplete?: boolean;
  readonly payrollComplete?: boolean;
  /** Availability under the disclosed calendar/household assumptions, not legal certification. */
  readonly benefitsComplete?: boolean;
  readonly benefitAssessments?: readonly BenefitAssessmentAudit[];
  readonly assumptions?: readonly string[];
  readonly unavailableReasons?: readonly string[];
  /** Scenario identifier (A, B, or C). */
  readonly scenarioKey: ScenarioId;
  /** Chronological array of monthly ledger snapshots (typically 60 or 120 months). */
  readonly months: readonly MonthlyLedgerEntry[];
  /** Aggregated financial KPI summary over the entire simulation horizon. */
  readonly summary: {
    /** Cumulative earned net employment salaries over horizon in EUR. */
    readonly totalSalaries: EuroAmount;
    /** Cumulative state family benefits over horizon in EUR. */
    readonly totalBenefits: EuroAmount;
    /** Cumulative tax return refunds over horizon in EUR. */
    readonly totalTaxRefunds: EuroAmount;
    /** Cumulative grand total net household financial cash flow over horizon in EUR. */
    readonly grandTotal: EuroAmount;
    /** Total maternity protection benefits received under MuSchG in EUR. */
    readonly totalMutterschutz: EuroAmount;
    /** Total parental allowance received by mother under BEEG in EUR. */
    readonly totalWifeElterngeld: EuroAmount;
    /** Total parental allowance received by father under BEEG in EUR. */
    readonly totalHusbandElterngeld: EuroAmount;
    /** Total child benefit received under § 66 EStG in EUR. */
    readonly totalKindergeld: EuroAmount;
    /** Total 13th salary bonus disbursements received in EUR. */
    readonly total13thSalaries: EuroAmount;
  };
}

/** Semantic alias for `MonthlyLedgerEntry` representing a single month on the timeline. */
export type TimelineMonth = MonthlyLedgerEntry;

/** Semantic alias for `SimulationResult` representing the complete multi-year scenario output. */
export type ScenarioTimelineResult = SimulationResult;

/**
 * Itemized German Gross-to-Net Payroll & Statutory Tax Withholding Breakdown.
 * Models statutory income tax (§ 32a EStG), solidarity surcharge (SolzG), social insurance (SGB IV/V/VI/XI),
 * and calculates the clean synthetic net income baseline for Elterngeld under § 2c BEEG.
 */
/** Compact monthly audit record; annual profiles retain the linked statutory parameters. */
export type MonthlyPayrollRecord = Pick<GrossToNetBreakdown,
  "monthlyGross" | "regularNetTakeHome" | "monthlyWageTax" | "monthlySolidaritySurcharge" |
  "monthlyChurchTax" | "healthInsurance" | "pensionInsurance" | "unemploymentInsurance" |
  "careInsurance" | "totalSocialSecurity" | "taxClass" | "payrollLimitations"> & {
    readonly taxRules: Pick<TaxRules, "calendarYear" | "sourceYear" | "projected">;
    readonly bonuses?: readonly BonusPayrollRecord[];
  };

export interface BonusPayrollRecord {
  readonly payrollLimitations?: readonly string[];
  readonly gross: EuroAmount;
  readonly net: EuroAmount;
  readonly wageTax: EuroAmount;
  readonly solidarity: EuroAmount;
  readonly churchTax: EuroAmount;
  readonly health: EuroAmount;
  readonly pension: EuroAmount;
  readonly unemployment: EuroAmount;
  readonly care: EuroAmount;
}

export interface GrossToNetBreakdown {
  /** Unsupported regimes retain provisional amounts, explicitly marked as estimates. */
  readonly payrollLimitations: readonly string[];
  readonly expectedMonthlyEmploymentGross: GrossSalary;
  /** Rule year, sources, projection status, and explicitly marked overrides. */
  readonly taxRules: TaxRules;
  /** Monthly gross employment earnings in EUR. */
  readonly monthlyGross: GrossSalary;
  /** Projected annual gross employment earnings in EUR (monthlyGross * 12). */
  readonly annualGross: GrossSalary;
  /** Statutory wage tax class applied for withholding (§ 38b EStG). */
  readonly taxClass: TaxClass;
  /** Dependent children count used for nursing care insurance discount (§ 55 Abs. 3 SGB XI). */
  readonly childrenCount: ChildrenCount;

  // Itemized Social Insurance Deductions (§§ 20, 55 SGB)
  /** Statutory health insurance employee monthly contribution in EUR (GKV § 241a SGB V). */
  readonly healthInsurance: EuroAmount;
  /** Effective statutory health insurance employee rate (e.g. 7.3% base + 0.85% Zusatzbeitrag = 8.15%). */
  readonly healthInsuranceRate: PercentageRate;
  /** Statutory pension insurance employee monthly contribution in EUR (GRV § 157 SGB VI). */
  readonly pensionInsurance: EuroAmount;
  /** Effective statutory pension insurance employee rate (9.30%). */
  readonly pensionInsuranceRate: PercentageRate;
  /** Statutory unemployment insurance employee monthly contribution in EUR (AV § 341 SGB III). */
  readonly unemploymentInsurance: EuroAmount;
  /** Effective statutory unemployment insurance employee rate (1.30%). */
  readonly unemploymentInsuranceRate: PercentageRate;
  /** Statutory long-term nursing care insurance employee contribution in EUR (PV § 55 SGB XI). */
  readonly careInsurance: EuroAmount;
  /** Effective statutory care insurance employee rate (2.2% base + childless surcharge or child discounts). */
  readonly careInsuranceRate: PercentageRate;
  /** Total statutory social security employee deductions per month in EUR. */
  readonly totalSocialSecurity: EuroAmount;

  // Statutory Wage Taxes (§§ 32a, 38b EStG, SolzG)
  /** Monthly equivalent of the PAP withholding tax base; not an annual tax-return assessment. */
  readonly taxableIncomeZvE: EuroAmount;
  /** Statutory income tax tariff progression zone under § 32a Abs. 1 EStG. */
  readonly wageTaxZone: WageTaxZone;
  /** Monthly wage tax withholding deduction under § 38b EStG in EUR. */
  readonly monthlyWageTax: EuroAmount;
  /** Monthly solidarity surcharge withholding deduction under SolzG 1995 in EUR. */
  readonly monthlySolidaritySurcharge: EuroAmount;
  readonly monthlyChurchTax: EuroAmount;
  readonly annualWithholdingTaxBase: EuroAmount;
  /** Total monthly statutory tax withholding deduction in EUR (wage tax + solidarity surcharge). */
  readonly totalTaxWithholding: EuroAmount;
  /** Statutory income tax factor under § 39f EStG (Faktorverfahren) if applied. */
  readonly taxFactor?: TaxFactor;

  // Non-Recurrent Bonus Accounting (§ 39b Abs. 3 EStG)
  /** One-off special bonus gross payment in EUR (Sonstige Bezüge) if present in payroll period. */
  readonly oneOffBonusAmount?: EuroAmount;
  /** Additional differential wage tax deduction assessed on the one-off bonus payment in EUR. */
  readonly bonusTaxDeduction?: EuroAmount;
  readonly bonusSocialSecurity: EuroAmount;
  readonly bonusWageTax: EuroAmount;
  readonly bonusSolidaritySurcharge: EuroAmount;
  readonly bonusChurchTax: EuroAmount;
  readonly bonusNetTakeHome: EuroAmount;

  // Final Net Take-Home & Elterngeld Synthetic Net
  /** Actual post-withholding monthly take-home net salary in EUR. */
  readonly monthlyNetTakeHome: NetSalary;
  /** @deprecated Compatibility alias for regular payroll net, not a BEEG assessment. */
  readonly elterngeldSyntheticNet: NetSalary;
  readonly regularNetTakeHome: NetSalary;
  readonly assumptions: readonly string[];
  /** Effective monthly income tax withholding rate as a percentage of gross. */
  readonly effectiveTaxRatePercent: PercentageRate;
  /** Effective total statutory deduction rate (taxes + social insurance) as a percentage of gross. */
  readonly effectiveTotalDeductionRatePercent: PercentageRate;
  /** Primary statutory legal citation for the gross-to-net computation. */
  readonly statutoryCitation: StatutoryCitation;
}

/**
 * Statutory Child Allowance Favorability Assessment Result (§ 31, § 32 Abs. 6 EStG Günstigerprüfung).
 * Automatically compares tax savings from the full child allowance (Kinderfreibetrag + BEA)
 * against total Kindergeld received, crediting any excess tax savings to the annual tax refund.
 */
export interface GuenstigerpruefungResult {
  /** Combined spousal annual taxable income (ZvE) in EUR. */
  readonly jointAnnualZvE: EuroAmount;
  /** Total statutory child allowance deduction assessed in EUR (9.540 €/child/yr, prorated in birth year). */
  readonly totalKinderfreibetrag: EuroAmount;
  /** Joint tax liability under splitting tariff without child allowance deduction in EUR. */
  readonly jointTaxWithoutAllowance: EuroAmount;
  /** Joint tax liability under splitting tariff after deducting Kinderfreibetrag in EUR. */
  readonly jointTaxWithAllowance: EuroAmount;
  /** Gross income tax reduction achieved by applying the child tax allowance in EUR. */
  readonly taxSavingsFromAllowance: EuroAmount;
  /** Total statutory Kindergeld child benefits received for the children during the calendar year in EUR. */
  readonly totalKindergeldReceived: EuroAmount;
  /** Net additional tax refund resulting from favorable Kinderfreibetrag over Kindergeld in EUR. */
  readonly extraTaxRefund: EuroAmount;
  /** Boolean flag indicating whether Kinderfreibetrag provided greater financial benefit than Kindergeld. */
  readonly isKinderfreibetragFavorable: boolean;
  /** Statutory legal citation for the favorability assessment. */
  readonly statutoryCitation: StatutoryCitation;
}

/**
 * Complete Spousal Household Gross-to-Net Precomputed Matrix.
 * Contains pre-calculated net salary combinations across all tax bracket pairings (III/V, V/III, IV/IV, IV+Factor)
 * for both full-time and post-birth part-time employment configurations.
 */
export interface SpousalGrossToNetSet {
  /** Husband's regular full-time monthly gross salary in EUR. */
  readonly husbandGross: GrossSalary;
  /** Husband's net take-home salary in Tax Class III (Sole earner advantage) in EUR. */
  readonly husbandClass3Net: NetSalary;
  /** Husband's net take-home salary in Tax Class V (Secondary earner withholding) in EUR. */
  readonly husbandClass5Net: NetSalary;
  /** Husband's net take-home salary in standard Tax Class IV in EUR. */
  readonly husbandClass4Net: NetSalary;
  /** Husband's net take-home salary in Tax Class IV with § 39f EStG factor in EUR. */
  readonly husbandClass4WithFactorNet: NetSalary;
  /** Wife's pre-birth full-time monthly gross salary in EUR. */
  readonly wifeGrossFullTime: GrossSalary;
  /** Wife's full-time net take-home salary in Tax Class V in EUR. */
  readonly wifeClass5FullTimeNet: NetSalary;
  /** Wife's full-time net take-home salary in Tax Class III in EUR. */
  readonly wifeClass3FullTimeNet: NetSalary;
  /** Wife's full-time net take-home salary in standard Tax Class IV in EUR. */
  readonly wifeClass4FullTimeNet: NetSalary;
  /** Wife's full-time net take-home salary in Tax Class IV with § 39f EStG factor in EUR. */
  readonly wifeClass4WithFactorNet: NetSalary;
  /** Wife's post-birth part-time monthly gross salary in EUR. */
  readonly wifeGrossPartTime: GrossSalary;
  /** Wife's part-time net take-home salary in Tax Class V in EUR. */
  readonly wifeClass5PartTimeNet: NetSalary;
  /** Wife's part-time net take-home salary in Tax Class III in EUR. */
  readonly wifeClass3PartTimeNet: NetSalary;
  /** Wife's part-time net take-home salary in standard Tax Class IV in EUR. */
  readonly wifeClass4PartTimeNet: NetSalary;
  /** Wife's part-time net take-home salary in Tax Class IV with § 39f EStG factor in EUR. */
  readonly wifeClass4WithFactorPartTimeNet: NetSalary;
  /** Statutory married couple income tax factor under § 39f EStG. */
  readonly taxFactor: TaxFactor;
  /** Wife's post-birth weekly part-time employment hours (e.g. 24h..32h). */
  readonly wifePartTimeWeeklyHours: WorkingHours;
  /** Husband's regular weekly full-time employment hours (e.g. 40h). */
  readonly husbandWeeklyHours: WorkingHours;
  /** Comprehensive itemized payroll breakdown for husband in Tax Class III. */
  readonly husbandBreakdownClass3: GrossToNetBreakdown;
  /** Comprehensive itemized payroll breakdown for husband in Tax Class V. */
  readonly husbandBreakdownClass5: GrossToNetBreakdown;
  /** Comprehensive itemized payroll breakdown for wife full-time in Tax Class V. */
  readonly wifeBreakdownClass5FT: GrossToNetBreakdown;
  /** Comprehensive itemized payroll breakdown for wife full-time in Tax Class III. */
  readonly wifeBreakdownClass3FT: GrossToNetBreakdown;
}

// ============================================================================
// 9. Discrete Batch Action Architecture Types (Rule 16)
// ============================================================================

/**
 * Batch 0: Preexisting Baseline Financial & Household Conditions.
 * Defines the initial state of the household prior to any pregnancy or timeline milestone events.
 */
/** Supplied household taxable income for BEEG section 1(8), including EStG section 2(5a) adjustments. */
export interface HouseholdTaxableIncomeInput {
  readonly calendarYear: FullCalendarYear;
  readonly taxableIncome: EuroAmount;
}

export interface PreexistingConditions {
  readonly householdTaxableIncome?: readonly HouseholdTaxableIncomeInput[];
  readonly timelineConventions?: TimelineConventions;
  /** Explicit planning assumption; never converts payroll take-home into verified BEEG net. */
  readonly assumeManualNetIsAssessmentNet?: boolean;
  readonly husbandPayrollOptions?: PayrollOptions;
  readonly wifePayrollOptions?: PayrollOptions;
  /** Validated benefit rules; omitted uses the source-linked statutory defaults. */
  readonly benefitRules?: BenefitRules;
  /** 4-digit Gregorian calendar year for simulation start (e.g. 2025). */
  readonly startCalendarYear: FullCalendarYear;
  /** 1-based Gregorian calendar month for simulation start (1..12). */
  readonly startCalendarMonth: CalendarMonth;
  /** Total duration of simulation horizon in months (e.g. 60 or 120). */
  readonly simulationDurationMonths: MonthDuration;
  /** Salary input mode selection (GROSS vs NET). */
  readonly salaryInputMode?: SalaryInputMode;
  /** Salary input frequency selection (MONTHLY vs YEARLY). */
  readonly salaryPeriod?: SalaryPeriod;
  /** Husband's regular monthly gross salary in EUR. */
  readonly husbandGross?: GrossSalary;
  /** Wife's pre-birth regular monthly gross salary in EUR. */
  readonly wifeGross?: GrossSalary;
  /** Husband's starting tax class at simulation commencement (e.g. TaxClass.III or IV). */
  readonly husbandInitialTaxClass: TaxClass;
  /** Husband's starting monthly net take-home salary in Tax Class III in EUR. */
  readonly husbandInitialNet: NetSalary;
  /** Husband's monthly net take-home salary in Tax Class V in EUR. */
  readonly husbandInitialClass5Net: NetSalary;
  /** Husband's monthly net take-home salary in Tax Class IV in EUR. */
  readonly husbandInitialClass4Net?: NetSalary;
  /** Husband's regular weekly working hours (e.g. 40h). */
  readonly husbandWeeklyHours: WorkingHours;
  /** Total annual salaries for husband (12, 13, 14, or 15). */
  readonly husbandSalariesCount?: AnnualSalariesCount;
  /** Husband's custom or preset bonus installment distribution schedule across calendar months. */
  readonly husbandBonusDistribution?: readonly SalaryBonusSlot[];
  /** Wife's starting tax class at simulation commencement (e.g. TaxClass.V or IV). */
  readonly wifeInitialTaxClass: TaxClass;
  /** Wife's full-time starting monthly net take-home salary in Tax Class V in EUR. */
  readonly wifeInitialFullTimeNet: NetSalary;
  /** Wife's full-time monthly net take-home salary in Tax Class III in EUR. */
  readonly wifeInitialClass3FullTimeNet: NetSalary;
  /** Wife's full-time monthly net take-home salary in Tax Class IV in EUR. */
  readonly wifeInitialClass4FullTimeNet?: NetSalary;
  /** Wife's post-birth part-time monthly net take-home salary in Tax Class V in EUR. */
  readonly wifeInitialPartTimeClass5Net: NetSalary;
  /** Wife's post-birth part-time monthly net take-home salary in Tax Class III in EUR. */
  readonly wifeInitialPartTimeClass3Net: NetSalary;
  /** Wife's post-birth part-time monthly net take-home salary in Tax Class IV in EUR. */
  readonly wifeInitialPartTimeClass4Net?: NetSalary;
  /** Wife's pre-birth full-time weekly working hours (e.g. 40h). */
  readonly wifeWeeklyHours: WorkingHours;
  /** Wife's default post-birth part-time weekly working hours (e.g. 24h..32h). */
  readonly wifePostBirthWeeklyHours?: WorkingHours;
  /** Total annual salaries for wife (12, 13, 14, or 15). */
  readonly wifeSalariesCount?: AnnualSalariesCount;
  /** Wife's custom or preset bonus installment distribution schedule across calendar months. */
  readonly wifeBonusDistribution?: readonly SalaryBonusSlot[];
  /** Boolean flag enabling the § 39f EStG factor method for Tax Class IV. */
  readonly initialUseTaxFactor?: boolean;
  /** Initial statutory income tax factor ratio (0.000..1.000). */
  readonly initialTaxFactor?: TaxFactor;
  /** Annual bonus gross salary payment in EUR if applicable. */
  readonly annualBonusGross?: EuroAmount;
  /** Month in which the annual bonus is disbursed (1..12). */
  readonly annualBonusMonth?: CalendarMonth;
  /** Recurring monthly investment or capital income in EUR. */
  readonly investmentReturnMonthly?: EuroAmount;
  /** Count of older existing children already in the household at simulation start. */
  readonly existingChildrenCount: ChildrenCount;
  /** Monthly statutory child benefit amount per child under § 66 EStG (e.g. 259 €). */
  readonly kindergeldPerChild: EuroAmount;
  /** Boolean toggle enabling 13th salary bonus payments (legacy compatibility). */
  readonly enable13thSalary?: boolean;
  /** Calendar month in which the 40% mid-year vacation bonus is disbursed (legacy compatibility). */
  readonly bonus40Month?: CalendarMonth;
  /** Calendar month in which the 60% year-end Christmas bonus is disbursed (legacy compatibility). */
  readonly bonus60Month?: CalendarMonth;
  /** Calendar month in which annual income tax reconciliation refund is disbursed (e.g. May = 5). */
  readonly taxReturnMonth: CalendarMonth;
}

/**
 * Batch 1: Pregnancy Positive Timeline & Parental Leave Milestone Action.
 * Defines positive test timing, calculated delivery date, and parental leave working schedule.
 */
export interface PregnancyAction {
  /** Unique pregnancy milestone action identifier (e.g. 'PREG-CHILD-1'). */
  readonly pregnancyId: PregnancyId;
  /** Ordinal index of the expected child (1=First child, 2=Second child, ...). */
  readonly childIndex: ChildIndex;
  /** 1-based Gregorian calendar month of the positive pregnancy test (1..12). */
  readonly positiveTestCalendarMonth: CalendarMonth;
  /** 4-digit Gregorian calendar year of the positive pregnancy test (e.g. 2026). */
  readonly positiveTestCalendarYear: FullCalendarYear;
  /** 1-based simulation month index when pregnancy is positively confirmed. */
  readonly positiveTestSimulationMonth: SimulationMonth;
  /** Calculated delivery simulation month (positiveTestSimulationMonth + 8 months gestation). */
  readonly calculatedDeliverySimulationMonth: SimulationMonth;
  /** Mother's weekly employment hours during part-time parental leave (max 32h/week under § 1 BEEG). */
  readonly motherPostBirthPartTimeHours: WorkingHours;
  /** Mother's part-time monthly net take-home salary in Tax Class V in EUR. */
  readonly motherPostBirthPartTimeClass5Net: NetSalary;
  /** Mother's part-time monthly net take-home salary in Tax Class III in EUR. */
  readonly motherPostBirthPartTimeClass3Net: NetSalary;
  /** Ordinary father's Plus payment months (legacy default four); excludes partnership-bonus months. */
  readonly fatherPartnerMonthsCount: MonthDuration;
}

/**
 * Batch 2: Proactive Spousal Tax Class Switch Milestone Action.
 * Implements § 2b Abs. 1 Satz 3 BEEG optimization (switching mother to Tax Class III to boost Elterngeld).
 */
export interface TaxClassSwitchAction {
  /** Unique tax switch milestone action identifier (e.g. 'SWAP-PREG-1'). */
  readonly switchId: SwitchId;
  /** Simulation month in which the tax class modification becomes legally effective. */
  readonly effectiveSimulationMonth: SimulationMonth;
  /** Calendar month when the switch becomes effective (1..12). */
  readonly effectiveCalendarMonth: CalendarMonth;
  /** Calendar year when the switch becomes effective (e.g. 2026). */
  readonly effectiveCalendarYear: FullCalendarYear;
  /** Target tax class assigned to husband (e.g. TaxClass.V). */
  readonly targetHusbandTaxClass: TaxClass;
  /** Target tax class assigned to wife (e.g. TaxClass.III to maximize pre-birth assessment net). */
  readonly targetWifeTaxClass: TaxClass;
  /** Boolean flag enabling the § 39f EStG factor for target configuration. */
  readonly targetUseTaxFactor?: boolean;
  /** Target statutory income tax factor ratio. */
  readonly targetTaxFactor?: TaxFactor;
  /** Tax class to restore husband to after parental allowance assessment window closes. */
  readonly revertHusbandTaxClass?: TaxClass;
  /** Tax class to restore wife to after parental allowance assessment window closes. */
  readonly revertWifeTaxClass?: TaxClass;
  /** Boolean flag enabling factor method upon reversion. */
  readonly revertUseTaxFactor?: boolean;
  /** Statutory legal justification rationale for the tax class switch. */
  readonly statutoryReason: string;
  /** Simulation month in which tax classes revert to standard configuration. */
  readonly revertSimulationMonth?: SimulationMonth;
}

/**
 * Batch 3: Career Advancement & Salary Raise Milestone Action.
 * Adjusts spousal gross or net compensation effective from a specified simulation month.
 */
export interface SalaryRaiseAction {
  /** Unique salary raise milestone action identifier (e.g. 'RAISE-HUSBAND-1'). */
  readonly raiseId: RaiseId;
  /** Simulation month when the salary increase takes effect. */
  readonly effectiveSimulationMonth: SimulationMonth;
  /** Calendar month when the salary increase takes effect (1..12). */
  readonly effectiveCalendarMonth: CalendarMonth;
  /** Calendar year when the salary increase takes effect (e.g. 2027). */
  readonly effectiveCalendarYear: FullCalendarYear;
  /** Target spouse receiving the salary increase (HUSBAND, WIFE, or BOTH). */
  readonly targetPerson: TargetPerson;
  /** Percentage raise applied to existing compensation (e.g. 0.05 for +5%). */
  readonly percentageIncrease?: PercentageRate;
  /** New regular monthly gross at the initial contractual hours, before hours prorating. */
  readonly newHusbandGross?: GrossSalary;
  /** New regular monthly gross at the initial contractual hours, before hours prorating. */
  readonly newWifeGross?: GrossSalary;
  /** Husband's updated monthly net salary in Tax Class III in EUR. */
  readonly newHusbandClass3Net?: NetSalary;
  /** Husband's updated monthly net salary in Tax Class V in EUR. */
  readonly newHusbandClass5Net?: NetSalary;
  /** Wife's updated full-time monthly net salary in Tax Class V in EUR. */
  readonly newWifeClass5FTNet?: NetSalary;
  /** Wife's updated full-time monthly net salary in Tax Class III in EUR. */
  readonly newWifeClass3FTNet?: NetSalary;
  /** Wife's updated part-time monthly net salary in Tax Class V in EUR. */
  readonly newWifeClass5PTNet?: NetSalary;
  /** Wife's updated part-time monthly net salary in Tax Class III in EUR. */
  readonly newWifeClass3PTNet?: NetSalary;
  /** Business or career rationale explaining the raise. */
  readonly reason: string;
}

/**
 * Batch 3: Contractual Working Hours & Schedule Adjustment Action.
 * Adjusts weekly employment hours for a spouse effective from a specified simulation month.
 */
export interface WorkingHoursChangeAction {
  /** Unique working hours adjustment action identifier (e.g. 'HOURS-WIFE-1'). */
  readonly changeId: HoursChangeId;
  /** Simulation month when the working hours adjustment takes effect. */
  readonly effectiveSimulationMonth: SimulationMonth;
  /** Calendar month when the working hours adjustment takes effect (1..12). */
  readonly effectiveCalendarMonth: CalendarMonth;
  /** Calendar year when the working hours adjustment takes effect (e.g. 2028). */
  readonly effectiveCalendarYear: FullCalendarYear;
  /** Target spouse whose working hours are adjusted (HUSBAND, WIFE, or BOTH). */
  readonly targetPerson: TargetPerson;
  /** New weekly contractual working hours (0..60 hours/week). */
  readonly weeklyHours: WorkingHours;
  /** Rationale explaining the schedule adjustment (e.g. returning from parental leave). */
  readonly reason: string;
}

/**
 * Batch 4: Financial Events Action (One-Off Expenses, Grants, Capital Outflows & Inflows).
 * Injects discrete one-time or milestone cash flows into the timeline ledger.
 */
export interface FinancialEventAction {
  /** Unique financial event action identifier (e.g. 'FEVENT-EQUIP-1'). */
  readonly eventId: FinancialEventId;
  /** Simulation month in which the financial cash flow occurs. */
  readonly effectiveSimulationMonth: SimulationMonth;
  /** Calendar month in which the financial cash flow occurs (1..12). */
  readonly effectiveCalendarMonth: CalendarMonth;
  /** Calendar year in which the financial cash flow occurs (e.g. 2026). */
  readonly effectiveCalendarYear: FullCalendarYear;
  /** User-facing financial event title header. */
  readonly title: string;
  /** Exact EUR cash flow amount (positive for income/grants, negative for costs/expenses). */
  readonly amount: EuroAmount;
  /** Event classification category. */
  readonly category: FinancialEventCategory;
  /** Detailed description and purpose of the expenditure or inflow. */
  readonly description: string;
  /** Optional scenario restriction filter (e.g. applies only to Scenario C). */
  readonly appliesToScenarios?: readonly ScenarioId[];
}

/**
 * Combined Scenario Action Batches Payload Container.
 * Encapsulates the complete input specification required to execute a deterministic timeline simulation.
 */
export interface ScenarioActionBatches {
  /** Target scenario key (ScenarioId.A, B, or C). */
  readonly scenarioKey: ScenarioId;
  /** Batch 0 baseline preexisting household parameters. */
  readonly preexisting: PreexistingConditions;
  /** Batch 1 pregnancy timeline and parental leave actions. */
  readonly pregnancies: readonly PregnancyAction[];
  /** Batch 2 proactive spousal tax class optimization actions. */
  readonly taxClassSwitches: readonly TaxClassSwitchAction[];
  /** Batch 3 salary raise and compensation adjustment actions. */
  readonly salaryRaises: readonly SalaryRaiseAction[];
  /** Optional Batch 3 working hours adjustment actions. */
  readonly workingHoursChanges?: readonly WorkingHoursChangeAction[];
  /** Optional Batch 4 discrete financial expense and income actions. */
  readonly financialEvents?: readonly FinancialEventAction[];
}

// ============================================================================
// 10. User Data Export & Import Envelopes
// ============================================================================

/** Supported data serialization and export document formats. */
export const ExportFormat = {
  Json: "JSON",
  Text: "TEXT",
  Pdf: "PDF",
  Zip: "ZIP",
  Csv: "CSV",
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

/**
 * Validates and casts an arbitrary string into a strongly-typed `ExportFormat`.
 * @throws {TypeError} if input does not match a valid export format.
 */
export function toExportFormat(val: string): ExportFormat {
  const values = Object.values(ExportFormat) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExportFormat: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExportFormat;
}

/** Metadata envelope header embedded in exported simulator state files. */
export interface SimulationExportMetadata {
  /** Schema serialization version number. */
  readonly version: number;
  /** ISO-8601 UTC timestamp when export was generated. */
  readonly exportedAt: string;
  /** Application generator identification string. */
  readonly application: string;
  /** File format specifier. */
  readonly format: ExportFormat;
  /** Optional cryptographic checksum hash for data integrity verification. */
  readonly checksum?: string;
}

/** Top-level data portability envelope containing metadata and persisted simulation state. */
export interface SimulationExportEnvelope<TState = unknown> {
  /** Export metadata header. */
  readonly metadata: SimulationExportMetadata;
  /** Serialized simulator state payload. */
  readonly simulationState: TState;
}

/** Successful state validation result returned when importing user data. */
export interface ImportValidationSuccess<TState> {
  /** Discriminator flag confirming success. */
  readonly success: true;
  /** Sanitized, strongly-typed simulator state. */
  readonly state: TState;
  /** Informational migration warnings or non-fatal schema adjustments. */
  readonly warnings: readonly string[];
}

/** Failed state validation result returned when imported data is corrupted or invalid. */
export interface ImportValidationFailure {
  /** Discriminator flag confirming failure. */
  readonly success: false;
  /** Primary human-readable validation error message. */
  readonly error: string;
  /** Detailed list of specific property errors or structural discrepancies. */
  readonly details?: readonly string[];
}

/** Polymorphic result type returned by data import validation functions. */
export type ImportValidationResult<TState> =
  ImportValidationSuccess<TState> | ImportValidationFailure;
