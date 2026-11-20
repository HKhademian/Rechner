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
  EvidenceStatus,
  PermanentResidencyRoute,
  addCalendarMonths,
  evaluateResidencyPreparation,
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

it("computes earliest EU Blue Card B1/A1 application date, expiry alerts and missing evidence", () => {
  const personId = toPersonId("p1");
  const events = [
    {
      id: toLifeEventId("permit-1"),
      kind: residencePermitModule.kind,
      personId,
      date: toLifeEventDate("2024-03-01"),
      status: LifeEventStatus.Actual,
      payload: {
        permitKind: ResidencePermitKind.EuBlueCard,
        issueDate: toLifeDate("2024-03-01"),
        expiryDate: toLifeDate("2026-06-01"),
        countryCode: "DE",
        label: "EU Blue Card",
      },
    },
    {
      id: toLifeEventId("absence-1"),
      kind: residenceInterruptionModule.kind,
      personId,
      date: toLifeEventDate("2025-02-01"),
      status: LifeEventStatus.Actual,
      payload: {
        days: 30,
        reason: "Family visit",
      },
    },
    {
      id: toLifeEventId("milestone-1"),
      kind: residenceMilestoneModule.kind,
      personId,
      date: toLifeEventDate("2025-11-15"),
      status: LifeEventStatus.Planned,
      payload: {
        target: ApplicationTarget.PermanentResidency,
        stage: ApplicationMilestoneStage.Preparing,
        title: "Prepare KVR documents",
      },
    },
  ];

  const b1 = evaluateResidencyPreparation({
    events,
    personId,
    asOf: toLifeDate("2026-02-01"),
    includePlanned: true,
    route: PermanentResidencyRoute.BlueCardB1,
    jurisdiction: JurisdictionCode.GermanyFederal,
    evidence: {
      hasLanguageCertificate: true,
      hasPensionHistoryProof: false,
      hasCivicTestCertificate: false,
      hasLivelihoodAndHousingProof: true,
    },
  });

  assert.equal(b1.supported, true);
  assert.equal(b1.requiredMonths, 21);
  assert.equal(b1.potentialEarliestApplicationDate, "2025-12-01");
  assert.equal(b1.totalAbsenceDays, 30);
  assert.equal(b1.hasLongAbsenceRisk, false);
  assert.equal(b1.expiringPermits.length, 1);
  assert.equal(b1.expiringPermits[0].expired, false);
  assert.equal(b1.milestones.length, 1);
  assert.equal(
    b1.evidenceChecklist.find((item) => item.id === "pension-contributions")?.status,
    EvidenceStatus.Missing,
  );
  assert.equal(
    b1.evidenceChecklist.find((item) => item.id === "absences")?.status,
    EvidenceStatus.NeedsAuthorityReview,
  );

  // Month clamping test: 2024-01-31 + 1 month -> 2024-02-29 (leap year)
  assert.equal(addCalendarMonths(toLifeDate("2024-01-31"), 1), "2024-02-29");
});

it("marks unsupported jurisdiction or pre-effective dates cleanly without claiming eligibility", () => {
  const result = evaluateResidencyPreparation({
    events: [],
    personId: toPersonId("p1"),
    asOf: toLifeDate("2026-02-01"),
    includePlanned: false,
    route: PermanentResidencyRoute.BlueCardA1,
    jurisdiction: JurisdictionCode.UnsupportedOther,
    evidence: {
      hasLanguageCertificate: false,
      hasPensionHistoryProof: false,
      hasCivicTestCertificate: false,
      hasLivelihoodAndHousingProof: false,
    },
  });

  assert.equal(result.supported, false);
  assert.equal(result.explanation.status, ExplanationStatus.Unsupported);
  assert.equal(result.potentialEarliestApplicationDate, undefined);
});
