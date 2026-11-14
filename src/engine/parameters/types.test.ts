import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  PARAMETER_DOMAIN_LABELS,
  PARAMETER_MUTABILITY_LABELS,
  ParameterDomain,
  ParameterFlagCode,
  ParameterId,
  ParameterMutability,
  ParameterUnit,
  isParameterId,
  toParameterDomain,
  toParameterId,
  toParameterMutability,
  toParameterUnit,
} from "#engine/parameters/types";

describe("Unified parameter type system", () => {
  it("validates every ParameterId and rejects unknown identifiers", () => {
    const ids = Object.values(ParameterId);
    assert.equal(ids.length, 83);
    for (const id of ids) {
      assert.equal(toParameterId(id), id);
      assert.equal(isParameterId(id), true);
    }
    assert.equal(isParameterId("unknown.param"), false);
    assert.throws(() => toParameterId("unknown.param"), TypeError);
  });

  it("validates domain, mutability, unit, and flag enums", () => {
    for (const domain of Object.values(ParameterDomain)) {
      assert.equal(toParameterDomain(domain), domain);
      assert.ok(PARAMETER_DOMAIN_LABELS[domain].length > 0);
    }
    for (const mutability of Object.values(ParameterMutability)) {
      assert.equal(toParameterMutability(mutability), mutability);
      assert.ok(PARAMETER_MUTABILITY_LABELS[mutability].length > 0);
    }
    for (const unit of Object.values(ParameterUnit)) {
      assert.equal(toParameterUnit(unit), unit);
    }
    assert.equal(Object.values(ParameterFlagCode).length, 3);
    assert.throws(() => toParameterDomain("invalid"), TypeError);
    assert.throws(() => toParameterMutability("invalid"), TypeError);
    assert.throws(() => toParameterUnit("invalid"), TypeError);
  });
});
