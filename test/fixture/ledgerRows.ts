import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  standardPreexistingConditions,
} from "./standardHouseholds.ts";
import {
  ScenarioId,
  FinancialEventCategory,
  TargetPerson,
  toFinancialEventId,
  toSimulationMonth,
  toCalendarMonth,
  toFullCalendarYear,
  toEuroAmount,
  toNetSalary,
  toMonthDuration,
  toPercentageRate,
  toRaiseId,
} from "#engine/types";

export const ledgerRowsFixture = (firstAmount = 100) => runScenarioBatches({ scenarioKey: ScenarioId.A,
  pregnancies: [],
  taxClassSwitches: [],
  preexisting: { ...standardPreexistingConditions,
    simulationDurationMonths: toMonthDuration(36),
    husbandInitialNet: toNetSalary(1000),
    wifeInitialFullTimeNet: toNetSalary(0),
    enable13thSalary: false },
  salaryRaises: [{ raiseId: toRaiseId("ROW-ACTION"),
    effectiveSimulationMonth: toSimulationMonth(2),
    effectiveCalendarMonth: toCalendarMonth(2),
    effectiveCalendarYear: toFullCalendarYear(2026),
    targetPerson: TargetPerson.Husband,
    percentageIncrease: toPercentageRate(0),
    reason: "A nonfinancial action" }],
  financialEvents: [firstAmount, -50, 25, -10, -5].map((amount, index) => ({ eventId: toFinancialEventId(`ROW-EVENT-${index}`),
    effectiveSimulationMonth: toSimulationMonth(2),
    effectiveCalendarMonth: toCalendarMonth(2),
    effectiveCalendarYear: toFullCalendarYear(2026),
    amount: toEuroAmount(amount),
    category: FinancialEventCategory.CustomSpecial,
    title: 'Same title; "quoted", with\nnewline',
    description: "Distinct IDs must stay distinct" })) });
