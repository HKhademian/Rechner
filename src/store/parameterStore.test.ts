import assert from "node:assert/strict";
import {
  beforeEach,
  describe,
  it,
} from "node:test";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterDomain,
  ParameterFlagCode,
  ParameterId,
  ParameterMutability,
} from "#engine/parameters/types";
import {
  activeParameterDomainFilter,
  activeParameterMutabilityFilter,
  activeParameterOverrideCount,
  activeParameterSearchQuery,
  activeParameterYear,
  dismissParameterModificationFlag,
  filteredResolvedParameters,
  flagLockedParameterAttempt,
  getGovernedResolvedParametersForLaw,
  lastParameterModificationFlag,
  modifyParameterValue,
  parameterModificationFlagHistory,
  resetAllParameterOverrides,
  resetParameterOverride,
  setParameterDomainFilter,
  setParameterMutabilityFilter,
  setParameterSearchQuery,
  setParameterYear,
} from "#store/parameterStore";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("parameterStore unified value observation & mutability guards", () => {
  beforeEach(() => {
    resetAllParameterOverrides();
  });

  it("modifies and resets Customizable parameters while tracking active overrides", () => {
    assert.equal(activeParameterOverrideCount.peek(), 0);
    const result = modifyParameterValue(ParameterId.Tax_HealthSupplementTotalRate, 0.032);
    assert.equal(result.ok, true);
    assert.equal(activeParameterOverrideCount.peek(), 1);
    assert.equal(lastParameterModificationFlag.peek(), null);

    const taxLawParams = getGovernedResolvedParametersForLaw(LawId.SGB5_241);
    const supplement = taxLawParams.find((p) => p.definition.id === ParameterId.Tax_HealthSupplementTotalRate);
    assert.equal(supplement?.activeValue, 0.032);
    assert.equal(supplement?.overridden, true);

    resetParameterOverride(ParameterId.Tax_HealthSupplementTotalRate);
    assert.equal(activeParameterOverrideCount.peek(), 0);
  });

  it("raises and records an explicit flag whenever unmodifiable statutory parameters are modified", () => {
    const fixedAttempt = modifyParameterValue(ParameterId.Benefit_BasisMaximum, 2200);
    assert.equal(fixedAttempt.ok, false);
    assert.equal(lastParameterModificationFlag.peek()?.code, ParameterFlagCode.StatutoryFixedLocked);
    assert.ok(lastParameterModificationFlag.peek()?.lawIds.includes(LawId.BEEG_2));
    assert.equal(activeParameterOverrideCount.peek(), 0);

    const yearIndexedAttempt = flagLockedParameterAttempt(ParameterId.Tax_BasicAllowance, 14000);
    assert.equal(yearIndexedAttempt.ok, false);
    assert.equal(lastParameterModificationFlag.peek()?.code, ParameterFlagCode.YearIndexedLocked);
    assert.equal(parameterModificationFlagHistory.peek().length, 2);

    dismissParameterModificationFlag();
    assert.equal(lastParameterModificationFlag.peek(), null);
  });

  it("switches active parameter year and filters by domain, mutability, and query", () => {
    setParameterYear(toFullCalendarYear(2025));
    assert.equal(activeParameterYear.peek(), 2025);
    const tax2025Basic = getGovernedResolvedParametersForLaw(LawId.EStG_32a).find(
      (item) => item.definition.id === ParameterId.Tax_BasicAllowance,
    );
    assert.equal(tax2025Basic?.activeValue, 12096);

    setParameterDomainFilter(ParameterDomain.PlanningAssumptions);
    setParameterMutabilityFilter(ParameterMutability.Customizable);
    setParameterSearchQuery("partnership");
    assert.equal(activeParameterDomainFilter.peek(), ParameterDomain.PlanningAssumptions);
    assert.equal(activeParameterMutabilityFilter.peek(), ParameterMutability.Customizable);
    assert.equal(activeParameterSearchQuery.peek(), "partnership");
    assert.equal(filteredResolvedParameters.peek().length, 1);
    assert.equal(
      filteredResolvedParameters.peek()[0].definition.id,
      ParameterId.Convention_PartnershipBonusMonths,
    );
  });
});
