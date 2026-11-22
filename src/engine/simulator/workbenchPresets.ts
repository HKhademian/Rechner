import {
  type ElterngeldPersistedState,
  getEmptyPersistedState,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";
import {
  type PregnancyAction,
  AllowancePlanMode,
  AnnualSalariesCount,
  ElterngeldVariant,
  FederalStateKitaPresetId,
  SalaryInputMode,
  SalaryPeriod,
  TaxClass,
  toCalendarMonth,
  toChildIndex,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toIsoCalendarDate,
  toMonthDuration,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toWorkingHours,
} from "#engine/types";
import {
  synthesizeOptimalTaxSwitches,
} from "#engine/simulator/strategySynthesizer";

export const WorkbenchPresetId = {
  ClassicOneChild: "classic-one-child",
  PlusPartTimeOneChild: "plus-part-time-one-child",
  TwoChildrenSiblingBonus: "two-children-sibling-bonus",
  BlankPlan: "blank-plan",
} as const;
export type WorkbenchPresetId =
  (typeof WorkbenchPresetId)[keyof typeof WorkbenchPresetId];

export function toWorkbenchPresetId(value: string): WorkbenchPresetId {
  if (!Object.values(WorkbenchPresetId).includes(value as WorkbenchPresetId)) {
    throw new TypeError(`Unknown workbench preset id: ${value}`);
  }
  return value as WorkbenchPresetId;
}

export interface WorkbenchPresetDefinition {
  readonly id: WorkbenchPresetId;
  readonly name: string;
  readonly description: string;
  readonly buildState: () => ElterngeldPersistedState;
}

function buildSteadyBase(): ElterngeldPersistedState {
  const empty = getEmptyPersistedState();
  return {
    ...empty,
    salaryInputMode: SalaryInputMode.Gross,
    salaryPeriod: SalaryPeriod.Monthly,
    husbandSalariesCount: AnnualSalariesCount.Twelve,
    wifeSalariesCount: AnnualSalariesCount.Twelve,
    husbandBonusDistribution: [],
    wifeBonusDistribution: [],
    enable13thSalary: false,
    enableSalaryRaises: false,
    annualSalaryRaisePercent: 0,
    annualBonusGross: toGrossSalary(0),
    investmentReturnMonthly: toEuroAmount(0),
    existingChildrenCount: toChildrenCount(0),
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: toMonthDuration(60),
    husbandInitialTaxClass: TaxClass.III,
    wifeInitialTaxClass: TaxClass.V,
    useInitialTaxFactor: false,
    husbandHours: toWorkingHours(40),
    wifeInitialHours: toWorkingHours(40),
    wifePostBirthHours: toWorkingHours(24),
    childcarePlan: Object.freeze({
      enabled: false,
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyFeePerChild: toEuroAmount(250),
      startAgeMonths: 12,
      endAgeMonths: 36,
    }),
    customPregnancies: [],
    customTaxClassSwitches: [],
    customSalaryRaises: [],
    customWorkingHoursChanges: [],
    customFinancialEvents: [],
  };
}

function buildClassicOneChildState(): ElterngeldPersistedState {
  const base = buildSteadyBase();
  const pregnancies: readonly PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId("PREG-WB-1"),
      childIndex: toChildIndex(1),
      positiveTestSimulationMonth: toSimulationMonth(10),
      positiveTestCalendarMonth: toCalendarMonth(10),
      positiveTestCalendarYear: toFullCalendarYear(2026),
      calculatedDeliverySimulationMonth: toSimulationMonth(18),
      expectedDueDate: toIsoCalendarDate("2027-06-15"),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: toNetSalary(1100),
      motherPostBirthPartTimeClass3Net: toNetSalary(1450),
      fatherPartnerMonthsCount: toMonthDuration(2),
      motherAllowancePlanMode: AllowancePlanMode.Basis,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowancePlanMode: AllowancePlanMode.Basis,
      fatherAllowanceVariant: ElterngeldVariant.Basis,
    },
  ];
  const switches = synthesizeOptimalTaxSwitches(pregnancies);
  return validateAndSanitizePersistedState({
    ...base,
    husbandGross: toGrossSalary(4000),
    wifeGross: toGrossSalary(3000),
    householdTaxableIncome: [
      {
        calendarYear: toFullCalendarYear(2026),
        taxableIncome: toEuroAmount(75000),
      },
    ],
    child1BirthMonth: toSimulationMonth(18),
    customPregnancies: pregnancies,
    customTaxClassSwitches: switches,
  });
}

function buildPlusPartTimeOneChildState(): ElterngeldPersistedState {
  const base = buildSteadyBase();
  const pregnancies: readonly PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId("PREG-WB-PLUS-1"),
      childIndex: toChildIndex(1),
      positiveTestSimulationMonth: toSimulationMonth(10),
      positiveTestCalendarMonth: toCalendarMonth(10),
      positiveTestCalendarYear: toFullCalendarYear(2026),
      calculatedDeliverySimulationMonth: toSimulationMonth(18),
      expectedDueDate: toIsoCalendarDate("2027-06-15"),
      motherPostBirthPartTimeHours: toWorkingHours(28),
      motherPostBirthPartTimeClass5Net: toNetSalary(1300),
      motherPostBirthPartTimeClass3Net: toNetSalary(1650),
      fatherPartnerMonthsCount: toMonthDuration(4),
      motherAllowancePlanMode: AllowancePlanMode.Plus,
      motherAllowanceVariant: ElterngeldVariant.Plus,
      motherAllowanceMonthsCount: toMonthDuration(20),
      fatherAllowancePlanMode: AllowancePlanMode.Plus,
      fatherAllowanceVariant: ElterngeldVariant.Plus,
    },
  ];
  const switches = synthesizeOptimalTaxSwitches(pregnancies);
  return validateAndSanitizePersistedState({
    ...base,
    husbandGross: toGrossSalary(3800),
    wifeGross: toGrossSalary(3200),
    wifePostBirthHours: toWorkingHours(28),
    householdTaxableIncome: [
      {
        calendarYear: toFullCalendarYear(2026),
        taxableIncome: toEuroAmount(72000),
      },
    ],
    child1BirthMonth: toSimulationMonth(18),
    customPregnancies: pregnancies,
    customTaxClassSwitches: switches,
  });
}

function buildTwoChildrenState(): ElterngeldPersistedState {
  const base = buildSteadyBase();
  const pregnancies: readonly PregnancyAction[] = [
    {
      pregnancyId: toPregnancyId("PREG-WB-2C-1"),
      childIndex: toChildIndex(1),
      positiveTestSimulationMonth: toSimulationMonth(10),
      positiveTestCalendarMonth: toCalendarMonth(10),
      positiveTestCalendarYear: toFullCalendarYear(2026),
      calculatedDeliverySimulationMonth: toSimulationMonth(18),
      expectedDueDate: toIsoCalendarDate("2027-06-15"),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: toNetSalary(1200),
      motherPostBirthPartTimeClass3Net: toNetSalary(1550),
      fatherPartnerMonthsCount: toMonthDuration(2),
      motherAllowancePlanMode: AllowancePlanMode.Basis,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowancePlanMode: AllowancePlanMode.Basis,
      fatherAllowanceVariant: ElterngeldVariant.Basis,
    },
    {
      pregnancyId: toPregnancyId("PREG-WB-2C-2"),
      childIndex: toChildIndex(2),
      positiveTestSimulationMonth: toSimulationMonth(34),
      positiveTestCalendarMonth: toCalendarMonth(10),
      positiveTestCalendarYear: toFullCalendarYear(2028),
      calculatedDeliverySimulationMonth: toSimulationMonth(42),
      expectedDueDate: toIsoCalendarDate("2029-06-15"),
      motherPostBirthPartTimeHours: toWorkingHours(24),
      motherPostBirthPartTimeClass5Net: toNetSalary(1200),
      motherPostBirthPartTimeClass3Net: toNetSalary(1550),
      fatherPartnerMonthsCount: toMonthDuration(2),
      motherAllowancePlanMode: AllowancePlanMode.Basis,
      motherAllowanceVariant: ElterngeldVariant.Basis,
      motherAllowanceMonthsCount: toMonthDuration(10),
      fatherAllowancePlanMode: AllowancePlanMode.Basis,
      fatherAllowanceVariant: ElterngeldVariant.Basis,
    },
  ];
  const switches = synthesizeOptimalTaxSwitches([pregnancies[0]]);
  return validateAndSanitizePersistedState({
    ...base,
    husbandGross: toGrossSalary(4200),
    wifeGross: toGrossSalary(3400),
    householdTaxableIncome: [
      {
        calendarYear: toFullCalendarYear(2026),
        taxableIncome: toEuroAmount(80000),
      },
      {
        calendarYear: toFullCalendarYear(2028),
        taxableIncome: toEuroAmount(64000),
      },
    ],
    child1BirthMonth: toSimulationMonth(18),
    birthSpacingMonths: toMonthDuration(24),
    customPregnancies: pregnancies,
    customTaxClassSwitches: switches,
  });
}

function buildBlankPlanState(): ElterngeldPersistedState {
  const base = buildSteadyBase();
  return validateAndSanitizePersistedState({
    ...base,
    husbandGross: toGrossSalary(0),
    wifeGross: toGrossSalary(0),
    householdTaxableIncome: [],
    childcarePlan: Object.freeze({
      enabled: false,
      presetId: FederalStateKitaPresetId.Custom,
      customMonthlyFeePerChild: toEuroAmount(0),
      startAgeMonths: 12,
      endAgeMonths: 36,
    }),
  });
}

export const WORKBENCH_PRESETS: readonly WorkbenchPresetDefinition[] = Object.freeze([
  Object.freeze({
    id: WorkbenchPresetId.ClassicOneChild,
    name: "1 Child · Classic 12+2 (Steady)",
    description: "Steady salaries, 1 child with 12+2 Basiselterngeld and optimal § 2b tax-class switch.",
    buildState: buildClassicOneChildState,
  }),
  Object.freeze({
    id: WorkbenchPresetId.PlusPartTimeOneChild,
    name: "1 Child · ElterngeldPlus Part-Time",
    description: "Steady salaries, 20+4 ElterngeldPlus months paired with 28 h/wk part-time work.",
    buildState: buildPlusPartTimeOneChildState,
  }),
  Object.freeze({
    id: WorkbenchPresetId.TwoChildrenSiblingBonus,
    name: "2 Children · Sibling Bonus (§ 2a)",
    description: "Two children spaced 24 months apart unlocking the +10% Geschwisterbonus.",
    buildState: buildTwoChildrenState,
  }),
  Object.freeze({
    id: WorkbenchPresetId.BlankPlan,
    name: "Blank Plan (€0 / No Births)",
    description: "Empty workspace with €0 salaries and no planned births, switches, or childcare.",
    buildState: buildBlankPlanState,
  }),
]);

export function buildWorkbenchPresetState(id: WorkbenchPresetId): ElterngeldPersistedState {
  const preset = WORKBENCH_PRESETS.find((item) => item.id === id);
  if (!preset) {
    throw new TypeError(`Unknown workbench preset id: ${id}`);
  }
  return preset.buildState();
}
