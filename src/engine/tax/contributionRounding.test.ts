import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  computeMonthlySocialSecurity, 
} from "#engine/tax/wageTax";
import {
  toGrossSalary,
  toPercentageRate,
} from "#engine/types";

it("rounds general health and the insurer supplement separately", () => {
  // BVV §2: https://www.gesetze-im-internet.de/beitrvv/BJNR113800006.html
  // 4166.67 × 7.3% = 304.16691 -> 304.17;
  // 4166.67 × 1.45% = 60.416715 -> 60.42. Sum 364.59, not 364.58.
  assert.equal(computeMonthlySocialSecurity(toGrossSalary(4166.67)).healthInsurance, 364.59);
  // Personal insurer supplement is still the total rate before equal sharing.
  assert.equal(computeMonthlySocialSecurity(
    toGrossSalary(4166.67), 
    0, 
    undefined,
    { healthSupplementTotalRate: toPercentageRate(0.025) },
  ).healthInsurance, 356.25);
});
