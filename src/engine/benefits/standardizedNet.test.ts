import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  TaxClass,
  toGrossSalary,
  toFullCalendarYear,
  toTaxFactor,
  toMonthDuration,
} from "#engine/types";
import {
  toChildAllowanceFactor,
} from "#engine/tax/payroll";
import {
  computeBenefitContributionBase,
  computeStandardizedBenefitNet,
  selectBenefitTaxRules,
} from "#engine/benefits/standardizedNet";

const characteristics = { taxClass: TaxClass.III,
  factor: toTaxFactor(1),
  childFactor: toChildAllowanceFactor(0),
  churchTaxable: false };

it("separates January snapshot availability from retrospective payroll revisions", () => {
  assert.equal(selectBenefitTaxRules(toFullCalendarYear(2026)).rules, undefined);
  assert.match(selectBenefitTaxRules(toFullCalendarYear(2026)).reason ?? "", /January snapshot/);
  assert.equal(selectBenefitTaxRules(toFullCalendarYear(2027)).rules?.sourceYear, 2026);
  assert.equal(selectBenefitTaxRules(toFullCalendarYear(2028)).rules?.projected, true);
});

it("uses BEEG work expenses and 21-percent social deductions with independent PAP tax references", () => {
  // BMF API fixture: III/3000/PVZ=0 -> wage tax 38.33; V -> 632.33.
  const gross = toGrossSalary(3000);
  const net = computeStandardizedBenefitNet(gross, gross, characteristics, toFullCalendarYear(2027));
  assert.equal(net.net, 2229.17); // 3000 - 102.50 - 630 - 38.33
  assert.equal(computeStandardizedBenefitNet(gross, gross, { ...characteristics,
    taxClass: TaxClass.V }, toFullCalendarYear(2027)).net, 1635.17);
  assert.equal(computeStandardizedBenefitNet(gross, gross, { ...characteristics,
    churchTaxable: true }, toFullCalendarYear(2027)).net, 2226.1);
  assert.equal(computeStandardizedBenefitNet(gross, gross, characteristics, toFullCalendarYear(2026)).net, undefined);
});

it("matches the official transition-zone example and never applies ordinary contribution caps", () => {
  // Official BEEG guidelines § 2f.2.3.2: G=538, gross=1000 -> 877.35 contribution base.
  const exampleRules = toFullCalendarYear(2024);
  assert.equal(computeBenefitContributionBase(toGrossSalary(1000), exampleRules), 877.35);
  const rules = toFullCalendarYear(2026);
  assert.equal(computeBenefitContributionBase(toGrossSalary(20000), rules), 20000);
  assert.equal(computeBenefitContributionBase(toGrossSalary(603), rules), 0);
  assert.equal(computeBenefitContributionBase(toGrossSalary(2000), rules), 2000);
  assert.equal(computeStandardizedBenefitNet(toGrossSalary(0), toGrossSalary(0), characteristics, toFullCalendarYear(2027)).net, 0);
});

it("prorates income-side work expenses for assessment months without earnings", () => {
  // Six months at 6000 and six at zero average to 3000. Only six expense shares apply.
  const result = computeStandardizedBenefitNet(
    toGrossSalary(3000),
    toGrossSalary(3000),
    characteristics,
    toFullCalendarYear(2027),
    undefined,
    toMonthDuration(6),
  );
  assert.equal(result.net, 2280.42); // 3000 - 51.25 - 630 - independently referenced 38.33 PAP tax
});
