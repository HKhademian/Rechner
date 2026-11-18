import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  completedYearsOn,
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";

it("validates person identifiers and Gregorian dates", () => {
  assert.equal(toPersonId("person-1"), "person-1");
  assert.throws(() => toPersonId(" "));
  assert.throws(() => toPersonId(" person-1"));
  assert.equal(toLifeDate("2000-02-29"), "2000-02-29");
  for (const invalid of ["1900-02-29", "2026-02-30", "2026-13-01", "0000-01-01", "2026-1-01"]) {
    assert.throws(() => toLifeDate(invalid));
  }
});

it("calculates completed years on the requested date without inventing unknown ages", () => {
  const birth = toLifeDate("2000-06-15");
  assert.equal(completedYearsOn(birth, toLifeDate("2026-06-14")), 25);
  assert.equal(completedYearsOn(birth, toLifeDate("2026-06-15")), 26);
  assert.equal(completedYearsOn(birth, toLifeDate("2000-06-15")), 0);
  assert.equal(completedYearsOn(birth, toLifeDate("1999-12-31")), undefined);
  assert.equal(completedYearsOn(undefined, toLifeDate("2026-06-15")), undefined);
  const leapBirth = toLifeDate("2000-02-29");
  assert.equal(completedYearsOn(leapBirth, toLifeDate("2025-02-28")), 24);
  assert.equal(completedYearsOn(leapBirth, toLifeDate("2025-03-01")), 25);
});
