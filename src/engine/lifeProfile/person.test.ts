import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  PersonRelationship,
  completedYearsOn,
  toLifeDate,
  toPersonId,
  upcomingBirthdays,
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

it("sorts upcoming birthdays across year boundaries and leap years", () => {
  const people = [
    {
      id: toPersonId("p1"),
      name: "Alex",
      birthDate: toLifeDate("1990-01-10"),
      relationship: PersonRelationship.Self,
    },
    {
      id: toPersonId("p2"),
      name: "Sam",
      birthDate: toLifeDate("2020-02-29"),
      relationship: PersonRelationship.Child,
    },
    {
      id: toPersonId("p3"),
      name: "Taylor",
    },
  ];
  const list = upcomingBirthdays(people, toLifeDate("2026-12-20"), 90);
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "Alex");
  assert.equal(list[0].nextBirthday, "2027-01-10");
  assert.equal(list[0].daysUntil, 21);
  assert.equal(list[0].turningAge, 37);
  assert.equal(list[1].name, "Sam");
  assert.equal(list[1].nextBirthday, "2027-03-01");
  assert.equal(list[1].turningAge, 7);
});
