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

// Tax & Legal Categorization Types
export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
export type ScenarioId = 'A' | 'B' | 'C';
export type StatutoryCitation = Brand<string, 'StatutoryCitation'>;
export type TransactionId = Brand<string, 'TransactionId'>;

// Accounting Transaction Types
export type TransactionType =
  | 'SALARY_BASE'
  | 'SALARY_BONUS_13TH_VACATION'
  | 'SALARY_BONUS_13TH_CHRISTMAS'
  | 'BENEFIT_MUTTERSCHUTZ'
  | 'BENEFIT_ELTERNGELD_PLUS_MOTHER'
  | 'BENEFIT_ELTERNGELD_PLUS_FATHER'
  | 'BENEFIT_PARTNERSCHAFTSBONUS'
  | 'BENEFIT_KINDERGELD'
  | 'TAX_RECONCILIATION_REFUND';

export type TransactionDirection = 'INFLOW' | 'OUTFLOW';

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

/**
 * Immutable Accounting Transaction Entry
 */
export interface AccountingTransaction {
  readonly id: TransactionId;
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
 * Monthly Chronological Ledger State
 */
export interface MonthlyLedgerEntry {
  readonly month: SimulationMonth;
  readonly year: CalendarYear;
  readonly monthInYear: CalendarMonth;
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
