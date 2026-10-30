import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  applyAnnualTaxSettlements,
} from "#engine/ledger/taxSettlements";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  ScenarioId,
  SalaryInputMode,
  TransactionDirection,
  TransactionType,
  toNetSalary,
  toMonthDuration,
  toEuroAmount,
  toFullCalendarYear,
  toCalendarMonth,
} from "#engine/types";

const months = () => runScenarioBatches({ scenarioKey: ScenarioId.A,
  pregnancies: [],
  taxClassSwitches: [],
  salaryRaises: [],
  preexisting: { ...standardPreexistingConditions,
    salaryInputMode: SalaryInputMode.Net,
    simulationDurationMonths: toMonthDuration(24),
    husbandInitialNet: toNetSalary(1000),
    wifeInitialFullTimeNet: toNetSalary(0),
    enable13thSalary: false } }).months;
const flow = { calendarYear: toFullCalendarYear(2026),
  settlement: toEuroAmount(250.25),
  creditedIncomeTax: toEuroAmount(5000),
  creditedSolidarity: toEuroAmount(0),
  totalLiability: toEuroAmount(4749.75) };

it("posts a cent-preserving refund once, in the following year's configured month", () => {
  const original = months();
  const result = applyAnnualTaxSettlements(original, [flow], toCalendarMonth(3));
  const paid = result[14];
  assert.equal(paid.monthId, "M03.2027");
  assert.equal(paid.taxRefund, 250.25);
  assert.equal(paid.specialEvents[0].amount, 250.25);
  assert.equal(paid.specialEvents[0].taxSettlement?.totalLiability, 4749.75);
  assert.equal(Object.hasOwn(paid.specialEvents[0], "payroll"), false);
  assert.equal(paid.monthlyTotal, 1250.25);
  assert.equal(paid.cumulatedTotal, 15250.25);
  assert.equal(result.at(-1)?.cumulatedTotal, 24250.25);
  assert.equal(original[14].taxRefund, 0);
});

it("posts a repayment as a signed event and a positive outflow transaction", () => {
  const repayment = { ...flow,
    settlement: toEuroAmount(-560),
    totalLiability: toEuroAmount(5560) };
  const result = applyAnnualTaxSettlements(months(), [repayment], toCalendarMonth(4));
  const paid = result[15];
  assert.equal(paid.taxRefund, -560);
  assert.equal(paid.monthlyTotal, 440);
  assert.equal(paid.specialEvents[0].amount, -560);
  const transaction = paid.transactions.find((item) => item.type === TransactionType.TaxReconciliationRefund);
  assert.equal(transaction?.direction, TransactionDirection.Outflow);
  assert.equal(transaction?.amount, 560);
  assert.equal(result.at(-1)?.cumulatedTaxRefunds, -560);
  assert.equal(result.at(-1)?.cumulatedTotal, 23440);
});

it("keeps later settlements outside the cash horizon and prevents duplicate posting", () => {
  const original = months();
  const outside = applyAnnualTaxSettlements(original, [{ ...flow,
    calendarYear: toFullCalendarYear(2027) }], toCalendarMonth(3));
  assert.equal(outside.at(-1)?.cumulatedTotal, 24000);
  const once = applyAnnualTaxSettlements(original, [flow], toCalendarMonth(3));
  assert.throws(() => applyAnnualTaxSettlements(once, [flow], toCalendarMonth(3)), /only be posted once/);
  assert.throws(() => applyAnnualTaxSettlements(original, [flow, flow], toCalendarMonth(3)), /duplicate tax years/);
});
