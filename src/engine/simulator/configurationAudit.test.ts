import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  runScenarioBatches,
} from "#engine/simulator/timelineGenerator";
import {
  createBenefitRules,
} from "#engine/config/benefitRules";
import {
  standardPreexistingConditions,
} from "../../../test/fixture/standardHouseholds.ts";
import {
  ScenarioId,
  SalaryInputMode,
  toGrossSalary,
  toMonthDuration,
} from "#engine/types";

it("retains the actual configured values, source links and future-year projection provenance", () => {
  const result = runScenarioBatches({ scenarioKey: ScenarioId.A,
    pregnancies: [],
    taxClassSwitches: [],
    salaryRaises: [],
    preexisting: { ...standardPreexistingConditions,
      householdTaxableIncome: undefined,
      salaryInputMode: SalaryInputMode.Gross,
      husbandGross: toGrossSalary(4000),
      wifeGross: toGrossSalary(3000),
      simulationDurationMonths: toMonthDuration(13),
      benefitRules: createBenefitRules({ basisMinimum: 310 }) } });
  const exported = JSON.parse(JSON.stringify(result));
  assert.equal(exported.configuration.benefitRules.basisMinimum.value, 310);
  assert.equal(exported.configuration.benefitRules.basisMinimum.overridden, true);
  assert.match(exported.configuration.benefitRules.basisMinimum.source, /beeg\/__2/);
  assert.equal(exported.configuration.taxProfiles[1].calendarYear, 2027);
  assert.equal(exported.configuration.taxProfiles[1].sourceYear, 2026);
  assert.equal(exported.configuration.taxProfiles[1].projected, true);
  assert.match(exported.configuration.taxProfiles[1].parameters.basicAllowance.source, /https:/);
  assert.ok(result.assumptions?.some((note) => note.includes("Overridden benefit rule assumption")));
});
