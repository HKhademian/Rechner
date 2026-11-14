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
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  getAllParameterDefinitions,
} from "#engine/parameters/registry";
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
  activeProjectionProfileId,
  activeStatutoryContext,
  dismissParameterModificationFlag,
  filteredResolvedParameters,
  flagLockedParameterAttempt,
  getGovernedResolvedParametersForLaw,
  lastParameterModificationFlag,
  modifyParameterValue,
  parameterModificationFlagHistory,
  projectedParameterView,
  resetAllParameterOverrides,
  resetParameterOverride,
  setParameterDomainFilter,
  setParameterMutabilityFilter,
  setParameterProjectionProfile,
  setParameterSearchQuery,
  setParameterYear,
  setShowProjectedOutDomains,
  showProjectedOutDomains,
} from "#store/parameterStore";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("parameterStore unified value observation, mutability guards, context & projections", () => {
  beforeEach(() => {
    setParameterProjectionProfile(FormProjectionProfileId.FullCatalog);
    resetAllParameterOverrides();
  });

  it("modifies and resets Customizable parameters while keeping activeStatutoryContext reactively synchronized", () => {
    assert.equal(activeParameterOverrideCount.peek(), 0);
    assert.equal(activeStatutoryContext.peek().overriddenParameterIds.length, 0);

    const result = modifyParameterValue(ParameterId.Tax_HealthSupplementTotalRate, 0.032);
    assert.equal(result.ok, true);
    assert.equal(activeParameterOverrideCount.peek(), 1);
    assert.equal(lastParameterModificationFlag.peek(), null);

    const ctx = activeStatutoryContext.peek();
    assert.equal(ctx.getParameterPercentageRate(ParameterId.Tax_HealthSupplementTotalRate), 0.032);
    assert.deepEqual(ctx.overriddenParameterIds, [ParameterId.Tax_HealthSupplementTotalRate]);

    const taxLawParams = getGovernedResolvedParametersForLaw(LawId.SGB5_241);
    const supplement = taxLawParams.find((p) => p.definition.id === ParameterId.Tax_HealthSupplementTotalRate);
    assert.equal(supplement?.activeValue, 0.032);
    assert.equal(supplement?.overridden, true);

    resetParameterOverride(ParameterId.Tax_HealthSupplementTotalRate);
    assert.equal(activeParameterOverrideCount.peek(), 0);
    assert.equal(activeStatutoryContext.peek().overriddenParameterIds.length, 0);
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
    assert.equal(activeStatutoryContext.peek().calendarYear, 2025);

    const tax2025Basic = getGovernedResolvedParametersForLaw(LawId.EStG_32a).find(
      (item) => item.definition.id === ParameterId.Tax_BasicAllowance,
    );
    assert.equal(tax2025Basic?.activeValue, 12096);
    assert.equal(
      activeStatutoryContext.peek().getParameterEuroAmount(ParameterId.Tax_BasicAllowance),
      12096,
    );

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

  it("applies Form Projection Profiles to hide out-of-focus domains by default while allowing expansion", () => {
    const totalCount = getAllParameterDefinitions().length;
    setParameterProjectionProfile(FormProjectionProfileId.NetPayFocus);
    assert.equal(activeProjectionProfileId.peek(), FormProjectionProfileId.NetPayFocus);
    assert.equal(showProjectedOutDomains.peek(), false);

    const focusedCount = projectedParameterView.peek().focusedParameters.length;
    assert.ok(focusedCount > 0 && focusedCount < totalCount);
    assert.equal(filteredResolvedParameters.peek().length, focusedCount);
    assert.equal(
      filteredResolvedParameters.peek().some(
        (item) => item.definition.domain === ParameterDomain.ParentalAllowance,
      ),
      false,
    );

    setShowProjectedOutDomains(true);
    assert.equal(filteredResolvedParameters.peek().length, totalCount);
  });
});
