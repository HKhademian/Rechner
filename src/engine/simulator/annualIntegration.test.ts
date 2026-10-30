import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  SalaryInputMode,
  ScenarioId,
  TaxClass,
  TransactionDirection,
  TransactionType,
  toGrossSalary,
  toMonthDuration,
  toTaxFactor,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

const base = { scenarioKey: ScenarioId.A,
  pregnancies: [],
  taxClassSwitches: [],
  salaryRaises: [],
  preexisting: { ...standardPreexistingConditions,
    householdTaxableIncome: undefined,
    salaryInputMode: SalaryInputMode.Gross,
    husbandGross: toGrossSalary(5000),
    husbandInitialTaxClass: TaxClass.I,
    wifeGross: toGrossSalary(0),
    simulationDurationMonths: toMonthDuration(24),
    enable13thSalary: false } };

it("receives an independently worked settlement once and discloses the last year's unpaid balance", () => {
  // BMF monthlyI/5000=782.41 paid tax,3130.09 cash net; annual credits9389 less joint tax4820=4569.
  const result = runScenarioBatches(base);
  assert.equal(result.months[2].taxRefund, 0); // No prior-year records establish an opening refund.
  assert.equal(result.months[14].taxRefund, 4569);
  assert.equal(result.summary.totalTaxRefunds, 4569);
  assert.equal(result.summary.grandTotal, 79691.16); // 24×3130.09+4569
  assert.equal(result.taxComplete, true);
  const finalYear = result.annualTaxRecords?.at(-1);
  assert.equal(finalYear?.assessment?.settlement, 4569);
  assert.equal(finalYear?.settlementMonthId, "M03.2028");
  assert.equal(finalYear?.scheduledMonthInHorizon, false);
});

it("receives a signed repayment when a supplied factor leaves tax underwithheld", () => {
  // A supplied zero withholding factor can become inadequate after income changes.
  // Actual annual taxable income46638 still owes4820 joint ESt; no tax was withheld.
  const result = runScenarioBatches({ ...base,
    preexisting: { ...base.preexisting,
      husbandInitialTaxClass: TaxClass.IV,
      wifeInitialTaxClass: TaxClass.IV,
      initialUseTaxFactor: true,
      initialTaxFactor: toTaxFactor(0) } });
  const paid = result.months[14];
  assert.equal(paid.taxRefund, -4820);
  assert.equal(paid.specialEvents.find((event) => event.taxSettlement)?.amount, -4820);
  const transaction = paid.transactions.find((item) => item.type === TransactionType.TaxReconciliationRefund);
  assert.equal(transaction?.direction, TransactionDirection.Outflow);
  assert.equal(transaction?.amount, 4820);
  assert.equal(result.summary.totalTaxRefunds, -4820);
  assert.equal(result.summary.grandTotal, 89080); // 24×3912.50-4820
});

it("does not convert supplied investment cash into precise annual tax data", () => {
  const result = runScenarioBatches({ ...base,
    preexisting: { ...base.preexisting,
      investmentReturnMonthly: toEuroAmount(10) } });
  assert.equal(result.taxComplete, false);
  assert.equal(result.summary.totalTaxRefunds, 0);
  assert.ok(result.annualTaxRecords?.[0].reasons.some((reason) => reason.includes("Capital-income")));
});


it("does not claim a precise settlement when supplied taxable income contradicts the employment model", () => {
  const result = runScenarioBatches({ ...base,
    preexisting: { ...base.preexisting,
      householdTaxableIncome: [{ calendarYear: toFullCalendarYear(2026),
        taxableIncome: toEuroAmount(175000.01) }] } });
  assert.equal(result.taxComplete, false);
  assert.equal(result.months[14].taxRefund, 0);
  assert.equal(result.annualTaxRecords?.[0].assessment, undefined);
  assert.ok(result.annualTaxRecords?.[0].reasons.some((reason) => reason.includes("differs from the modeled")));
});
