import {
  batch,
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  type ElterngeldPersistedState,
  deserializeState,
  serializeState,
  validateAndSanitizePersistedState,
} from "#engine/storage/persistence";
import {
  type ChildcarePlanConfig,
  type EuroAmount,
  type FinancialEventAction,
  type FinancialEventId,
  type HouseholdTaxableIncomeInput,
  type PercentageRate,
  type PreexistingConditions,
  type PregnancyAction,
  type PregnancyId,
  type RaiseId,
  type SalaryBonusSlot,
  type SalaryRaiseAction,
  type SpousalGrossToNetSet,
  type SwitchId,
  type TaxClassSwitchAction,
  type WorkingHoursChangeAction,
  type HoursChangeId,
  type ActiveScenarioView,
  type TimelineChartMode,
  type TimelineTimeRangeFilter,
  AnnualSalariesCount,
  BonusDistributionPreset,
  SalaryInputMode,
  TaxClass,
  toAnnualSalariesCount,
  toCalendarMonth,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toGrossSalary,
  toPercentageRate,
  toWorkingHours,
} from "#engine/types";
import {
  type PayrollOptions,
} from "#engine/tax/payroll";
import {
  deriveSpousalNetSalaries,
} from "#engine/tax/wageTax";
import {
  createTaxRulesFromContext,
  createTimelineConventionsFromContext,
  extractTaxRuleOverridesFromContext,
} from "#engine/parameters/contextAdapters";
import {
  activeStatutoryContext,
} from "#store/parameterStore";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  mapFederalStateToKitaPreset,
} from "#engine/benefits/kitaProfileMapping";
import {
  synthesizeOptimalTaxSwitches,
} from "#engine/simulator/strategySynthesizer";
import {
  type WorkbenchPresetId,
  WorkbenchPresetId as PresetId,
  buildWorkbenchPresetState,
} from "#engine/simulator/workbenchPresets";
import {
  resetWorkbenchDampening,
} from "#/apps/parental-planner/store/workbenchDampening.ts";

export interface WorkbenchExtrasState {
  /** Annual work-related expenses (§ 9 EStG) across the household. */
  readonly werbungskostenAnnual: EuroAmount;
  /** Additional annual deductible special expenses (§ 10 EStG). */
  readonly sonderausgabenAnnual: EuroAmount;
  /** Eligible annual invoiced labor for household-related services (§ 35a Abs. 2 EStG). */
  readonly householdServicesLaborAnnual: EuroAmount;
  /** Eligible annual invoiced labor for home craftsmen (§ 35a Abs. 3 EStG). */
  readonly craftsmenLaborAnnual: EuroAmount;
  /** Estimated marginal tax rate applied to taxable-income deductions. */
  readonly marginalTaxRate: PercentageRate;
  /** Optional recurring regional/other monthly family benefit (e.g. Familiengeld €250/mo). */
  readonly regionalBenefitMonthly: EuroAmount;
  /** Label for the optional recurring regional benefit. */
  readonly regionalBenefitLabel: string;
}

export function getDefaultWorkbenchExtras(): WorkbenchExtrasState {
  return Object.freeze({
    werbungskostenAnnual: toEuroAmount(0),
    sonderausgabenAnnual: toEuroAmount(0),
    householdServicesLaborAnnual: toEuroAmount(0),
    craftsmenLaborAnnual: toEuroAmount(0),
    marginalTaxRate: toPercentageRate(0.35),
    regionalBenefitMonthly: toEuroAmount(0),
    regionalBenefitLabel: "Regional Family Benefit (e.g. Familiengeld)",
  });
}

const workbenchStorage = browserAppStorage(AppId.ParentalPlanner);
const classicStorage = browserAppStorage(AppId.ParentalLeave);

const STATE_KEY = "state";
const EXTRAS_KEY = "extras";

/** Generates standard calendar bonus installment slots for 12x–15x annual salaries. */
export function buildWorkbenchBonusSlots(
  salariesCount: AnnualSalariesCount,
  preset: BonusDistributionPreset = BonusDistributionPreset.Ratio40_60,
): readonly SalaryBonusSlot[] {
  if (salariesCount === AnnualSalariesCount.Twelve) {
    return [];
  }
  if (salariesCount === AnnualSalariesCount.Thirteen) {
    switch (preset) {
      case BonusDistributionPreset.Ratio50_50:
        return [
          {
            calendarMonth: toCalendarMonth(6),
            payoutFraction: toPercentageRate(0.5),
            label: "13th Salary: 50% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(0.5),
            label: "13th Salary: 50% Christmas Bonus",
          },
        ];
      case BonusDistributionPreset.Single100Nov:
        return [
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Christmas Bonus",
          },
        ];
      case BonusDistributionPreset.Single100Dec:
        return [
          {
            calendarMonth: toCalendarMonth(12),
            payoutFraction: toPercentageRate(1.0),
            label: "13th Salary: 100% Year-End Bonus",
          },
        ];
      default:
        return [
          {
            calendarMonth: toCalendarMonth(5),
            payoutFraction: toPercentageRate(0.4),
            label: "13th Salary: 40% Vacation Bonus",
          },
          {
            calendarMonth: toCalendarMonth(11),
            payoutFraction: toPercentageRate(0.6),
            label: "13th Salary: 60% Christmas Bonus",
          },
        ];
    }
  }
  if (salariesCount === AnnualSalariesCount.Fourteen) {
    return [
      {
        calendarMonth: toCalendarMonth(6),
        payoutFraction: toPercentageRate(1.0),
        label: "13th Salary: 100% Vacation Bonus",
      },
      {
        calendarMonth: toCalendarMonth(11),
        payoutFraction: toPercentageRate(1.0),
        label: "14th Salary: 100% Christmas Bonus",
      },
    ];
  }
  if (salariesCount === AnnualSalariesCount.Fifteen) {
    return [
      {
        calendarMonth: toCalendarMonth(3),
        payoutFraction: toPercentageRate(1.0),
        label: "13th Salary: 100% Spring Bonus",
      },
      {
        calendarMonth: toCalendarMonth(6),
        payoutFraction: toPercentageRate(1.0),
        label: "14th Salary: 100% Summer Bonus",
      },
      {
        calendarMonth: toCalendarMonth(11),
        payoutFraction: toPercentageRate(1.0),
        label: "15th Salary: 100% Christmas Bonus",
      },
    ];
  }
  return [];
}

function deriveWithGrossSync(
  rawState: ElterngeldPersistedState,
): ElterngeldPersistedState {
  const sanitized = validateAndSanitizePersistedState(rawState);
  if (sanitized.salaryInputMode !== SalaryInputMode.Gross) {
    return sanitized;
  }
  const effectiveHusbandGross = sanitized.husbandHours > 0
    ? Math.max(0, sanitized.husbandGross)
    : 0;
  const effectiveWifeGross = sanitized.wifeInitialHours > 0
    ? Math.max(0, sanitized.wifeGross)
    : 0;
  const spousal = deriveSpousalNetSalaries(
    toGrossSalary(effectiveHusbandGross),
    toGrossSalary(effectiveWifeGross),
    sanitized.wifePostBirthHours,
    sanitized.wifeInitialHours,
    0,
    createTaxRulesFromContext(activeStatutoryContext.peek(), sanitized.startCalendarYear),
    sanitized.husbandPayrollOptions ?? {},
    sanitized.wifePayrollOptions ?? {},
    sanitized.husbandHours,
  );
  return {
    ...sanitized,
    husbandClass3Net: spousal.husbandClass3Net,
    husbandClass5Net: spousal.husbandClass5Net,
    wifeClass5FullTimeNet: spousal.wifeClass5FullTimeNet,
    wifeClass3FullTimeNet: spousal.wifeClass3FullTimeNet,
  };
}

function loadInitialWorkbenchState(): ElterngeldPersistedState {
  const fallback = buildWorkbenchPresetState(PresetId.ClassicOneChild);
  if (typeof window === "undefined") {
    return deriveWithGrossSync(fallback);
  }
  try {
    const raw = workbenchStorage.getItem(STATE_KEY);
    if (!raw) {
      return deriveWithGrossSync(fallback);
    }
    return deriveWithGrossSync(deserializeState(raw, fallback));
  }
  catch {
    return deriveWithGrossSync(fallback);
  }
}

function loadInitialWorkbenchExtras(): WorkbenchExtrasState {
  const defaults = getDefaultWorkbenchExtras();
  if (typeof window === "undefined") {
    return defaults;
  }
  try {
    const raw = workbenchStorage.getItem(EXTRAS_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as Partial<Record<keyof WorkbenchExtrasState, unknown>>;
    return Object.freeze({
      werbungskostenAnnual: toEuroAmount(Math.max(0, Number(parsed.werbungskostenAnnual) || 0)),
      sonderausgabenAnnual: toEuroAmount(Math.max(0, Number(parsed.sonderausgabenAnnual) || 0)),
      householdServicesLaborAnnual: toEuroAmount(
        Math.max(0, Number(parsed.householdServicesLaborAnnual) || 0),
      ),
      craftsmenLaborAnnual: toEuroAmount(Math.max(0, Number(parsed.craftsmenLaborAnnual) || 0)),
      marginalTaxRate: toPercentageRate(
        Math.max(0, Math.min(0.475, Number(parsed.marginalTaxRate) || defaults.marginalTaxRate)),
      ),
      regionalBenefitMonthly: toEuroAmount(
        Math.max(0, Number(parsed.regionalBenefitMonthly) || 0),
      ),
      regionalBenefitLabel:
        typeof parsed.regionalBenefitLabel === "string" && parsed.regionalBenefitLabel.trim()
          ? parsed.regionalBenefitLabel.trim()
          : defaults.regionalBenefitLabel,
    });
  }
  catch {
    return defaults;
  }
}

export const workbenchState = signal<ElterngeldPersistedState>(loadInitialWorkbenchState());
export const workbenchExtras = signal<WorkbenchExtrasState>(loadInitialWorkbenchExtras());

function persistState(next: ElterngeldPersistedState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    workbenchStorage.setItem(STATE_KEY, serializeState(next));
  }
  catch {
    // Ignore storage unavailability in memory-only or private modes.
  }
}

function persistExtras(next: WorkbenchExtrasState): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    workbenchStorage.setItem(EXTRAS_KEY, JSON.stringify(next));
  }
  catch {
    // Ignore storage unavailability.
  }
}

/** Updates persisted workbench state atomically with gross-to-net sync and schema validation. */
export function updateWorkbenchState(
  updater: (prev: ElterngeldPersistedState) => ElterngeldPersistedState,
): void {
  const next = deriveWithGrossSync(updater(workbenchState.peek()));
  workbenchState.value = next;
  persistState(next);
}

/** Updates granular deductible expenses & optional regional benefit settings. */
export function updateWorkbenchExtras(
  updates: Partial<WorkbenchExtrasState>,
): void {
  const cur = workbenchExtras.peek();
  const next: WorkbenchExtrasState = Object.freeze({
    werbungskostenAnnual: updates.werbungskostenAnnual !== undefined
      ? toEuroAmount(Math.max(0, updates.werbungskostenAnnual))
      : cur.werbungskostenAnnual,
    sonderausgabenAnnual: updates.sonderausgabenAnnual !== undefined
      ? toEuroAmount(Math.max(0, updates.sonderausgabenAnnual))
      : cur.sonderausgabenAnnual,
    householdServicesLaborAnnual: updates.householdServicesLaborAnnual !== undefined
      ? toEuroAmount(Math.max(0, updates.householdServicesLaborAnnual))
      : cur.householdServicesLaborAnnual,
    craftsmenLaborAnnual: updates.craftsmenLaborAnnual !== undefined
      ? toEuroAmount(Math.max(0, updates.craftsmenLaborAnnual))
      : cur.craftsmenLaborAnnual,
    marginalTaxRate: updates.marginalTaxRate !== undefined
      ? toPercentageRate(Math.max(0, Math.min(0.475, updates.marginalTaxRate)))
      : cur.marginalTaxRate,
    regionalBenefitMonthly: updates.regionalBenefitMonthly !== undefined
      ? toEuroAmount(Math.max(0, updates.regionalBenefitMonthly))
      : cur.regionalBenefitMonthly,
    regionalBenefitLabel: updates.regionalBenefitLabel !== undefined && updates.regionalBenefitLabel.trim()
      ? updates.regionalBenefitLabel.trim()
      : cur.regionalBenefitLabel,
  });
  workbenchExtras.value = next;
  persistExtras(next);
}

export function applyWorkbenchPreset(presetId: WorkbenchPresetId): void {
  batch(() => {
    resetWorkbenchDampening();
    const next = deriveWithGrossSync(buildWorkbenchPresetState(presetId));
    workbenchState.value = next;
    persistState(next);
    const defaultExtras = getDefaultWorkbenchExtras();
    workbenchExtras.value = defaultExtras;
    persistExtras(defaultExtras);
  });
}

/** Clears all salaries, births, switches, costs, and extras back to a clean €0 blank slate. */
export function clearWorkbenchPlan(): void {
  applyWorkbenchPreset(PresetId.BlankPlan);
}

export function importWorkbenchState(next: ElterngeldPersistedState): void {
  batch(() => {
    resetWorkbenchDampening();
    const synced = deriveWithGrossSync(next);
    workbenchState.value = synced;
    persistState(synced);
  });
}

/** One-way non-destructive read of the user's saved Classic Parental Leave Planner state. */
export function loadClassicPlannerIntoWorkbench(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const raw = classicStorage.getItem(STATE_KEY);
    if (!raw) {
      return false;
    }
    const parsed = deserializeState(raw);
    importWorkbenchState(parsed);
    return true;
  }
  catch {
    return false;
  }
}

export function syncWorkbenchFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  updateWorkbenchState((prev) => {
    const hCount = prev.husbandSalariesCount ?? AnnualSalariesCount.Twelve;
    const wCount = prev.wifeSalariesCount ?? AnnualSalariesCount.Twelve;
    const husbandMonthly = Math.round(lp.primaryAnnualGrossEur / hCount);
    const wifeMonthly = lp.hasPartner ? Math.round(lp.partnerAnnualGrossEur / wCount) : 0;
    const presetId = mapFederalStateToKitaPreset(lp.federalState);
    const curKita = prev.childcarePlan;
    return {
      ...prev,
      startCalendarYear: lp.planningYear,
      husbandGross: toGrossSalary(Math.max(0, husbandMonthly)),
      wifeGross: toGrossSalary(Math.max(0, wifeMonthly)),
      existingChildrenCount: toChildrenCount(Math.max(0, Math.min(10, lp.dependentChildrenCount))),
      childcarePlan: curKita
        ? Object.freeze({
          ...curKita,
          presetId,
        })
        : undefined,
    };
  });
}

export function setWorkbenchActiveScenario(view: ActiveScenarioView): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    activeScenario: view,
  }));
}

export function setWorkbenchChartMode(mode: TimelineChartMode): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    chartMode: mode,
  }));
}

export function setWorkbenchTimeRange(range: TimelineTimeRangeFilter): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    timeRangeFilter: range,
  }));
}

export function setWorkbenchInitialTaxClasses(
  husbandClass: TaxClass,
  wifeClass: TaxClass,
  useFactor = false,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    husbandInitialTaxClass: husbandClass,
    wifeInitialTaxClass: wifeClass,
    useInitialTaxFactor: useFactor,
  }));
}

export function setWorkbenchSalariesCount(
  target: "husband" | "wife",
  count: number | AnnualSalariesCount,
  preset: BonusDistributionPreset = BonusDistributionPreset.Ratio40_60,
): void {
  const salariesCount = toAnnualSalariesCount(count);
  const slots = buildWorkbenchBonusSlots(salariesCount, preset);
  updateWorkbenchState((prev) => (target === "husband"
    ? {
      ...prev,
      husbandSalariesCount: salariesCount,
      husbandBonusDistribution: slots,
      enable13thSalary: salariesCount > 12,
    }
    : {
      ...prev,
      wifeSalariesCount: salariesCount,
      wifeBonusDistribution: slots,
    }));
}

export function setWorkbenchPayrollOptions(
  target: "husband" | "wife",
  options: PayrollOptions,
): void {
  updateWorkbenchState((prev) => (target === "husband"
    ? {
      ...prev,
      husbandPayrollOptions: options,
    }
    : {
      ...prev,
      wifePayrollOptions: options,
    }));
}

export function setWorkbenchHouseholdTaxableIncome(
  entries: readonly HouseholdTaxableIncomeInput[],
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    householdTaxableIncome: entries,
  }));
}

export function updateWorkbenchChildcarePlan(
  updates: Partial<ChildcarePlanConfig>,
): void {
  updateWorkbenchState((prev) => {
    const cur = prev.childcarePlan ?? {
      enabled: false,
      presetId: mapFederalStateToKitaPreset(unifiedLifeProfile.peek().federalState),
      customMonthlyFeePerChild: toEuroAmount(420),
      startAgeMonths: 12,
      endAgeMonths: 36,
    };
    const startAgeMonths = Math.max(0, Math.min(168, Math.trunc(updates.startAgeMonths ?? cur.startAgeMonths)));
    const endAgeMonths = Math.max(startAgeMonths, Math.min(168, Math.trunc(updates.endAgeMonths ?? cur.endAgeMonths)));
    return {
      ...prev,
      childcarePlan: Object.freeze({
        ...cur,
        ...updates,
        startAgeMonths,
        endAgeMonths,
      }),
    };
  });
}

export function addWorkbenchPregnancy(action: PregnancyAction): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customPregnancies: [...prev.customPregnancies, action],
  }));
}

export function updateWorkbenchPregnancy(
  pregnancyId: PregnancyId,
  updates: Partial<PregnancyAction>,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customPregnancies: prev.customPregnancies.map((item) =>
      item.pregnancyId === pregnancyId ? { ...item,
        ...updates } : item),
  }));
}

export function removeWorkbenchPregnancy(pregnancyId: PregnancyId): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customPregnancies: prev.customPregnancies.filter((item) => item.pregnancyId !== pregnancyId),
  }));
}

export function applyOptimalWorkbenchTaxSwitches(): void {
  updateWorkbenchState((prev) => {
    const pre = buildWorkbenchPreexisting(prev);
    const synthesized = synthesizeOptimalTaxSwitches(prev.customPregnancies, pre);
    return {
      ...prev,
      customTaxClassSwitches: synthesized,
    };
  });
}

export function clearWorkbenchTaxSwitches(): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customTaxClassSwitches: [],
  }));
}

export function addWorkbenchTaxSwitch(action: TaxClassSwitchAction): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customTaxClassSwitches: [...prev.customTaxClassSwitches, action],
  }));
}

export function updateWorkbenchTaxSwitch(
  switchId: SwitchId,
  updates: Partial<TaxClassSwitchAction>,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customTaxClassSwitches: prev.customTaxClassSwitches.map((item) =>
      item.switchId === switchId ? { ...item,
        ...updates } : item),
  }));
}

export function removeWorkbenchTaxSwitch(switchId: SwitchId): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customTaxClassSwitches: prev.customTaxClassSwitches.filter((item) => item.switchId !== switchId),
  }));
}

export function addWorkbenchSalaryRaise(action: SalaryRaiseAction): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customSalaryRaises: [...prev.customSalaryRaises, action],
  }));
}

export function updateWorkbenchSalaryRaise(
  raiseId: RaiseId,
  updates: Partial<SalaryRaiseAction>,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customSalaryRaises: prev.customSalaryRaises.map((item) =>
      item.raiseId === raiseId ? { ...item,
        ...updates } : item),
  }));
}

export function removeWorkbenchSalaryRaise(raiseId: RaiseId): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customSalaryRaises: prev.customSalaryRaises.filter((item) => item.raiseId !== raiseId),
  }));
}

export function addWorkbenchHoursChange(action: WorkingHoursChangeAction): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customWorkingHoursChanges: [...(prev.customWorkingHoursChanges ?? []), action],
  }));
}

export function updateWorkbenchHoursChange(
  changeId: HoursChangeId,
  updates: Partial<WorkingHoursChangeAction>,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customWorkingHoursChanges: (prev.customWorkingHoursChanges ?? []).map((item) =>
      item.changeId === changeId ? { ...item,
        ...updates } : item),
  }));
}

export function removeWorkbenchHoursChange(changeId: HoursChangeId): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customWorkingHoursChanges: (prev.customWorkingHoursChanges ?? []).filter((item) => item.changeId !== changeId),
  }));
}

export function addWorkbenchFinancialEvent(action: FinancialEventAction): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customFinancialEvents: [...prev.customFinancialEvents, action],
  }));
}

export function updateWorkbenchFinancialEvent(
  eventId: FinancialEventId,
  updates: Partial<FinancialEventAction>,
): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customFinancialEvents: prev.customFinancialEvents.map((item) =>
      item.eventId === eventId ? { ...item,
        ...updates } : item),
  }));
}

export function removeWorkbenchFinancialEvent(eventId: FinancialEventId): void {
  updateWorkbenchState((prev) => ({
    ...prev,
    customFinancialEvents: prev.customFinancialEvents.filter((item) => item.eventId !== eventId),
  }));
}

export const workbenchDerivedSpousalSet = computed<SpousalGrossToNetSet>(() => {
  const s = workbenchState.value;
  const effectiveHusbandGross = s.husbandHours > 0 ? Math.max(0, s.husbandGross) : 0;
  const effectiveWifeGross = s.wifeInitialHours > 0 ? Math.max(0, s.wifeGross) : 0;
  return deriveSpousalNetSalaries(
    toGrossSalary(effectiveHusbandGross),
    toGrossSalary(effectiveWifeGross),
    s.wifePostBirthHours,
    s.wifeInitialHours,
    0,
    createTaxRulesFromContext(activeStatutoryContext.value, s.startCalendarYear),
    s.husbandPayrollOptions ?? {},
    s.wifePayrollOptions ?? {},
    s.husbandHours,
  );
});

/** Builds the engine's strongly-typed `PreexistingConditions` from `ElterngeldPersistedState`. */
export function buildWorkbenchPreexisting(
  s: ElterngeldPersistedState,
): PreexistingConditions {
  const ctx = activeStatutoryContext.peek();
  const spousal = deriveSpousalNetSalaries(
    toGrossSalary(s.husbandHours > 0 ? Math.max(0, s.husbandGross) : 0),
    toGrossSalary(s.wifeInitialHours > 0 ? Math.max(0, s.wifeGross) : 0),
    s.wifePostBirthHours,
    s.wifeInitialHours,
    0,
    createTaxRulesFromContext(ctx, s.startCalendarYear),
    s.husbandPayrollOptions ?? {},
    s.wifePayrollOptions ?? {},
    s.husbandHours,
  );
  return {
    householdTaxableIncome: s.householdTaxableIncome,
    timelineConventions: createTimelineConventionsFromContext(ctx),
    assumeManualNetIsAssessmentNet: s.assumeManualNetIsAssessmentNet === true,
    husbandPayrollOptions: s.husbandPayrollOptions,
    wifePayrollOptions: s.wifePayrollOptions,
    taxRuleOverrides: extractTaxRuleOverridesFromContext(ctx),
    startCalendarYear: toFullCalendarYear(s.startCalendarYear),
    startCalendarMonth: s.startCalendarMonth,
    simulationDurationMonths: s.simulationDurationMonths,
    salaryInputMode: s.salaryInputMode,
    salaryPeriod: s.salaryPeriod,
    husbandGross: s.husbandGross,
    wifeGross: s.wifeGross,
    husbandInitialTaxClass: s.husbandInitialTaxClass ?? TaxClass.III,
    husbandInitialNet: s.salaryInputMode === SalaryInputMode.Gross ? spousal.husbandClass3Net : s.husbandClass3Net,
    husbandInitialClass5Net: s.salaryInputMode === SalaryInputMode.Gross ? spousal.husbandClass5Net : s.husbandClass5Net,
    husbandInitialClass4Net: spousal.husbandClass4Net,
    husbandWeeklyHours: toWorkingHours(s.husbandHours),
    husbandSalariesCount: s.husbandSalariesCount ?? AnnualSalariesCount.Twelve,
    husbandBonusDistribution: s.husbandBonusDistribution ?? [],
    wifeInitialTaxClass: s.wifeInitialTaxClass ?? TaxClass.V,
    wifeInitialFullTimeNet: s.salaryInputMode === SalaryInputMode.Gross ? spousal.wifeClass5FullTimeNet : s.wifeClass5FullTimeNet,
    wifeInitialClass3FullTimeNet: s.salaryInputMode === SalaryInputMode.Gross ? spousal.wifeClass3FullTimeNet : s.wifeClass3FullTimeNet,
    wifeInitialClass4FullTimeNet: spousal.wifeClass4FullTimeNet,
    wifeInitialPartTimeClass5Net: spousal.wifeClass5PartTimeNet,
    wifeInitialPartTimeClass3Net: spousal.wifeClass3PartTimeNet,
    wifeInitialPartTimeClass4Net: spousal.wifeClass4PartTimeNet,
    wifeWeeklyHours: toWorkingHours(s.wifeInitialHours),
    wifePostBirthWeeklyHours: toWorkingHours(s.wifePostBirthHours),
    wifeSalariesCount: s.wifeSalariesCount ?? AnnualSalariesCount.Twelve,
    wifeBonusDistribution: s.wifeBonusDistribution ?? [],
    initialUseTaxFactor: s.useInitialTaxFactor ?? false,
    initialTaxFactor: spousal.taxFactor,
    existingChildrenCount: s.existingChildrenCount ?? toChildrenCount(0),
    childcarePlan: s.childcarePlan,
    annualBonusGross: s.annualBonusGross,
    annualBonusMonth: s.annualBonusMonth,
    investmentReturnMonthly: s.investmentReturnMonthly,
    kindergeldPerChild: s.kindergeldPerChild,
    enable13thSalary: s.enable13thSalary,
    bonus40Month: s.bonus40Month,
    bonus60Month: s.bonus60Month,
    taxReturnMonth: s.taxReturnMonth,
  };
}
