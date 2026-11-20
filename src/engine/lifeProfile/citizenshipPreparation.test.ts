import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  ApplicationMilestoneStage,
  ApplicationTarget,
  ResidencePermitKind,
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  CitizenshipPathway,
  evaluateCitizenshipPreparation,
} from "#engine/lifeProfile/citizenshipPreparation";
import {
  EvidenceStatus,
} from "#engine/lifeProfile/residencyPreparation";
import {
  JurisdictionCode,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  ExplanationStatus,
} from "#engine/lifeProfile/calculationExplanation";

it("computes 5-year standard citizenship earliest date, continuity risk and milestones", () => {
  const personId = toPersonId("p1");
  const events = [
    {
      id: toLifeEventId("permit-1"),
      kind: residencePermitModule.kind,
      personId,
      date: toLifeEventDate("2022-04-01"),
      status: LifeEventStatus.Actual,
      payload: {
        permitKind: ResidencePermitKind.EuBlueCard,
        issueDate: toLifeDate("2022-04-01"),
      },
    },
    {
      id: toLifeEventId("absence-1"),
      kind: residenceInterruptionModule.kind,
      personId,
      date: toLifeEventDate("2024-01-10"),
      status: LifeEventStatus.Actual,
      payload: {
        days: 195,
        reason: "Sabbatical abroad",
      },
    },
    {
      id: toLifeEventId("milestone-1"),
      kind: residenceMilestoneModule.kind,
      personId,
      date: toLifeEventDate("2027-02-01"),
      status: LifeEventStatus.Planned,
      payload: {
        target: ApplicationTarget.Citizenship,
        stage: ApplicationMilestoneStage.Preparing,
        title: "Book Einbürgerungstest",
      },
    },
  ];

  const result = evaluateCitizenshipPreparation({
    events,
    personId,
    asOf: toLifeDate("2026-03-01"),
    includePlanned: true,
    pathway: CitizenshipPathway.StandardFiveYear,
    jurisdiction: JurisdictionCode.GermanyFederal,
    documents: {
      hasValidIdentityAndPassport: true,
      hasLanguageB1Certificate: true,
      hasNaturalizationTest: false,
      hasIndependentLivelihoodProof: true,
      hasCivilStatusCertificates: false,
      hasEligibleResidenceTitle: true,
    },
  });

  assert.equal(result.supported, true);
  assert.equal(result.requiredMonths, 60);
  assert.equal(result.potentialEarliestApplicationDate, "2027-04-01");
  assert.equal(result.hasContinuityRisk, true);
  assert.equal(result.citizenshipMilestones.length, 1);
  assert.equal(
    result.checklist.find((item) => item.id === "naturalization-test")?.status,
    EvidenceStatus.Missing,
  );
  assert.equal(
    result.checklist.find((item) => item.id === "residence-absences")?.status,
    EvidenceStatus.NeedsAuthorityReview,
  );
});

it("marks dates prior to StARModG effective date (2024-06-27) or non-DE jurisdictions as unsupported", () => {
  const preLaw = evaluateCitizenshipPreparation({
    events: [],
    personId: toPersonId("p1"),
    asOf: toLifeDate("2024-05-01"),
    includePlanned: false,
    pathway: CitizenshipPathway.StandardFiveYear,
    jurisdiction: JurisdictionCode.GermanyFederal,
    documents: {
      hasValidIdentityAndPassport: false,
      hasLanguageB1Certificate: false,
      hasNaturalizationTest: false,
      hasIndependentLivelihoodProof: false,
      hasCivilStatusCertificates: false,
      hasEligibleResidenceTitle: false,
    },
  });
  assert.equal(preLaw.supported, false);
  assert.equal(preLaw.explanation.status, ExplanationStatus.Unsupported);
});
