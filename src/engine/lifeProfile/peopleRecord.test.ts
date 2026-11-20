import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  PeopleRecordStatus,
  decodePeopleRecord,
} from "#engine/lifeProfile/peopleRecord";

it("distinguishes missing, valid, malformed and future people records", () => {
  assert.equal(decodePeopleRecord(null).status, PeopleRecordStatus.Missing);
  const raw = JSON.stringify({ version: 1,
    people: [{ id: "person-1",
      name: "Alex",
      birthDate: "2000-02-29" }] });
  assert.deepEqual(decodePeopleRecord(raw).record, JSON.parse(raw));
  for (const invalid of ["{", "{}", '{"version":1,"people":[{"id":"a","name":"A","birthDate":"2025-02-29"}]}', '{"version":1,"people":[{"id":"a","name":"A"},{"id":"a","name":"B"}]}']) {
    assert.equal(decodePeopleRecord(invalid).status, PeopleRecordStatus.Invalid);
  }
  for (const future of ['{"version":2,"people":[]}', '{"version":1,"people":[],"extra":true}', '{"version":1,"people":[{"id":"a","name":"A","extra":true}]}']) {
    assert.equal(decodePeopleRecord(future).status, PeopleRecordStatus.Unsupported);
  }
  const withRelationship = JSON.stringify({
    version: 1,
    people: [
      {
        id: "p1",
        name: "Alex",
        relationship: "partner",
      },
    ],
  });
  assert.equal(decodePeopleRecord(withRelationship).status, PeopleRecordStatus.Valid);
  assert.equal(decodePeopleRecord(withRelationship).record?.people[0].relationship, "partner");
  assert.equal(
    decodePeopleRecord('{"version":1,"people":[{"id":"p1","name":"Alex","relationship":"unknown"}]}').status,
    PeopleRecordStatus.Invalid,
  );
});
