/**
 * Nominal Brand Type Primitive
 * Enforces nominal typing in TypeScript to prevent unit confusion and compiler-time discrepancies.
 */
export type Brand<K, T> = K & { readonly __brand: T };

// Temporal & Timeline Nominal Types
export type SimulationMonth = Brand<number, 'SimulationMonth'>; // M1..M60
export type CalendarYear = Brand<number, 'CalendarYear'>;       // Y1..Y5
export type CalendarMonth = Brand<number, 'CalendarMonth'>;     // M1..M12 (1=Jan, 12=Dec)
export type WorkingHours = Brand<number, 'WorkingHours'>;       // e.g. 24, 32, 40

// Monetary Nominal Types
export type EuroAmount = Brand<number, 'EuroAmount'>;           // Exact EUR rounded/scaled
export type EuroCents = Brand<number, 'EuroCents'>;             // Integer cents (1 EUR = 100 cents)
export type GrossSalary = Brand<number, 'GrossSalary'>;         // Pre-tax gross salary in EUR
export type NetSalary = Brand<number, 'NetSalary'>;             // Post-withholding net salary in EUR

// Tax & Legal Categorization Enums (Strict Const Enums)
export const TaxClass = {
  I: 'I',
  II: 'II',
  III: 'III',
  IV: 'IV',
  V: 'V',
  VI: 'VI'
} as const;
export type TaxClass = (typeof TaxClass)[keyof typeof TaxClass];

export const ScenarioId = {
  A: 'A',
  B: 'B',
  C: 'C'
} as const;
export type ScenarioId = (typeof ScenarioId)[keyof typeof ScenarioId];

export type StatutoryCitation = Brand<string, 'StatutoryCitation'>;
export type TransactionId = Brand<string, 'TransactionId'>;
export type EventId = Brand<string, 'EventId'>;

// Special Life & Accounting Event Enums (Strict Const Enums)
export const SpecialEventType = {
  Bonus40: 'bonus_40',
  Bonus60: 'bonus_60',
  TaxReturn: 'tax_return'
} as const;
export type SpecialEventType = (typeof SpecialEventType)[keyof typeof SpecialEventType];

export const SpecialEventCategory = {
  ThirteenthSalary: '13th Salary (*13. Monatsgehalt*)',
  TaxOffice: 'Tax Office (*Finanzamt*)'
} as const;
export type SpecialEventCategory = (typeof SpecialEventCategory)[keyof typeof SpecialEventCategory];

// Accounting Transaction Enums (Strict Const Enums)
export const TransactionType = {
  SalaryBase: 'SALARY_BASE',
  SalaryBonus13thVacation: 'SALARY_BONUS_13TH_VACATION',
  SalaryBonus13thChristmas: 'SALARY_BONUS_13TH_CHRISTMAS',
  BenefitMutterschutz: 'BENEFIT_MUTTERSCHUTZ',
  BenefitElterngeldPlusMother: 'BENEFIT_ELTERNGELD_PLUS_MOTHER',
  BenefitElterngeldPlusFather: 'BENEFIT_ELTERNGELD_PLUS_FATHER',
  BenefitPartnerschaftsbonus: 'BENEFIT_PARTNERSCHAFTSBONUS',
  BenefitKindergeld: 'BENEFIT_KINDERGELD',
  TaxReconciliationRefund: 'TAX_RECONCILIATION_REFUND'
} as const;
export type TransactionType = (typeof TransactionType)[keyof typeof TransactionType];

export const TransactionDirection = {
  Inflow: 'INFLOW',
  Outflow: 'OUTFLOW'
} as const;
export type TransactionDirection = (typeof TransactionDirection)[keyof typeof TransactionDirection];

// Type Constructors & Validation Helpers
export function toSimulationMonth(val: number): SimulationMonth {
  if (!Number.isInteger(val) || val < 1 || val > 120) {
    throw new TypeError(`Invalid SimulationMonth: ${val}. Must be integer between 1 and 120.`);
  }
  return val as SimulationMonth;
}

export function toCalendarYear(val: number): CalendarYear {
  if (!Number.isInteger(val) || val < 1 || val > 10) {
    throw new TypeError(`Invalid CalendarYear: ${val}. Must be integer between 1 and 10.`);
  }
  return val as CalendarYear;
}

export function toCalendarMonth(val: number): CalendarMonth {
  if (!Number.isInteger(val) || val < 1 || val > 12) {
    throw new TypeError(`Invalid CalendarMonth: ${val}. Must be integer between 1 and 12.`);
  }
  return val as CalendarMonth;
}

export function toWorkingHours(val: number): WorkingHours {
  if (typeof val !== 'number' || val < 0 || val > 60) {
    throw new TypeError(`Invalid WorkingHours: ${val}. Must be between 0 and 60.`);
  }
  return val as WorkingHours;
}

export function toEuroAmount(val: number): EuroAmount {
  if (typeof val !== 'number' || Number.isNaN(val)) {
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
  if (typeof val !== 'number' || val < 0) {
    throw new TypeError(`Invalid GrossSalary: ${val}. Must be non-negative.`);
  }
  return Math.round(val) as GrossSalary;
}

export function toNetSalary(val: number): NetSalary {
  if (typeof val !== 'number' || val < 0) {
    throw new TypeError(`Invalid NetSalary: ${val}. Must be non-negative.`);
  }
  return Math.round(val) as NetSalary;
}

export function toStatutoryCitation(val: string): StatutoryCitation {
  if (!val || typeof val !== 'string') {
    throw new TypeError(`Invalid StatutoryCitation: ${val}. Must be non-empty string.`);
  }
  return val as StatutoryCitation;
}

export function toTransactionId(val: string): TransactionId {
  if (!val || typeof val !== 'string') {
    throw new TypeError(`Invalid TransactionId: ${val}. Must be non-empty string.`);
  }
  return val as TransactionId;
}

export function toEventId(val: string): EventId {
  if (!val || typeof val !== 'string') {
    throw new TypeError(`Invalid EventId: ${val}. Must be non-empty string.`);
  }
  return val as EventId;
}

export function toTaxClass(val: string): TaxClass {
  const values = Object.values(TaxClass) as string[];
  if (!values.includes(val)) {
    throw new TypeError(`Invalid TaxClass: ${val}. Expected one of: ${values.join(', ')}.`);
  }
  return val as TaxClass;
}

export function toScenarioId(val: string): ScenarioId {
  const values = Object.values(ScenarioId) as string[];
  if (!values.includes(val)) {
    throw new TypeError(`Invalid ScenarioId: ${val}. Expected one of: ${values.join(', ')}.`);
  }
  return val as ScenarioId;
}

/**
 * Immutable Accounting Transaction Entry
 */
export interface AccountingTransaction {
  readonly transactionId: TransactionId;
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
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly calendarYearNum: number;
  readonly calendarMonthNum: CalendarMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
  readonly type: SpecialEventType;
  readonly title: string;
  readonly category: SpecialEventCategory;
  readonly statutory: StatutoryCitation;
  readonly taxClassLabel: string;
  readonly amount: EuroAmount;
  readonly description: string;
}

/**
 * Monthly Chronological Ledger State
 */
export interface MonthlyLedgerEntry {
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly monthInYear: CalendarMonth;
  readonly calendarYearNum: number;
  readonly calendarMonthNum: CalendarMonth;
  readonly calendarLabel: string;
  readonly relativeBirthLabel: string;
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
  readonly husbandInitialTaxClass: TaxClass;
  readonly husbandInitialNet: NetSalary;
  readonly husbandInitialClass5Net: NetSalary;
  readonly husbandWeeklyHours: WorkingHours;
  readonly wifeInitialTaxClass: TaxClass;
  readonly wifeInitialFullTimeNet: NetSalary;
  readonly wifeInitialClass3FullTimeNet: NetSalary;
  readonly wifeInitialPartTimeClass5Net: NetSalary;
  readonly wifeInitialPartTimeClass3Net: NetSalary;
  readonly wifeWeeklyHours: WorkingHours;
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
  readonly pregnancyId: string;
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
  readonly switchId: string;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly targetHusbandTaxClass: TaxClass;
  readonly targetWifeTaxClass: TaxClass;
  readonly statutoryReason: string;
  readonly revertSimulationMonth?: SimulationMonth;
}

/**
 * Batch 3: Salary Raises & Career Adjustments
 */
export interface SalaryRaiseAction {
  readonly raiseId: string;
  readonly effectiveSimulationMonth: SimulationMonth;
  readonly effectiveCalendarMonth: CalendarMonth;
  readonly effectiveCalendarYear: number;
  readonly targetPerson: 'husband' | 'wife' | 'both';
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
 * Combined Scenario Action Batches Input
 */
export interface ScenarioActionBatches {
  readonly scenarioKey: ScenarioId;
  readonly preexisting: PreexistingConditions;
  readonly pregnancies: readonly PregnancyAction[];
  readonly taxClassSwitches: readonly TaxClassSwitchAction[];
  readonly salaryRaises: readonly SalaryRaiseAction[];
}
