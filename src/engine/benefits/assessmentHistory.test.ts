import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  TaxClass,
  toGrossSalary,
  toChildrenCount,
} from "#engine/types";
import {
  type AssessmentHistoryMonth,
  AssessmentExclusion,
  toAssessmentMonthOrdinal,
  buildAssessmentWindow,
} from "#engine/benefits/assessmentHistory";

const month = (value: number): AssessmentHistoryMonth => ({ ordinal: toAssessmentMonthOrdinal(value),
  regularGross: toGrossSalary(3000),
  taxClass: TaxClass.V,
  children: toChildrenCount(0),
  personal: {} });

it("selects twelve eligible months and keeps ordinary pay when a separate bonus exists", () => {
  const history = Array.from({ length: 15 }, (_, index) => month(index + 100));
  history[13] = { ...history[13],
    excluded: AssessmentExclusion.Maternity };
  history[12] = { ...history[12],
    excluded: AssessmentExclusion.OlderChildBenefit };
  const result = buildAssessmentWindow(history, toAssessmentMonthOrdinal(115));
  assert.deepEqual(result.records.map((record) => record.ordinal), [101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 114]);
  assert.equal(result.averageRegularGross, 3000);
  assert.equal(result.excluded.length, 2);
});

it("uses actual class history and freezes records against later edits", () => {
  const history = Array.from({ length: 12 }, (_, index) => ({ ...month(index + 100),
    taxClass: index < 6 ? TaxClass.V : TaxClass.III }));
  const result = buildAssessmentWindow(history, toAssessmentMonthOrdinal(112));
  assert.equal(result.taxClass, TaxClass.III);
  history[11] = { ...history[11],
    taxClass: TaxClass.V,
    regularGross: toGrossSalary(9000) };
  assert.equal(result.taxClass, TaxClass.III);
  assert.equal(result.averageRegularGross, 3000);
  assert.equal(result.records[11].regularGross, 3000);
});

it("reports missing history or repeats only the supplied initial baseline with provenance", () => {
  const history = [month(110), month(111)];
  const incomplete = buildAssessmentWindow(history, toAssessmentMonthOrdinal(112));
  assert.equal(incomplete.complete, false);
  assert.equal(incomplete.missing.length, 10);
  assert.equal(incomplete.averageRegularGross, undefined);
  const assumed = buildAssessmentWindow(history, toAssessmentMonthOrdinal(112), (ordinal) => ({ ...month(ordinal),
    ordinal }));
  assert.equal(assumed.complete, true);
  assert.equal(assumed.assumed.length, 10);
  assert.equal(assumed.averageRegularGross, 3000);
  assert.throws(() => buildAssessmentWindow([month(110), month(110)], toAssessmentMonthOrdinal(112)), TypeError);
});
