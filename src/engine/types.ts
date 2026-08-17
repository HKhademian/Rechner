/**
 * Nominal Brand Type Primitives with Unique Symbol Discriminators
 * Enforces nominal typing and subtype inheritance hierarchies in TypeScript.
 */
declare const _BRAND_TAG: unique symbol;
declare const _SUB_BRAND_TAG: unique symbol;
declare const _ACTION_SUB_BRAND_TAG: unique symbol;

export type Brand<Base, Tag extends string> = Base & {
  readonly [_BRAND_TAG]: Tag;
};

export type SubBrand<ParentBrand, SubTag extends string> = ParentBrand & {
  readonly [_SUB_BRAND_TAG]: SubTag;
};

export type ActionSubBrand<ParentBrand, SubTag extends string> = ParentBrand & {
  readonly [_ACTION_SUB_BRAND_TAG]: SubTag;
};

// Temporal & Timeline Nominal Types
export type SimulationMonth = Brand<number, "SimulationMonth">; // M1..M120
export type CalendarYear = Brand<number, "CalendarYear">; // Y1..Y10
export type CalendarMonth = Brand<number, "CalendarMonth">; // M1..M12 (1=Jan, 12=Dec)
export type MonthId = SubBrand<EntityId, "MonthId">; // Immutable absolute calendar month identifier (e.g. 'M09.2027')
export type MonthRef = SubBrand<EntityId, "MonthRef">; // Statutory pregnancy-relative month reference (e.g. 'M1 (Pregnancy Positive)', 'M-8', 'M12')
export type MonthSimRef = SubBrand<EntityId, "MonthSimRef">; // Simulation start relative reference (e.g. 'Sim1', 'Sim21', 'Sim60')
export type WorkingHours = Brand<number, "WorkingHours">; // e.g. 24, 32, 40
export type TaxFactor = Brand<number, "TaxFactor">; // § 39f EStG factor ratio (0.001..1.000)

// Monetary Hierarchy (GrossSalary and NetSalary are nominal subtypes of EuroAmount)
export type EuroAmount = Brand<number, "EuroAmount">; // Exact EUR rounded/scaled
export type GrossSalary = SubBrand<EuroAmount, "GrossSalary">; // Pre-tax gross salary in EUR
export type NetSalary = SubBrand<EuroAmount, "NetSalary">; // Post-withholding net salary in EUR
export type KinderfreibetragAnnualAmount = SubBrand<
  EuroAmount,
  "KinderfreibetragAnnualAmount"
>; // Statutory annual child allowance
export type EuroCents = Brand<number, "EuroCents">; // Integer cents (1 EUR = 100 cents)

// Entity & Action Identifier Hierarchy
export type EntityId = Brand<string, "EntityId">;
export type StatutoryCitation = SubBrand<EntityId, "StatutoryCitation">;
export type TransactionId = SubBrand<EntityId, "TransactionId">;
export type EventId = SubBrand<EntityId, "EventId">;

// Discrete Batch Action Identifier Hierarchy (Subtypes of ActionId & EntityId)
export type ActionId = SubBrand<EntityId, "ActionId">;
export type PregnancyId = ActionSubBrand<ActionId, "PregnancyId">;
export type SwitchId = ActionSubBrand<ActionId, "SwitchId">;
export type RaiseId = ActionSubBrand<ActionId, "RaiseId">;
export type HoursChangeId = ActionSubBrand<ActionId, "HoursChangeId">;
export type FinancialEventId = ActionSubBrand<ActionId, "FinancialEventId">;

// Tax & Legal Categorization Enums (Strict Const Enums)
export const TaxClass = {
  I: "I",
  II: "II",
  III: "III",
  IV: "IV",
  V: "V",
  VI: "VI",
} as const;
export type TaxClass = (typeof TaxClass)[keyof typeof TaxClass];

export const ScenarioId = {
  A: "A",
  B: "B",
  C: "C",
} as const;
export type ScenarioId = (typeof ScenarioId)[keyof typeof ScenarioId];

export const ActiveScenarioView = {
  A: ScenarioId.A,
  B: ScenarioId.B,
  C: ScenarioId.C,
  Compare: "compare",
} as const;
export type ActiveScenarioView =
  (typeof ActiveScenarioView)[keyof typeof ActiveScenarioView];

export const TimelineChartMode = {
  StackedBar: "stacked_bar",
  Lines: "lines",
  Area: "area",
  Compare: "compare",
} as const;
export type TimelineChartMode =
  (typeof TimelineChartMode)[keyof typeof TimelineChartMode];

export const TimelineTimeRangeFilter = {
  All: "all",
  Child1: "child1",
  Child2: "child2",
  Post: "post",
} as const;
export type TimelineTimeRangeFilter =
  (typeof TimelineTimeRangeFilter)[keyof typeof TimelineTimeRangeFilter];

// Discrete Batch Action Enums (Strict Const Enums)
export const ActionCategory = {
  Pregnancy: "PREGNANCY",
  TaxSwitch: "TAX_SWITCH",
  SalaryRaise: "SALARY_RAISE",
  WorkingHours: "WORKING_HOURS",
  FinancialEvent: "FINANCIAL_EVENT",
} as const;
export type ActionCategory =
  (typeof ActionCategory)[keyof typeof ActionCategory];

export const ActionType = {
  PregnancyPositive: "PREGNANCY_POSITIVE",
  ChildDelivery: "CHILD_DELIVERY",
  TaxClassSwitchEffective: "TAX_CLASS_SWITCH_EFFECTIVE",
  TaxClassSwitchRevert: "TAX_CLASS_SWITCH_REVERT",
  SalaryRaiseEffective: "SALARY_RAISE_EFFECTIVE",
  WorkingHoursChangeEffective: "WORKING_HOURS_CHANGE_EFFECTIVE",
  FinancialCostOutflow: "FINANCIAL_COST_OUTFLOW",
  FinancialIncomeInflow: "FINANCIAL_INCOME_INFLOW",
} as const;
export type ActionType = (typeof ActionType)[keyof typeof ActionType];

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

export const TargetPerson = {
  Both: "BOTH",
  Husband: "HUSBAND",
  Wife: "WIFE",
} as const;
export type TargetPerson = (typeof TargetPerson)[keyof typeof TargetPerson];

// Special Life & Accounting Event Enums (Strict Const Enums)
export const SpecialEventType = {
  Bonus40: "bonus_40",
  Bonus60: "bonus_60",
  TaxReturn: "tax_return",
  CustomCost: "custom_cost",
  CustomIncome: "custom_income",
} as const;
export type SpecialEventType =
  (typeof SpecialEventType)[keyof typeof SpecialEventType];

export const SpecialEventCategory = {
  ThirteenthSalary: "13th Salary (*13. Monatsgehalt*)",
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

// Accounting Transaction Enums (Strict Const Enums)
export const TransactionType = {
  SalaryBase: "SALARY_BASE",
  SalaryBonus13thVacation: "SALARY_BONUS_13TH_VACATION",
  SalaryBonus13thChristmas: "SALARY_BONUS_13TH_CHRISTMAS",
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

export const TransactionDirection = {
  Inflow: "INFLOW",
  Outflow: "OUTFLOW",
} as const;
export type TransactionDirection =
  (typeof TransactionDirection)[keyof typeof TransactionDirection];

// Ledger Column & Explanation Enums (Strict Const Enums)
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

export const ExplainerRowType = {
  Month: "MONTH",
  Action: "ACTION",
  SpecialEvent: "SPECIAL_EVENT",
} as const;
export type ExplainerRowType =
  (typeof ExplainerRowType)[keyof typeof ExplainerRowType];

export const CliOutputFormat = {
  Table: "table",
  Summary: "summary",
  Milestones: "milestones",
  Json: "json",
} as const;
export type CliOutputFormat =
  (typeof CliOutputFormat)[keyof typeof CliOutputFormat];

export const ThemeMode = {
  Light: "light",
  Dark: "dark",
  System: "system",
} as const;
export type ThemeMode = (typeof ThemeMode)[keyof typeof ThemeMode];

export function toThemeMode(val: string): ThemeMode {
  const values = Object.values(ThemeMode) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ThemeMode: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ThemeMode;
}

// Gross-to-Net & Bonus Architecture Enums (Strict Const Enums)
export const SalaryInputMode = {
  Gross: "GROSS",
  Net: "NET",
} as const;
export type SalaryInputMode =
  (typeof SalaryInputMode)[keyof typeof SalaryInputMode];

export const SalaryPeriod = {
  Monthly: "MONTHLY",
  Yearly: "YEARLY",
} as const;
export type SalaryPeriod = (typeof SalaryPeriod)[keyof typeof SalaryPeriod];

export const WageTaxZone = {
  Zone1Null: "ZONE_1_NULL",
  Zone2Progression1: "ZONE_2_PROGRESSION_1",
  Zone3Progression2: "ZONE_3_PROGRESSION_2",
  Zone4Proportional42: "ZONE_4_PROPORTIONAL_42",
  Zone5Reichensteuer45: "ZONE_5_REICHENSTEUER_45",
} as const;
export type WageTaxZone = (typeof WageTaxZone)[keyof typeof WageTaxZone];

export const BonusTaxMethod = {
  RegularWage: "REGULAR_WAGE",
  SonstigeBezuegeAnnualDiff: "SONSTIGE_BEZUEGE_ANNUAL_DIFF",
} as const;
export type BonusTaxMethod =
  (typeof BonusTaxMethod)[keyof typeof BonusTaxMethod];

// Type Constructors & Validation Helpers
export function toSimulationMonth(val: number): SimulationMonth {
  if (!Number.isInteger(val) || val < 1 || val > 120) {
    throw new TypeError(
      `Invalid SimulationMonth: ${val}. Must be integer between 1 and 120.`,
    );
  }
  return val as SimulationMonth;
}

export function toCalendarYear(val: number): CalendarYear {
  if (!Number.isInteger(val) || val < 1 || val > 10) {
    throw new TypeError(
      `Invalid CalendarYear: ${val}. Must be integer between 1 and 10.`,
    );
  }
  return val as CalendarYear;
}

export function toCalendarMonth(val: number): CalendarMonth {
  if (!Number.isInteger(val) || val < 1 || val > 12) {
    throw new TypeError(
      `Invalid CalendarMonth: ${val}. Must be integer between 1 and 12.`,
    );
  }
  return val as CalendarMonth;
}

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

export function toEuroAmount(val: number): EuroAmount {
  if (typeof val !== "number" || Number.isNaN(val) || !Number.isFinite(val)) {
    throw new TypeError(`Invalid EuroAmount: ${val}. Must be a valid number.`);
  }
  return Math.round(val) as EuroAmount;
}

export function toEuroCents(val: number): EuroCents {
  if (!Number.isInteger(val)) {
    throw new TypeError(`Invalid EuroCents: ${val}. Must be integer cents.`);
  }
  return val as EuroCents;
}

export function toGrossSalary(val: number): GrossSalary {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0
  ) {
    throw new TypeError(`Invalid GrossSalary: ${val}. Must be non-negative.`);
  }
  return Math.round(val) as GrossSalary;
}

export function toNetSalary(val: number): NetSalary {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val < 0
  ) {
    throw new TypeError(`Invalid NetSalary: ${val}. Must be non-negative.`);
  }
  return Math.round(val) as NetSalary;
}

export function toTaxFactor(val: number): TaxFactor {
  if (
    typeof val !== "number" ||
    Number.isNaN(val) ||
    !Number.isFinite(val) ||
    val <= 0 ||
    val > 1
  ) {
    throw new TypeError(
      `Invalid TaxFactor: ${val}. Must be a valid ratio between 0 and 1.0.`,
    );
  }
  return (Math.round(val * 1000) / 1000) as TaxFactor;
}

export function toStatutoryCitation(val: string): StatutoryCitation {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid StatutoryCitation: ${val}. Must be non-empty string.`,
    );
  }
  return val as StatutoryCitation;
}

export function toTransactionId(val: string): TransactionId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid TransactionId: ${val}. Must be non-empty string.`,
    );
  }
  return val as TransactionId;
}

export function toEventId(val: string): EventId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid EventId: ${val}. Must be non-empty string.`);
  }
  return val as EventId;
}

export function toActionId(val: string): ActionId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid ActionId: ${val}. Must be non-empty string.`);
  }
  return val as ActionId;
}

export function toPregnancyId(val: string): PregnancyId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid PregnancyId: ${val}. Must be non-empty string.`,
    );
  }
  return val as PregnancyId;
}

export function toSwitchId(val: string): SwitchId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid SwitchId: ${val}. Must be non-empty string.`);
  }
  return val as SwitchId;
}

export function toRaiseId(val: string): RaiseId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid RaiseId: ${val}. Must be non-empty string.`);
  }
  return val as RaiseId;
}

export function toHoursChangeId(val: string): HoursChangeId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid HoursChangeId: ${val}. Must be non-empty string.`,
    );
  }
  return val as HoursChangeId;
}

export function toFinancialEventId(val: string): FinancialEventId {
  if (!val || typeof val !== "string") {
    throw new TypeError(
      `Invalid FinancialEventId: ${val}. Must be non-empty string.`,
    );
  }
  return val as FinancialEventId;
}

export function toEntityId(val: string): EntityId {
  if (!val || typeof val !== "string") {
    throw new TypeError(`Invalid EntityId: ${val}. Must be non-empty string.`);
  }
  return val as EntityId;
}

/**
 * Constructs an immutable, absolute MonthId from (month, year) numbers or validated 'M<MM>.<YYYY>' string.
 * Examples:
 * - toMonthId(9, 2027) -> 'M09.2027'
 * - toMonthId(1, 2026) -> 'M01.2026'
 * - toMonthId("M09.2027") -> 'M09.2027'
 * - toMonthId("M092027") -> 'M09.2027'
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

export function isMonthId(val: unknown): val is MonthId {
  return typeof val === "string" && /^M(0[1-9]|1[0-2])\.\d{4}$/.test(val);
}

/**
 * Constructs an immutable, nominal MonthRef representing statutory relative month notation
 * anchored to the first pregnancy positive test (M1).
 * Examples:
 * - toMonthRef(12) -> 'M12'
 * - toMonthRef(1, "Pregnancy Positive") -> 'M1 (Pregnancy Positive)'
 * - toMonthRef(-8) -> 'M-8'
 * - toMonthRef(9, "Birth 1") -> 'M9 (Birth 1)'
 * - toMonthRef("M1 (Pregnancy Positive)") -> 'M1 (Pregnancy Positive)'
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

export function isMonthRef(val: unknown): val is MonthRef {
  return typeof val === "string" && /^M-?\d+(\s*\(.*\))?$/i.test(val.trim());
}

/**
 * Constructs an immutable, nominal MonthSimRef representing chronological simulation month reference
 * anchored to simulation start (Sim1..Sim120).
 * Examples:
 * - toMonthSimRef(1) -> 'Sim1'
 * - toMonthSimRef(21) -> 'Sim21'
 * - toMonthSimRef("Sim21") -> 'Sim21'
 * - toMonthSimRef("21") -> 'Sim21'
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

export function isMonthSimRef(val: unknown): val is MonthSimRef {
  return (
    typeof val === "string" && /^Sim([1-9]\d?|1[01]\d|120)$/.test(val.trim())
  );
}

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

// Nominal Subtype Guards
export function isEuroAmount(val: unknown): val is EuroAmount {
  return typeof val === "number" && !Number.isNaN(val);
}

export function isGrossSalary(val: unknown): val is GrossSalary {
  return typeof val === "number" && !Number.isNaN(val) && val >= 0;
}

export function isNetSalary(val: unknown): val is NetSalary {
  return typeof val === "number" && !Number.isNaN(val) && val >= 0;
}

export function isTaxFactor(val: unknown): val is TaxFactor {
  return (
    typeof val === "number" &&
    !Number.isNaN(val) &&
    Number.isFinite(val) &&
    val > 0 &&
    val <= 1
  );
}

export function isActionId(val: unknown): val is ActionId {
  return typeof val === "string" && val.length > 0;
}

export function isPregnancyId(val: unknown): val is PregnancyId {
  return typeof val === "string" && val.startsWith("PREG");
}

export function isSwitchId(val: unknown): val is SwitchId {
  return (
    typeof val === "string" &&
    (val.startsWith("SWAP") || val.startsWith("SWITCH"))
  );
}

export function isRaiseId(val: unknown): val is RaiseId {
  return typeof val === "string" && val.startsWith("RAISE");
}

export function isFinancialEventId(val: unknown): val is FinancialEventId {
  return (
    typeof val === "string" &&
    (val.startsWith("FEVENT") || val.startsWith("FIN-EVENT"))
  );
}

export function toFinancialEventCategory(val: string): FinancialEventCategory {
  const values = Object.values(FinancialEventCategory) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid FinancialEventCategory: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as FinancialEventCategory;
}

export function toActionCategory(val: string): ActionCategory {
  const values = Object.values(ActionCategory) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ActionCategory: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ActionCategory;
}

export function toActionType(val: string): ActionType {
  const values = Object.values(ActionType) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ActionType: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ActionType;
}

export function toTargetPerson(val: string): TargetPerson {
  const values = Object.values(TargetPerson) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TargetPerson: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TargetPerson;
}

export function toTaxClass(val: string): TaxClass {
  const values = Object.values(TaxClass) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TaxClass: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TaxClass;
}

export function toScenarioId(val: string): ScenarioId {
  const values = Object.values(ScenarioId) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ScenarioId: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ScenarioId;
}

export function toActiveScenarioView(val: string): ActiveScenarioView {
  const values = Object.values(ActiveScenarioView) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ActiveScenarioView: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ActiveScenarioView;
}

export function toTimelineChartMode(val: string): TimelineChartMode {
  const values = Object.values(TimelineChartMode) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TimelineChartMode: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TimelineChartMode;
}

export function toTimelineTimeRangeFilter(
  val: string,
): TimelineTimeRangeFilter {
  const values = Object.values(TimelineTimeRangeFilter) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid TimelineTimeRangeFilter: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as TimelineTimeRangeFilter;
}

export function toFieldColumnKey(val: string): FieldColumnKey {
  const values = Object.values(FieldColumnKey) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid FieldColumnKey: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as FieldColumnKey;
}

export function toExplanationFieldKey(val: string): ExplanationFieldKey {
  const values = Object.values(ExplanationFieldKey) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExplanationFieldKey: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExplanationFieldKey;
}

export function toExplainerRowType(val: string): ExplainerRowType {
  const values = Object.values(ExplainerRowType) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExplainerRowType: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExplainerRowType;
}

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

export function toSalaryPeriod(val: string): SalaryPeriod {
  const upper = val.toUpperCase();
  if (upper === "MONTHLY" || upper === "MONTH" || upper === "M")
    return SalaryPeriod.Monthly;
  if (
    upper === "YEARLY" ||
    upper === "YEAR" ||
    upper === "ANNUAL" ||
    upper === "A" ||
    upper === "Y"
  )
    return SalaryPeriod.Yearly;
  throw new TypeError(
    `Invalid SalaryPeriod: ${val}. Expected 'MONTHLY' or 'YEARLY'.`,
  );
}

export function toWageTaxZone(val: string): WageTaxZone {
  const values = Object.values(WageTaxZone) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid WageTaxZone: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as WageTaxZone;
}

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
 * Immutable Accounting Transaction Entry
 */
export interface AccountingTransaction {
  readonly transactionId: TransactionId;
  readonly monthId: MonthId;
  readonly monthRef?: MonthRef;
  readonly monthSimRef?: MonthSimRef;
  readonly relativeMonthLabel?: MonthRef;
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly type: TransactionType;
  readonly direction: TransactionDirection;
  readonly amount: EuroAmount;
  readonly statutoryCitation: StatutoryCitation;
  readonly taxClassLabel: string;
  readonly description: string;
  readonly auditTrail: string;
}

/**
 * Special Event Item Representation (Table sub-row & visual marker)
 */
export interface SpecialEventItem {
  readonly eventId: EventId;
  readonly monthId: MonthId;
  readonly monthRef?: MonthRef;
  readonly monthSimRef?: MonthSimRef;
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly calendarYearNum: number;
  readonly calendarMonthNum: CalendarMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
  readonly relativeMonthLabel?: MonthRef;
  readonly type: SpecialEventType;
  readonly title: string;
  readonly category: SpecialEventCategory;
  readonly statutory: StatutoryCitation;
  readonly taxClassLabel: string;
  readonly amount: EuroAmount;
  readonly description: string;
}

/**
 * Action Milestone Item (Non-value structural event row placed before the triggering month)
 */
export interface ActionRowItem {
  readonly actionId: ActionId;
  readonly monthId: MonthId;
  readonly monthRef?: MonthRef;
  readonly monthSimRef?: MonthSimRef;
  readonly month: SimulationMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
  readonly relativeMonthLabel?: MonthRef;
  readonly title: string;
  readonly description: string;
  readonly category: ActionCategory;
  readonly type: ActionType;
  readonly taxClassLabel?: string;
}

/**
 * Monthly Chronological Ledger State
 */
export interface MonthlyLedgerEntry {
  readonly monthId: MonthId;
  readonly monthRef: MonthRef;
  readonly monthSimRef: MonthSimRef;
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly monthInYear: CalendarMonth;
  readonly calendarYearNum: number;
  readonly calendarMonthNum: CalendarMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
  readonly relativeMonthLabel: MonthRef;
  readonly relativeMonthIndex: number;
  readonly husbandSalary: EuroAmount;
  readonly wifeSalary: EuroAmount;
  readonly mutterschutz: EuroAmount;
  readonly wifeElterngeld: EuroAmount;
  readonly husbandElterngeld: EuroAmount;
  readonly kindergeld: EuroAmount;
  readonly taxRefund: EuroAmount;
  readonly bonus40Amount: EuroAmount;
  readonly bonus60Amount: EuroAmount;
  readonly specialBonusTotal: EuroAmount;
  readonly specialEventsTotal: EuroAmount;
  readonly specialEvents: readonly SpecialEventItem[];
  readonly startingActions?: readonly ActionRowItem[];
  readonly regularMonthlyTotal: EuroAmount;
  readonly monthlyTotal: EuroAmount;
  readonly earnedSalaries: EuroAmount;
  readonly stateBenefits: EuroAmount;
  readonly cumulatedSalaries: EuroAmount;
  readonly cumulatedBenefits: EuroAmount;
  readonly cumulatedTaxRefunds: EuroAmount;
  readonly cumulatedTotal: EuroAmount;
  readonly taxClassLabel: string;
  readonly phaseLabel: string;
  readonly eventTag: string | null;
  readonly eventType: string | null;
  readonly isSwapActive: boolean;
  readonly isMutterschutz: boolean;
  readonly isPartnerschaftsbonus: boolean;
  readonly hasSiblingBonus: boolean;
  readonly transactions: readonly AccountingTransaction[];
}

/**
 * Complete Multi-Year Simulation Result
 */
export interface SimulationResult {
  readonly scenarioKey: ScenarioId;
  readonly months: readonly MonthlyLedgerEntry[];
  readonly summary: {
    readonly totalSalaries: EuroAmount;
    readonly totalBenefits: EuroAmount;
    readonly totalTaxRefunds: EuroAmount;
    readonly grandTotal: EuroAmount;
    readonly totalMutterschutz: EuroAmount;
    readonly totalWifeElterngeld: EuroAmount;
    readonly totalHusbandElterngeld: EuroAmount;
    readonly totalKindergeld: EuroAmount;
    readonly total13thSalaries: EuroAmount;
  };
}

export type TimelineMonth = MonthlyLedgerEntry;
export type ScenarioTimelineResult = SimulationResult;

/**
 * Itemized German Gross-to-Net Payroll & Statutory Tax Breakdown
 */
export interface GrossToNetBreakdown {
  readonly monthlyGross: GrossSalary;
  readonly annualGross: GrossSalary;
  readonly taxClass: TaxClass;
  readonly childrenCount: number;

  // Itemized Social Insurance Deductions (§§ 20, 55 SGB)
  readonly healthInsurance: EuroAmount;
  readonly healthInsuranceRate: number;
  readonly pensionInsurance: EuroAmount;
  readonly pensionInsuranceRate: number;
  readonly unemploymentInsurance: EuroAmount;
  readonly unemploymentInsuranceRate: number;
  readonly careInsurance: EuroAmount;
  readonly careInsuranceRate: number;
  readonly totalSocialSecurity: EuroAmount;

  // Statutory Wage Taxes (§§ 32a, 38b EStG, SolzG)
  readonly taxableIncomeZvE: EuroAmount;
  readonly wageTaxZone: WageTaxZone;
  readonly monthlyWageTax: EuroAmount;
  readonly monthlySolidaritySurcharge: EuroAmount;
  readonly totalTaxWithholding: EuroAmount;
  readonly taxFactor?: TaxFactor; // § 39f EStG (Faktorverfahren)

  // Non-Recurrent Bonus Accounting (§ 39b Abs. 3 EStG)
  readonly oneOffBonusAmount?: EuroAmount;
  readonly bonusTaxDeduction?: EuroAmount;

  // Final Net Take-Home & Elterngeld Synthetic Net
  readonly monthlyNetTakeHome: NetSalary;
  readonly elterngeldSyntheticNet: NetSalary; // § 2c BEEG (Clean baseline excluding non-recurrent bonuses)
  readonly effectiveTaxRatePercent: number;
  readonly effectiveTotalDeductionRatePercent: number;
  readonly statutoryCitation: StatutoryCitation;
}

/**
 * Statutory Child Allowance Favorability Assessment Result (§ 31, § 32 Abs. 6 EStG Günstigerprüfung)
 */
export interface GuenstigerpruefungResult {
  readonly jointAnnualZvE: EuroAmount;
  readonly totalKinderfreibetrag: EuroAmount;
  readonly jointTaxWithoutAllowance: EuroAmount;
  readonly jointTaxWithAllowance: EuroAmount;
  readonly taxSavingsFromAllowance: EuroAmount;
  readonly totalKindergeldReceived: EuroAmount;
  readonly extraTaxRefund: EuroAmount;
  readonly isKinderfreibetragFavorable: boolean;
  readonly statutoryCitation: StatutoryCitation;
}

/**
 * Spousal Household Gross-to-Net Set
 */
export interface SpousalGrossToNetSet {
  readonly husbandGross: GrossSalary;
  readonly husbandClass3Net: NetSalary;
  readonly husbandClass5Net: NetSalary;
  readonly husbandClass4Net: NetSalary;
  readonly husbandClass4WithFactorNet: NetSalary;
  readonly wifeGrossFullTime: GrossSalary;
  readonly wifeClass5FullTimeNet: NetSalary;
  readonly wifeClass3FullTimeNet: NetSalary;
  readonly wifeClass4FullTimeNet: NetSalary;
  readonly wifeClass4WithFactorNet: NetSalary;
  readonly wifeGrossPartTime: GrossSalary;
  readonly wifeClass5PartTimeNet: NetSalary;
  readonly wifeClass3PartTimeNet: NetSalary;
  readonly wifeClass4PartTimeNet: NetSalary;
  readonly wifeClass4WithFactorPartTimeNet: NetSalary;
  readonly taxFactor: TaxFactor;
  readonly wifePartTimeWeeklyHours: WorkingHours;
  readonly husbandWeeklyHours: WorkingHours;
  readonly husbandBreakdownClass3: GrossToNetBreakdown;
  readonly husbandBreakdownClass5: GrossToNetBreakdown;
  readonly wifeBreakdownClass5FT: GrossToNetBreakdown;
  readonly wifeBreakdownClass3FT: GrossToNetBreakdown;
}

// ==========================================
// Discrete Batch Action Architecture Types
// ==========================================

/**
 * Batch 0: Preexisting Baseline Conditions
 */
export interface PreexistingConditions {
  readonly startCalendarYear: number;
  readonly startCalendarMonth: CalendarMonth;
  readonly simulationDurationMonths: number;
  readonly salaryInputMode?: SalaryInputMode;
  readonly salaryPeriod?: SalaryPeriod;
  readonly husbandGross?: GrossSalary;
  readonly wifeGross?: GrossSalary;
  readonly husbandInitialTaxClass: TaxClass;
  readonly husbandInitialNet: NetSalary;
  readonly husbandInitialClass5Net: NetSalary;
  readonly husbandInitialClass4Net?: NetSalary;
  readonly husbandWeeklyHours: WorkingHours;
  readonly wifeInitialTaxClass: TaxClass;
  readonly wifeInitialFullTimeNet: NetSalary;
  readonly wifeInitialClass3FullTimeNet: NetSalary;
  readonly wifeInitialClass4FullTimeNet?: NetSalary;
  readonly wifeInitialPartTimeClass5Net: NetSalary;
  readonly wifeInitialPartTimeClass3Net: NetSalary;
  readonly wifeInitialPartTimeClass4Net?: NetSalary;
  readonly wifeWeeklyHours: WorkingHours;
  readonly wifePostBirthWeeklyHours?: WorkingHours;
  readonly initialUseTaxFactor?: boolean;
  readonly initialTaxFactor?: TaxFactor;
  readonly annualBonusGross?: EuroAmount;
  readonly annualBonusMonth?: CalendarMonth;
  readonly investmentReturnMonthly?: EuroAmount;
  readonly existingChildrenCount: number;
  readonly kindergeldPerChild: EuroAmount;
  readonly enable13thSalary: boolean;
  readonly bonus40Month: CalendarMonth;
  readonly bonus60Month: CalendarMonth;
  readonly taxReturnMonth: CalendarMonth;
}

/**
 * Batch 1: Pregnancy Positive Decisions
 */
export interface PregnancyAction {
  readonly pregnancyId: PregnancyId;
  readonly childIndex: number;
  readonly positiveTestCalendarMonth: CalendarMonth;
  readonly positiveTestCalendarYear: number;
  readonly positiveTestSimulationMonth: SimulationMonth;
  readonly calculatedDeliverySimulationMonth: SimulationMonth;
  readonly motherPostBirthPartTimeHours: WorkingHours;
  readonly motherPostBirthPartTimeClass5Net: NetSalary;
  readonly motherPostBirthPartTimeClass3Net: NetSalary;
  readonly fatherPartnerMonthsCount: number;
}

/**
 * Batch 2: Tax Class Switches
 */
export interface TaxClassSwitchAction {
  readonly switchId: SwitchId;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly targetHusbandTaxClass: TaxClass;
  readonly targetWifeTaxClass: TaxClass;
  readonly targetUseTaxFactor?: boolean;
  readonly targetTaxFactor?: TaxFactor;
  readonly revertHusbandTaxClass?: TaxClass;
  readonly revertWifeTaxClass?: TaxClass;
  readonly revertUseTaxFactor?: boolean;
  readonly statutoryReason: string;
  readonly revertSimulationMonth?: SimulationMonth;
}

/**
 * Batch 3: Salary Raises & Career Adjustments
 */
export interface SalaryRaiseAction {
  readonly raiseId: RaiseId;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly targetPerson: TargetPerson;
  readonly percentageIncrease?: number;
  readonly newHusbandClass3Net?: NetSalary;
  readonly newHusbandClass5Net?: NetSalary;
  readonly newWifeClass5FTNet?: NetSalary;
  readonly newWifeClass3FTNet?: NetSalary;
  readonly newWifeClass5PTNet?: NetSalary;
  readonly newWifeClass3PTNet?: NetSalary;
  readonly reason: string;
}

/**
 * Batch 3: Working Hours & Schedule Adjustments
 */
export interface WorkingHoursChangeAction {
  readonly changeId: HoursChangeId;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly targetPerson: TargetPerson;
  readonly weeklyHours: WorkingHours;
  readonly reason: string;
}

/**
 * Batch 4: Financial Events (One-Off Costs, Expenses, Grants & Extra Income)
 */
export interface FinancialEventAction {
  readonly eventId: FinancialEventId;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly title: string;
  readonly amount: EuroAmount; // Positive = Income/Grant/Bonus, Negative = Expense/Cost
  readonly category: FinancialEventCategory;
  readonly description: string;
  readonly appliesToScenarios?: readonly ScenarioId[];
}

/**
 * Combined Scenario Action Batches Input
 */
export interface ScenarioActionBatches {
  readonly scenarioKey: ScenarioId;
  readonly preexisting: PreexistingConditions;
  readonly pregnancies: readonly PregnancyAction[];
  readonly taxClassSwitches: readonly TaxClassSwitchAction[];
  readonly salaryRaises: readonly SalaryRaiseAction[];
  readonly workingHoursChanges?: readonly WorkingHoursChangeAction[];
  readonly financialEvents?: readonly FinancialEventAction[];
}

// ==========================================
// User Data Export & Import Interfaces
// ==========================================

export const ExportFormat = {
  Json: "JSON",
  Text: "TEXT",
  Pdf: "PDF",
  Zip: "ZIP",
  Csv: "CSV",
} as const;
export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

export function toExportFormat(val: string): ExportFormat {
  const values = Object.values(ExportFormat) as string[];
  if (!values.includes(val)) {
    throw new TypeError(
      `Invalid ExportFormat: ${val}. Expected one of: ${values.join(", ")}.`,
    );
  }
  return val as ExportFormat;
}

export interface SimulationExportMetadata {
  readonly version: number;
  readonly exportedAt: string;
  readonly application: string;
  readonly format: ExportFormat;
  readonly checksum?: string;
}

export interface SimulationExportEnvelope<TState = unknown> {
  readonly metadata: SimulationExportMetadata;
  readonly simulationState: TState;
}

export interface ImportValidationSuccess<TState> {
  readonly success: true;
  readonly state: TState;
  readonly warnings: readonly string[];
}

export interface ImportValidationFailure {
  readonly success: false;
  readonly error: string;
  readonly details?: readonly string[];
}

export type ImportValidationResult<TState> =
  ImportValidationSuccess<TState> | ImportValidationFailure;
