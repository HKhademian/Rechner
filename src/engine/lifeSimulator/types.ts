import {
  type Brand,
  type CalendarMonth,
  type EuroAmount,
  type FullCalendarYear,
  type GrossSalary,
  type MonthId,
  type PercentageRate,
  type SimulationMonth,
  type StatutoryCitation,
  type TaxClass,
  type WorkingHours,
} from "#engine/types";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  type GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";

export type LifeEventId = Brand<string, "LifeEventId">;

export function toLifeEventId(value: string): LifeEventId {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new TypeError("LifeEventId must be a non-empty string.");
  }
  return trimmed as LifeEventId;
}

export const LifePersonKey = {
  Primary: "PRIMARY",
  Partner: "PARTNER",
} as const;
export type LifePersonKey = (typeof LifePersonKey)[keyof typeof LifePersonKey];

export function toLifePersonKey(value: string): LifePersonKey {
  if (!Object.values(LifePersonKey).includes(value as LifePersonKey)) {
    throw new TypeError(`Invalid LifePersonKey: ${value}`);
  }
  return value as LifePersonKey;
}

export const LifeScenarioKey = {
  Planned: "PLANNED",
  Baseline: "BASELINE",
  StressTest: "STRESS_TEST",
} as const;
export type LifeScenarioKey = (typeof LifeScenarioKey)[keyof typeof LifeScenarioKey];

export function toLifeScenarioKey(value: string): LifeScenarioKey {
  if (!Object.values(LifeScenarioKey).includes(value as LifeScenarioKey)) {
    throw new TypeError(`Invalid LifeScenarioKey: ${value}`);
  }
  return value as LifeScenarioKey;
}

export const LifeEventDomain = {
  Career: "CAREER",
  Family: "FAMILY",
  Tax: "TAX",
  HousingAsset: "HOUSING_ASSET",
  ExpenseTravel: "EXPENSE_TRAVEL",
  Residency: "RESIDENCY",
} as const;
export type LifeEventDomain = (typeof LifeEventDomain)[keyof typeof LifeEventDomain];

export function toLifeEventDomain(value: string): LifeEventDomain {
  if (!Object.values(LifeEventDomain).includes(value as LifeEventDomain)) {
    throw new TypeError(`Invalid LifeEventDomain: ${value}`);
  }
  return value as LifeEventDomain;
}

export const LifeEventKind = {
  SalaryRaise: "SALARY_RAISE",
  BonusSchedule: "BONUS_SCHEDULE",
  WorkingHoursChange: "WORKING_HOURS_CHANGE",
  CompanyCar: "COMPANY_CAR",
  CommuterProfile: "COMMUTER_PROFILE",
  JobChange: "JOB_CHANGE",
  JobEnd: "JOB_END",
  SideJob: "SIDE_JOB",
  ChildBirth: "CHILD_BIRTH",
  ChildcareFee: "CHILDCARE_FEE",
  RegionalBenefit: "REGIONAL_BENEFIT",
  TaxClassSwitch: "TAX_CLASS_SWITCH",
  DeductibleExpenses: "DEDUCTIBLE_EXPENSES",
  CapitalIncome: "CAPITAL_INCOME",
  RentChange: "RENT_CHANGE",
  HomePurchase: "HOME_PURCHASE",
  VehiclePurchaseOrLease: "VEHICLE_PURCHASE_OR_LEASE",
  SolarPvInstallation: "SOLAR_PV_INSTALLATION",
  LoanOrDebt: "LOAN_OR_DEBT",
  LivingBudgetChange: "LIVING_BUDGET_CHANGE",
  TravelTrip: "TRAVEL_TRIP",
  OneOffCashflow: "ONE_OFF_CASHFLOW",
  ResidencyMilestone: "RESIDENCY_MILESTONE",
} as const;
export type LifeEventKind = (typeof LifeEventKind)[keyof typeof LifeEventKind];

export function toLifeEventKind(value: string): LifeEventKind {
  if (!Object.values(LifeEventKind).includes(value as LifeEventKind)) {
    throw new TypeError(`Invalid LifeEventKind: ${value}`);
  }
  return value as LifeEventKind;
}

export const TaxBucket = {
  TaxableWage: "TAXABLE_WAGE",
  BenefitInKind: "BENEFIT_IN_KIND",
  WithheldWageTax: "WITHHELD_WAGE_TAX",
  WithheldSoli: "WITHHELD_SOLI",
  WithheldChurchTax: "WITHHELD_CHURCH_TAX",
  SocialSecurity: "SOCIAL_SECURITY",
  ProgressionBenefit32b: "PROGRESSION_BENEFIT_32B",
  TaxExemptInflow: "TAX_EXEMPT_INFLOW",
  Werbungskosten9: "WERBUNGSKOSTEN_9",
  Sonderausgaben10: "SONDERAUSGABEN_10",
  ChildcareDeductible10_1_5: "CHILDCARE_DEDUCTIBLE_10_1_5",
  TaxCredit35a: "TAX_CREDIT_35A",
  CapitalGains: "CAPITAL_GAINS",
  NonTax: "NON_TAX",
} as const;
export type TaxBucket = (typeof TaxBucket)[keyof typeof TaxBucket];

export function toTaxBucket(value: string): TaxBucket {
  if (!Object.values(TaxBucket).includes(value as TaxBucket)) {
    throw new TypeError(`Invalid TaxBucket: ${value}`);
  }
  return value as TaxBucket;
}

export const JobEndCause = {
  EmployerTermination: "EMPLOYER_TERMINATION",
  VoluntaryResignation: "VOLUNTARY_RESIGNATION",
  MutualAgreement: "MUTUAL_AGREEMENT",
  ContractEnd: "CONTRACT_END",
  Sabbatical: "SABBATICAL",
} as const;
export type JobEndCause = (typeof JobEndCause)[keyof typeof JobEndCause];

export function toJobEndCause(value: string): JobEndCause {
  if (!Object.values(JobEndCause).includes(value as JobEndCause)) {
    throw new TypeError(`Invalid JobEndCause: ${value}`);
  }
  return value as JobEndCause;
}

export const ParentalLeavePlanMode = {
  Basis: "BASIS",
  Plus: "PLUS",
  Mixed: "MIXED",
} as const;
export type ParentalLeavePlanMode =
  (typeof ParentalLeavePlanMode)[keyof typeof ParentalLeavePlanMode];

export function toParentalLeavePlanMode(value: string): ParentalLeavePlanMode {
  if (!Object.values(ParentalLeavePlanMode).includes(value as ParentalLeavePlanMode)) {
    throw new TypeError(`Invalid ParentalLeavePlanMode: ${value}`);
  }
  return value as ParentalLeavePlanMode;
}

export const DisasterKind = {
  EmployerTermination: "EMPLOYER_TERMINATION",
  VoluntaryResignation: "VOLUNTARY_RESIGNATION",
  LongTermIllness: "LONG_TERM_ILLNESS",
  PartnerIncomeLoss: "PARTNER_INCOME_LOSS",
  LumpSumEmergency: "LUMP_SUM_EMERGENCY",
  HousingCostShock: "HOUSING_COST_SHOCK",
} as const;
export type DisasterKind = (typeof DisasterKind)[keyof typeof DisasterKind];

export function toDisasterKind(value: string): DisasterKind {
  if (!Object.values(DisasterKind).includes(value as DisasterKind)) {
    throw new TypeError(`Invalid DisasterKind: ${value}`);
  }
  return value as DisasterKind;
}

export const SolvencyVerdict = {
  Resilient: "RESILIENT",
  Tight: "TIGHT",
  Insolvent: "INSOLVENT",
} as const;
export type SolvencyVerdict = (typeof SolvencyVerdict)[keyof typeof SolvencyVerdict];

export function toSolvencyVerdict(value: string): SolvencyVerdict {
  if (!Object.values(SolvencyVerdict).includes(value as SolvencyVerdict)) {
    throw new TypeError(`Invalid SolvencyVerdict: ${value}`);
  }
  return value as SolvencyVerdict;
}

export const LifeDeadlineSeverity = {
  Info: "INFO",
  Warning: "WARNING",
  Critical: "CRITICAL",
} as const;
export type LifeDeadlineSeverity =
  (typeof LifeDeadlineSeverity)[keyof typeof LifeDeadlineSeverity];

export function toLifeDeadlineSeverity(value: string): LifeDeadlineSeverity {
  if (!Object.values(LifeDeadlineSeverity).includes(value as LifeDeadlineSeverity)) {
    throw new TypeError(`Invalid LifeDeadlineSeverity: ${value}`);
  }
  return value as LifeDeadlineSeverity;
}

export const ResidencyMilestoneKind = {
  ResidenceMove: "RESIDENCE_MOVE",
  BlueCardIssued: "BLUE_CARD_ISSUED",
  PermanentResidency18c: "PERMANENT_RESIDENCY_18C",
  Citizenship10StAG: "CITIZENSHIP_10_STAG",
  PermitRenewal: "PERMIT_RENEWAL",
} as const;
export type ResidencyMilestoneKind =
  (typeof ResidencyMilestoneKind)[keyof typeof ResidencyMilestoneKind];

export function toResidencyMilestoneKind(value: string): ResidencyMilestoneKind {
  if (!Object.values(ResidencyMilestoneKind).includes(value as ResidencyMilestoneKind)) {
    throw new TypeError(`Invalid ResidencyMilestoneKind: ${value}`);
  }
  return value as ResidencyMilestoneKind;
}

export const CompanyCarPowertrain = {
  Combustion: "COMBUSTION",
  PlugInHybrid: "PLUG_IN_HYBRID",
  Electric: "ELECTRIC",
} as const;
export type CompanyCarPowertrain =
  (typeof CompanyCarPowertrain)[keyof typeof CompanyCarPowertrain];

export function toCompanyCarPowertrain(value: string): CompanyCarPowertrain {
  if (!Object.values(CompanyCarPowertrain).includes(value as CompanyCarPowertrain)) {
    throw new TypeError(`Invalid CompanyCarPowertrain: ${value}`);
  }
  return value as CompanyCarPowertrain;
}

export const HealthInsuranceKind = {
  PublicGkv: "PUBLIC_GKV",
  PrivatePkv: "PRIVATE_PKV",
} as const;
export type HealthInsuranceKind =
  (typeof HealthInsuranceKind)[keyof typeof HealthInsuranceKind];

export function toHealthInsuranceKind(value: string): HealthInsuranceKind {
  if (!Object.values(HealthInsuranceKind).includes(value as HealthInsuranceKind)) {
    throw new TypeError(`Invalid HealthInsuranceKind: ${value}`);
  }
  return value as HealthInsuranceKind;
}

export const ResidencyPermitBaseline = {
  CitizenOrEu: "CITIZEN_OR_EU",
  PermanentResidency: "PERMANENT_RESIDENCY",
  EuBlueCard: "EU_BLUE_CARD",
  SkilledWorker18b: "SKILLED_WORKER_18B",
  OtherPermit: "OTHER_PERMIT",
} as const;
export type ResidencyPermitBaseline =
  (typeof ResidencyPermitBaseline)[keyof typeof ResidencyPermitBaseline];

export function toResidencyPermitBaseline(value: string): ResidencyPermitBaseline {
  if (!Object.values(ResidencyPermitBaseline).includes(value as ResidencyPermitBaseline)) {
    throw new TypeError(`Invalid ResidencyPermitBaseline: ${value}`);
  }
  return value as ResidencyPermitBaseline;
}

export interface LifeAdultBaseline {
  readonly personKey: LifePersonKey;
  readonly name: string;
  readonly monthlyGross: GrossSalary;
  readonly weeklyHours: WorkingHours;
  readonly taxClass: TaxClass;
  readonly churchTaxRate: PercentageRate;
  readonly payrollOptions?: PayrollOptions;
  /** Annual salary payments cadence (12, 13, or 14; defaults to 12). */
  readonly annualSalariesCount?: number;
  readonly healthInsuranceKind?: HealthInsuranceKind;
  /** Total GKV Zusatzbeitrag rate (e.g. 0.025 for 2.5%). */
  readonly healthSupplementRate?: PercentageRate;
  /** Employee monthly PKV premium in EUR when healthInsuranceKind is PrivatePkv. */
  readonly privateHealthMonthlyEur?: EuroAmount;
  /** Employment contract notice period in months (used for disaster planning). */
  readonly contractNoticeMonths?: number;
  /** Years with current employer (auto-estimates § 1a KSchG severance on layoff). */
  readonly tenureYears?: number;
  /** True for regular ALG I-insured employees; false for self-employed / Geschäftsführer. */
  readonly alg1Insured?: boolean;
}

export interface LifeHouseholdBaseline {
  readonly startCalendarYear: FullCalendarYear;
  readonly startCalendarMonth: CalendarMonth;
  readonly horizonMonths: number;
  readonly taxReturnMonth: CalendarMonth;
  readonly federalState?: GermanFederalState;
  readonly isMarriedJointAssessment: boolean;
  readonly priorChildrenCount: number;
  readonly openingLiquidCash: EuroAmount;
  readonly emergencyBufferMonths: number;
  readonly openingAssetsValue: EuroAmount;
  readonly openingInvestmentsValue?: EuroAmount;
  readonly annualInvestmentReturnRate?: PercentageRate;
  readonly openingDebtBalance: EuroAmount;
  readonly openingDebtMonthlyPayment?: EuroAmount;
  readonly openingDebtInterestRate?: PercentageRate;
  readonly monthlyRent: EuroAmount;
  readonly annualRentIndexationRate: PercentageRate;
  readonly monthlyLivingExpenses: EuroAmount;
  readonly annualInflationRate: PercentageRate;
  readonly indexFutureTaxBrackets: boolean;
  readonly residencyPermit?: ResidencyPermitBaseline;
  readonly yearsInGermany?: number;
  readonly permitExpiryMonth?: SimulationMonth;
  readonly primary: LifeAdultBaseline;
  readonly partner?: LifeAdultBaseline;
}

interface BaseLifeEvent {
  readonly id: LifeEventId;
  readonly domain: LifeEventDomain;
  readonly effectiveMonth: SimulationMonth;
  readonly title: string;
  readonly notes?: string;
}

export interface SalaryRaiseEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.SalaryRaise;
  readonly personKey: LifePersonKey;
  readonly percentageIncrease: PercentageRate;
}

export interface BonusScheduleEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.BonusSchedule;
  readonly personKey: LifePersonKey;
  readonly grossBonusAmount: EuroAmount;
  readonly recurringYearly: boolean;
}

export interface WorkingHoursEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.WorkingHoursChange;
  readonly personKey: LifePersonKey;
  readonly newWeeklyHours: WorkingHours;
  readonly scaleSalaryProportionally: boolean;
}

export interface CompanyCarEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.CompanyCar;
  readonly personKey: LifePersonKey;
  readonly listPriceGross: EuroAmount;
  readonly powertrain: CompanyCarPowertrain;
  readonly oneWayCommuteKm: number;
  readonly endMonth?: SimulationMonth;
}

export interface CommuterEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.CommuterProfile;
  readonly personKey: LifePersonKey;
  readonly oneWayDistanceKm: number;
  readonly workDaysPerYear: number;
  readonly homeOfficeDaysPerYear: number;
}

export interface JobChangeEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.JobChange;
  readonly personKey: LifePersonKey;
  readonly newMonthlyGross: GrossSalary;
  readonly newWeeklyHours: WorkingHours;
  readonly signOnBonusGross?: EuroAmount;
}

export interface JobEndEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.JobEnd;
  readonly personKey: LifePersonKey;
  readonly cause: JobEndCause;
  readonly unemploymentMonths: number;
  readonly severanceGross?: EuroAmount;
  readonly reemploymentMonthlyGross?: GrossSalary;
  readonly sperrzeitMonths?: number;
}

export interface SideJobEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Career;
  readonly kind: typeof LifeEventKind.SideJob;
  readonly personKey: LifePersonKey;
  readonly monthlyNetInflow: EuroAmount;
  readonly isTaxExemptMinijob: boolean;
  readonly durationMonths: number;
}

export interface ChildBirthEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Family;
  readonly kind: typeof LifeEventKind.ChildBirth;
  readonly parentOnLeave: LifePersonKey;
  readonly leaveMode: ParentalLeavePlanMode;
  readonly leaveMonths: number;
  readonly partnerLeaveMonths: number;
  readonly includeMutterschutz: boolean;
}

export interface ChildcareFeeEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Family;
  readonly kind: typeof LifeEventKind.ChildcareFee;
  readonly monthlyFee: EuroAmount;
  readonly durationMonths: number;
  readonly childIndex: number;
  readonly taxDeductible: boolean;
}

export interface RegionalBenefitEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Family;
  readonly kind: typeof LifeEventKind.RegionalBenefit;
  readonly monthlyAmount: EuroAmount;
  readonly durationMonths: number;
}

export interface TaxClassSwitchEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Tax;
  readonly kind: typeof LifeEventKind.TaxClassSwitch;
  readonly primaryTaxClass: TaxClass;
  readonly partnerTaxClass?: TaxClass;
}

export interface DeductibleExpensesEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Tax;
  readonly kind: typeof LifeEventKind.DeductibleExpenses;
  readonly werbungskostenAnnual: EuroAmount;
  readonly sonderausgabenAnnual: EuroAmount;
  readonly householdServicesLaborAnnual: EuroAmount;
  readonly craftsmenLaborAnnual: EuroAmount;
  readonly recurringYearly: boolean;
}

export interface CapitalIncomeEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Tax;
  readonly kind: typeof LifeEventKind.CapitalIncome;
  readonly annualGrossReturn: EuroAmount;
  readonly recurringYearly: boolean;
}

export interface RentChangeEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.HousingAsset;
  readonly kind: typeof LifeEventKind.RentChange;
  readonly newMonthlyRent: EuroAmount;
}

export interface HomePurchaseEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.HousingAsset;
  readonly kind: typeof LifeEventKind.HomePurchase;
  readonly purchasePrice: EuroAmount;
  readonly closingCostsRate: PercentageRate;
  readonly downPayment: EuroAmount;
  readonly annualInterestRate: PercentageRate;
  readonly initialRepaymentRate: PercentageRate;
  readonly monthlyMaintenanceReserve: EuroAmount;
  readonly annualAppreciationRate: PercentageRate;
  readonly replacesRent: boolean;
}

export interface VehiclePurchaseOrLeaseEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.HousingAsset;
  readonly kind: typeof LifeEventKind.VehiclePurchaseOrLease;
  readonly upfrontPayment: EuroAmount;
  readonly assetValue: EuroAmount;
  readonly monthlyPayment: EuroAmount;
  readonly durationMonths: number;
  readonly annualDepreciationRate: PercentageRate;
}

export interface SolarPvInstallationEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.HousingAsset;
  readonly kind: typeof LifeEventKind.SolarPvInstallation;
  readonly upfrontCapex: EuroAmount;
  readonly monthlyElectricitySavings: EuroAmount;
  readonly monthlyFeedInRevenue: EuroAmount;
  readonly durationMonths: number;
}

export interface LoanOrDebtEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.HousingAsset;
  readonly kind: typeof LifeEventKind.LoanOrDebt;
  readonly principalAmount: EuroAmount;
  readonly annualInterestRate: PercentageRate;
  readonly monthlyPayment: EuroAmount;
  readonly addToLiquidCash: boolean;
}

export interface LivingBudgetChangeEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.ExpenseTravel;
  readonly kind: typeof LifeEventKind.LivingBudgetChange;
  readonly newMonthlyLivingExpenses: EuroAmount;
}

export interface TravelTripEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.ExpenseTravel;
  readonly kind: typeof LifeEventKind.TravelTrip;
  readonly totalCost: EuroAmount;
  readonly durationMonths?: number;
}

export interface OneOffCashflowEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.ExpenseTravel;
  readonly kind: typeof LifeEventKind.OneOffCashflow;
  /** Positive for inflow, negative for outflow. */
  readonly signedAmount: EuroAmount;
  readonly taxBucket: TaxBucket;
}

export interface ResidencyMilestoneEvent extends BaseLifeEvent {
  readonly domain: typeof LifeEventDomain.Residency;
  readonly kind: typeof LifeEventKind.ResidencyMilestone;
  readonly milestoneKind: ResidencyMilestoneKind;
  readonly leadMonthsNotice: number;
}

export type LifeSimulatorEvent =
  | SalaryRaiseEvent
  | BonusScheduleEvent
  | WorkingHoursEvent
  | CompanyCarEvent
  | CommuterEvent
  | JobChangeEvent
  | JobEndEvent
  | SideJobEvent
  | ChildBirthEvent
  | ChildcareFeeEvent
  | RegionalBenefitEvent
  | TaxClassSwitchEvent
  | DeductibleExpensesEvent
  | CapitalIncomeEvent
  | RentChangeEvent
  | HomePurchaseEvent
  | VehiclePurchaseOrLeaseEvent
  | SolarPvInstallationEvent
  | LoanOrDebtEvent
  | LivingBudgetChangeEvent
  | TravelTripEvent
  | OneOffCashflowEvent
  | ResidencyMilestoneEvent;

export interface LifeTaxTransaction {
  readonly transactionId: string;
  readonly month: SimulationMonth;
  readonly calendarYear: FullCalendarYear;
  readonly calendarMonth: CalendarMonth;
  readonly domain: LifeEventDomain;
  readonly bucket: TaxBucket;
  /** Positive = cash inflow or tax credit; negative = cash outflow or tax withheld. */
  readonly signedCashAmount: EuroAmount;
  /** Non-negative magnitude recorded in the specified TaxBucket for annual tax aggregation. */
  readonly taxBasisAmount: EuroAmount;
  readonly label: string;
  readonly statutoryCitation?: StatutoryCitation;
}

export interface LifeActionMilestone {
  readonly eventId: LifeEventId;
  readonly domain: LifeEventDomain;
  readonly kind: LifeEventKind;
  readonly title: string;
}

export interface LifeMonthlyLedgerEntry {
  readonly month: SimulationMonth;
  readonly calendarYear: FullCalendarYear;
  readonly calendarMonth: CalendarMonth;
  readonly monthId: MonthId;
  readonly activeTaxClassLabel: string;
  readonly primaryNetSalary: EuroAmount;
  readonly partnerNetSalary: EuroAmount;
  readonly statutoryBenefits: EuroAmount;
  readonly taxRefundOrRepayment: EuroAmount;
  readonly housingAndAssetsNet: EuroAmount;
  readonly livingAndChildcareOutflow: EuroAmount;
  readonly otherEventsNet: EuroAmount;
  readonly monthlyNetCashflow: EuroAmount;
  readonly liquidCashBalance: EuroAmount;
  readonly emergencyRunwayMonths: number;
  readonly totalAssetsValue: EuroAmount;
  readonly totalDebtBalance: EuroAmount;
  readonly netWorth: EuroAmount;
  readonly actionMilestones: readonly LifeActionMilestone[];
  readonly transactions: readonly LifeTaxTransaction[];
}

export interface AnnualLifeTaxRecord {
  readonly calendarYear: FullCalendarYear;
  readonly isCompleteYear: boolean;
  readonly isJointAssessment: boolean;
  readonly grossTaxableWages: EuroAmount;
  readonly benefitInKind: EuroAmount;
  readonly socialSecurityDeductible: EuroAmount;
  readonly werbungskostenApplied: EuroAmount;
  readonly sonderausgabenApplied: EuroAmount;
  readonly childcareDeductibleApplied: EuroAmount;
  readonly taxableIncomeZvE: EuroAmount;
  readonly progressionIncome32b: EuroAmount;
  readonly incomeTaxLiability: EuroAmount;
  readonly solidarityLiability: EuroAmount;
  readonly churchTaxLiability: EuroAmount;
  readonly taxCredit35aApplied: EuroAmount;
  readonly capitalGainsTax: EuroAmount;
  readonly kindergeldReceived: EuroAmount;
  readonly isKinderfreibetragFavorable: boolean;
  readonly finalTotalTaxLiability: EuroAmount;
  readonly creditedWithholding: EuroAmount;
  /** Positive = tax refund, negative = tax repayment (Nachzahlung). */
  readonly settlementEur: EuroAmount;
  readonly postedInMonth?: SimulationMonth;
  readonly statutoryCitation: StatutoryCitation;
}

export interface LifeDeadlineItem {
  readonly id: string;
  readonly month: SimulationMonth;
  readonly calendarYear: FullCalendarYear;
  readonly calendarMonth: CalendarMonth;
  readonly domain: LifeEventDomain;
  readonly severity: LifeDeadlineSeverity;
  readonly title: string;
  readonly description: string;
  readonly statutoryCitation?: StatutoryCitation;
}

export interface LifeSimulationSummary {
  readonly cumulativeNetCashflow: EuroAmount;
  readonly endingLiquidCash: EuroAmount;
  readonly minLiquidCash: EuroAmount;
  readonly minLiquidCashMonth: SimulationMonth;
  readonly minRunwayMonths: number;
  readonly endingAssetsValue: EuroAmount;
  readonly endingDebtBalance: EuroAmount;
  readonly endingNetWorth: EuroAmount;
  readonly totalTaxWithheld: EuroAmount;
  readonly totalAnnualTaxSettlements: EuroAmount;
  readonly totalNetTaxPaid: EuroAmount;
  readonly shortfallMonth?: SimulationMonth;
}

export interface LifePlanInput {
  readonly baseline: LifeHouseholdBaseline;
  readonly events: readonly LifeSimulatorEvent[];
}

export interface LifeSimulationResult {
  readonly scenarioKey: LifeScenarioKey;
  readonly months: readonly LifeMonthlyLedgerEntry[];
  readonly annualTaxRecords: readonly AnnualLifeTaxRecord[];
  readonly deadlines: readonly LifeDeadlineItem[];
  readonly summary: LifeSimulationSummary;
}

export interface DisasterShockConfig {
  readonly id: string;
  readonly kind: DisasterKind;
  readonly label: string;
  readonly triggerMonth: SimulationMonth;
  readonly durationMonths: number;
  readonly personKey: LifePersonKey;
  readonly severanceGross?: EuroAmount;
  readonly reemploymentSalaryRatio?: PercentageRate;
  readonly lumpSumCost?: EuroAmount;
  readonly monthlyCostIncrease?: EuroAmount;
}

export interface CommitmentAffordabilityOptions {
  /** Minimum liquid cash floor that must never be breached (defaults to emergencyBufferMonths * essentialMonthlyOutflow). */
  readonly emergencyFloorEur?: EuroAmount;
  /** Reference annual mortgage interest rate used to translate safe annuity into loan capacity. */
  readonly referenceMortgageInterestRate?: PercentageRate;
  /** Reference initial annual repayment (Tilgung) rate used to translate safe annuity into loan capacity. */
  readonly referenceMortgageTilgungRate?: PercentageRate;
}

export interface CommitmentAffordabilityResult {
  readonly verdict: SolvencyVerdict;
  readonly emergencyFloorEur: EuroAmount;
  readonly minLiquidCashEur: EuroAmount;
  readonly minLiquidCashMonth: SimulationMonth;
  readonly survivalRunwayMonths: number;
  /** Positive = safe monthly headroom to expand commitments; negative = required monthly cut. */
  readonly maxSafeAdditionalMonthlyCommitmentEur: EuroAmount;
  readonly currentMonthlyHousingEur: EuroAmount;
  readonly maxSafeTotalRentEur: EuroAmount;
  readonly maxSafeMortgageAnnuityEur: EuroAmount;
  readonly impliedMaxLoanAmountEur: EuroAmount;
}
