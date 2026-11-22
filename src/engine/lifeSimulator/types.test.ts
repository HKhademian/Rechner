import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  CompanyCarPowertrain,
  DisasterKind,
  HealthInsuranceKind,
  JobEndCause,
  LifeDeadlineSeverity,
  LifeEventDomain,
  LifeEventKind,
  LifePersonKey,
  LifeScenarioKey,
  ParentalLeavePlanMode,
  ResidencyMilestoneKind,
  ResidencyPermitBaseline,
  SolvencyVerdict,
  TaxBucket,
  toCompanyCarPowertrain,
  toDisasterKind,
  toHealthInsuranceKind,
  toJobEndCause,
  toLifeDeadlineSeverity,
  toLifeEventDomain,
  toLifeEventId,
  toLifeEventKind,
  toLifePersonKey,
  toLifeScenarioKey,
  toParentalLeavePlanMode,
  toResidencyMilestoneKind,
  toResidencyPermitBaseline,
  toSolvencyVerdict,
  toTaxBucket,
} from "#engine/lifeSimulator/types";

describe("lifeSimulator/types validators", () => {
  it("validates LifeEventId and rejects blank identifiers", () => {
    assert.equal(toLifeEventId("  EV-1  "), "EV-1");
    assert.throws(() => toLifeEventId("   "), TypeError);
  });

  it("validates every const enum strictly and rejects unknown strings", () => {
    assert.equal(toLifePersonKey("PRIMARY"), LifePersonKey.Primary);
    assert.throws(() => toLifePersonKey("OTHER"), TypeError);

    assert.equal(toLifeScenarioKey("STRESS_TEST"), LifeScenarioKey.StressTest);
    assert.throws(() => toLifeScenarioKey("UNKNOWN"), TypeError);

    assert.equal(toLifeEventDomain("HOUSING_ASSET"), LifeEventDomain.HousingAsset);
    assert.throws(() => toLifeEventDomain("INVALID"), TypeError);

    assert.equal(toLifeEventKind("HOME_PURCHASE"), LifeEventKind.HomePurchase);
    assert.throws(() => toLifeEventKind("INVALID"), TypeError);

    assert.equal(toTaxBucket("PROGRESSION_BENEFIT_32B"), TaxBucket.ProgressionBenefit32b);
    assert.throws(() => toTaxBucket("INVALID"), TypeError);

    assert.equal(toJobEndCause("VOLUNTARY_RESIGNATION"), JobEndCause.VoluntaryResignation);
    assert.throws(() => toJobEndCause("INVALID"), TypeError);

    assert.equal(toParentalLeavePlanMode("PLUS"), ParentalLeavePlanMode.Plus);
    assert.throws(() => toParentalLeavePlanMode("INVALID"), TypeError);

    assert.equal(toDisasterKind("EMPLOYER_TERMINATION"), DisasterKind.EmployerTermination);
    assert.throws(() => toDisasterKind("INVALID"), TypeError);

    assert.equal(toSolvencyVerdict("RESILIENT"), SolvencyVerdict.Resilient);
    assert.throws(() => toSolvencyVerdict("INVALID"), TypeError);

    assert.equal(toLifeDeadlineSeverity("CRITICAL"), LifeDeadlineSeverity.Critical);
    assert.throws(() => toLifeDeadlineSeverity("INVALID"), TypeError);

    assert.equal(toResidencyMilestoneKind("CITIZENSHIP_10_STAG"), ResidencyMilestoneKind.Citizenship10StAG);
    assert.throws(() => toResidencyMilestoneKind("INVALID"), TypeError);

    assert.equal(toCompanyCarPowertrain("ELECTRIC"), CompanyCarPowertrain.Electric);
    assert.throws(() => toCompanyCarPowertrain("INVALID"), TypeError);

    assert.equal(toHealthInsuranceKind("PRIVATE_PKV"), HealthInsuranceKind.PrivatePkv);
    assert.throws(() => toHealthInsuranceKind("INVALID"), TypeError);

    assert.equal(toResidencyPermitBaseline("EU_BLUE_CARD"), ResidencyPermitBaseline.EuBlueCard);
    assert.throws(() => toResidencyPermitBaseline("INVALID"), TypeError);
  });
});
