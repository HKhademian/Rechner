import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type PreexistingConditions,
  type PregnancyAction,
  SimulationStrategy,
  TaxClass,
  toCalendarMonth,
  toChildIndex,
  toChildrenCount,
  toEuroAmount,
  toFullCalendarYear,
  toMonthDuration,
  toNetSalary,
  toPregnancyId,
  toSimulationMonth,
  toSwitchId,
  toWorkingHours,
} from "#engine/types";
import {
  getEmptyPersistedState,
} from "#engine/storage/persistence";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  PlanCapDiagnosticStatus,
  TaxSwitchDiagnosticStatus,
  evaluateParentalPlanDiagnostics,
  toPlanCapDiagnosticStatus,
  toTaxSwitchDiagnosticStatus,
} from "#engine/formulas/pure/parentalPlanDiagnostics";

function buildTestPreexisting(
  taxableIncome?: readonly {
    readonly calendarYear: ReturnType<typeof toFullCalendarYear>;
    readonly taxableIncome: ReturnType<typeof toEuroAmount>;
  }[],
): PreexistingConditions {
  const empty = getEmptyPersistedState();
  return {
    salaryInputMode: empty.salaryInputMode,
    husbandGross: empty.husbandGross,
    wifeGross: empty.wifeGross,
    husbandInitialTaxClass: TaxClass.III,
    husbandInitialNet: empty.husbandClass3Net,
    husbandInitialClass5Net: empty.husbandClass5Net,
    husbandWeeklyHours: empty.husbandHours,
    wifeInitialTaxClass: TaxClass.V,
    wifeInitialFullTimeNet: empty.wifeClass5FullTimeNet,
    wifeInitialClass3FullTimeNet: empty.wifeClass3FullTimeNet,
    wifeInitialPartTimeClass5Net: toNetSalary(1500),
    wifeInitialPartTimeClass3Net: toNetSalary(1950),
    wifeWeeklyHours: empty.wifeInitialHours,
    existingChildrenCount: toChildrenCount(0),
    annualBonusGross: empty.annualBonusGross,
    annualBonusMonth: empty.annualBonusMonth,
    investmentReturnMonthly: empty.investmentReturnMonthly,
    kindergeldPerChild: empty.kindergeldPerChild,
    enable13thSalary: false,
    bonus40Month: empty.bonus40Month,
    bonus60Month: empty.bonus60Month,
    taxReturnMonth: empty.taxReturnMonth,
    startCalendarYear: toFullCalendarYear(2026),
    startCalendarMonth: toCalendarMonth(1),
    simulationDurationMonths: empty.simulationDurationMonths,
    ...(taxableIncome ? { householdTaxableIncome: taxableIncome } : {}),
  };
}

describe("evaluateParentalPlanDiagnostics", () => {
  it("validates diagnostic status const enums strictly", () => {
    assert.equal(toPlanCapDiagnosticStatus("ELIGIBLE"), PlanCapDiagnosticStatus.Eligible);
    assert.throws(() => toPlanCapDiagnosticStatus("BOGUS"), TypeError);
    assert.equal(toTaxSwitchDiagnosticStatus("OPTIMAL_LEAD"), TaxSwitchDiagnosticStatus.OptimalLead);
    assert.throws(() => toTaxSwitchDiagnosticStatus("BOGUS"), TypeError);
  });

  it("reports NoBirths and NotApplicable when no pregnancies are configured", () => {
    const preexisting = buildTestPreexisting();
    const resB = runScenarioBatches({
      scenarioKey: SimulationStrategy.UnoptimizedBaseline,
      preexisting,
      pregnancies: [],
      taxClassSwitches: [],
      salaryRaises: [],
    });
    const resC = runScenarioBatches({
      scenarioKey: SimulationStrategy.StatutoryOptimized,
      preexisting,
      pregnancies: [],
      taxClassSwitches: [],
      salaryRaises: [],
    });

    const diag = evaluateParentalPlanDiagnostics({
      preexisting,
      pregnancies: [],
      taxClassSwitches: [],
      householdTaxableIncome: [],
      scenarioC: resC,
      scenarioB: resB,
    });
    assert.equal(diag.incomeCap.status, PlanCapDiagnosticStatus.NoBirths);
    assert.equal(diag.taxSwitch.status, TaxSwitchDiagnosticStatus.NotApplicable);
    assert.equal(diag.allowanceRate.hasBirths, false);
  });

  it("evaluates eligible cap headroom and optimal 7-month tax-switch lead accurately", () => {
    const householdTaxableIncome = [
      {
        calendarYear: toFullCalendarYear(2026),
        taxableIncome: toEuroAmount(140000),
      },
    ];
    const preexisting = buildTestPreexisting(householdTaxableIncome);

    const pregnancies: readonly PregnancyAction[] = [
      {
        pregnancyId: toPregnancyId("PREG-1"),
        childIndex: toChildIndex(1),
        positiveTestSimulationMonth: toSimulationMonth(9),
        positiveTestCalendarMonth: toCalendarMonth(9),
        positiveTestCalendarYear: toFullCalendarYear(2026),
        calculatedDeliverySimulationMonth: toSimulationMonth(17),
        motherPostBirthPartTimeHours: toWorkingHours(24),
        motherPostBirthPartTimeClass5Net: toNetSalary(1500),
        motherPostBirthPartTimeClass3Net: toNetSalary(1950),
        fatherPartnerMonthsCount: toMonthDuration(2),
      },
    ];
    const switches = [
      {
        switchId: toSwitchId("SW-1"),
        effectiveSimulationMonth: toSimulationMonth(9),
        effectiveCalendarMonth: toCalendarMonth(9),
        effectiveCalendarYear: toFullCalendarYear(2026),
        targetHusbandTaxClass: TaxClass.V,
        targetWifeTaxClass: TaxClass.III,
        revertSimulationMonth: toSimulationMonth(17),
        revertHusbandTaxClass: TaxClass.III,
        revertWifeTaxClass: TaxClass.V,
        statutoryReason: "Optimal 7-month lead",
      },
    ];

    const resB = runScenarioBatches({
      scenarioKey: SimulationStrategy.UnoptimizedBaseline,
      preexisting,
      pregnancies,
      taxClassSwitches: switches,
      salaryRaises: [],
    });
    const resC = runScenarioBatches({
      scenarioKey: SimulationStrategy.StatutoryOptimized,
      preexisting,
      pregnancies,
      taxClassSwitches: switches,
      salaryRaises: [],
    });

    const diag = evaluateParentalPlanDiagnostics({
      preexisting,
      pregnancies,
      taxClassSwitches: switches,
      householdTaxableIncome,
      scenarioC: resC,
      scenarioB: resB,
    });
    assert.equal(diag.incomeCap.status, PlanCapDiagnosticStatus.Eligible);
    assert.equal(diag.incomeCap.headroomEur, 35000);
    assert.equal(diag.taxSwitch.status, TaxSwitchDiagnosticStatus.OptimalLead);
    assert.equal(diag.allowanceRate.hasBirths, true);
  });
});
