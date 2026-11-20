import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  type LifeDate,
  type PersonId,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type ResidenceMilestonePayload,
  ApplicationTarget,
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  type EvidenceChecklistItem,
  EvidenceStatus,
  addCalendarMonths,
} from "#engine/lifeProfile/residencyPreparation";
import {
  type EffectiveRuleEntry,
  JurisdictionCode,
  RuleResolutionStatus,
  resolveEffectiveRule,
} from "#engine/lifeProfile/statutoryRuleResolver";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";

export const CitizenshipPathway = {
  StandardFiveYear: "standard-5-year",
  SpousalThreeYear: "spousal-3-year",
} as const;
export type CitizenshipPathway = (typeof CitizenshipPathway)[keyof typeof CitizenshipPathway];

export function toCitizenshipPathway(value: string): CitizenshipPathway {
  if (!Object.values(CitizenshipPathway).includes(value as CitizenshipPathway)) {
    throw new TypeError("Invalid citizenship pathway.");
  }
  return value as CitizenshipPathway;
}

export interface CitizenshipDocumentFlags {
  readonly hasValidIdentityAndPassport: boolean;
  readonly hasLanguageB1Certificate: boolean;
  readonly hasNaturalizationTest: boolean;
  readonly hasIndependentLivelihoodProof: boolean;
  readonly hasCivilStatusCertificates: boolean;
  readonly hasEligibleResidenceTitle: boolean;
}

export interface CitizenshipPreparationInput {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly asOf: LifeDate;
  readonly includePlanned: boolean;
  readonly pathway: CitizenshipPathway;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection?: boolean;
  readonly documents: CitizenshipDocumentFlags;
}

interface CitizenshipPathwayRule {
  readonly requiredMonths: number;
  readonly statuteLabel: string;
  readonly languageRequirement: string;
}

export interface CitizenshipPreparationResult {
  readonly pathway: CitizenshipPathway;
  readonly supported: boolean;
  readonly requiredMonths?: number;
  readonly residenceStartDate?: LifeDate;
  readonly potentialEarliestApplicationDate?: LifeDate;
  readonly totalAbsenceDays: number;
  readonly hasContinuityRisk: boolean;
  readonly citizenshipMilestones: readonly {
    readonly date?: string;
    readonly payload: ResidenceMilestonePayload;
  }[];
  readonly checklist: readonly EvidenceChecklistItem[];
  readonly explanation: CalculationExplanation;
}

export const CITIZENSHIP_PREP_FORMULA_VERSION = toFormulaVersion("de-stag-10-v1");

const STAG_10_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/stag/__10.html");
const STAG_9_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/stag/__9.html");

const PATHWAY_RULES: Readonly<Record<CitizenshipPathway, readonly EffectiveRuleEntry<CitizenshipPathwayRule>[]>> = Object.freeze({
  [CitizenshipPathway.StandardFiveYear]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2024-06-27"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 60,
        statuteLabel: "§ 10 Abs. 1 StAG (Standard naturalization · 5 years)",
        languageRequirement: "German B1",
      }),
      label: "Germany standard naturalization residence requirement (60 months)",
      sourceUrl: STAG_10_SOURCE,
      lawIds: Object.freeze([]),
    }),
  ]),
  [CitizenshipPathway.SpousalThreeYear]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2024-06-27"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 36,
        statuteLabel: "§ 9 StAG (Spouse of German citizen · 3 years residence, 2 years marriage)",
        languageRequirement: "German B1",
      }),
      label: "Germany spousal naturalization residence requirement (36 months + 24 months marriage)",
      sourceUrl: STAG_9_SOURCE,
      lawIds: Object.freeze([]),
    }),
  ]),
});

/** Evaluates recorded residence history, absences, documents and milestones for German citizenship preparation. */
export function evaluateCitizenshipPreparation(input: CitizenshipPreparationInput): CitizenshipPreparationResult {
  const relevant = input.events.filter((event) => event.personId === input.personId
    && (input.includePlanned || event.status === LifeEventStatus.Actual));

  const permitDates: LifeDate[] = [];
  let totalAbsenceDays = 0;
  let hasContinuityRisk = false;
  const citizenshipMilestones: { readonly date?: string;
    readonly payload: ResidenceMilestonePayload }[] = [];

  for (const event of relevant) {
    if (event.kind === residencePermitModule.kind) {
      const permit = residencePermitModule.parsePayload(event.payload);
      const start = permit.issueDate ?? (event.date?.length === 10 ? toLifeDate(event.date) : undefined);
      if (start) {
        permitDates.push(start);
      }
    }
    else if (event.kind === residenceInterruptionModule.kind) {
      const absence = residenceInterruptionModule.parsePayload(event.payload);
      totalAbsenceDays += absence.days;
      if (absence.days >= 180) {
        hasContinuityRisk = true;
      }
    }
    else if (event.kind === residenceMilestoneModule.kind) {
      const milestone = residenceMilestoneModule.parsePayload(event.payload);
      if (milestone.target === ApplicationTarget.Citizenship) {
        citizenshipMilestones.push({
          ...(event.date ? { date: event.date } : {}),
          payload: milestone,
        });
      }
    }
  }

  permitDates.sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const residenceStartDate = permitDates[0];

  const ruleResolution = resolveEffectiveRule(PATHWAY_RULES[input.pathway], {
    date: input.asOf,
    jurisdiction: input.jurisdiction,
    allowProjection: input.allowProjection,
  });

  if (ruleResolution.status === RuleResolutionStatus.Unsupported) {
    return Object.freeze({
      pathway: input.pathway,
      supported: false,
      ...(residenceStartDate ? { residenceStartDate } : {}),
      totalAbsenceDays,
      hasContinuityRisk,
      citizenshipMilestones: Object.freeze(citizenshipMilestones),
      checklist: Object.freeze([]),
      explanation: Object.freeze({
        kind: ExplanationFormulaKind.Statutory,
        status: ExplanationStatus.Unsupported,
        formulaName: "Citizenship Preparation Check",
        formulaExpression: "earliestDate = lawfulResidenceStart + requiredMonths (subject to § 10 / § 9 StAG)",
        formulaVersion: CITIZENSHIP_PREP_FORMULA_VERSION,
        jurisdiction: input.jurisdiction,
        effectiveDate: input.asOf,
        unsupportedReason: `No verified citizenship rule applies for jurisdiction ${input.jurisdiction} on ${input.asOf}.`,
        inputs: Object.freeze([
          {
            label: "Selected pathway",
            value: input.pathway,
            source: "User selection",
          },
        ]),
        parameters: Object.freeze([]),
        lawIds: Object.freeze([]),
        topicIds: Object.freeze([]),
        assumptions: Object.freeze([
          "Only Germany federal StAG routes effective from 2024-06-27 (StARModG) are modeled.",
          "Naturalization eligibility is decided solely by the local Einbürgerungsbehörde.",
        ]),
      }),
    });
  }

  const rule = ruleResolution.entry.value;
  const potentialEarliestApplicationDate = residenceStartDate
    ? addCalendarMonths(residenceStartDate, rule.requiredMonths)
    : undefined;

  const checklist: EvidenceChecklistItem[] = [
    {
      id: "residence-start",
      label: "Lawful ordinary residence history",
      status: residenceStartDate ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: residenceStartDate
        ? `Earliest recorded residence permit starts ${residenceStartDate} (target: ${rule.requiredMonths} months).`
        : "Record your earliest residence permit start date in the timeline to estimate the timeline.",
    },
    {
      id: "eligible-title",
      label: "Eligible residence status at application (e.g. permanent residency or eligible non-student title)",
      status: input.documents.hasEligibleResidenceTitle ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasEligibleResidenceTitle
        ? "Eligible residence title confirmed."
        : "Verify that your permit is eligible for naturalization under § 10 Abs. 1 Nr. 2 StAG.",
    },
    {
      id: "identity-passport",
      label: "Clarified identity, valid passport and Meldebescheinigung",
      status: input.documents.hasValidIdentityAndPassport ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasValidIdentityAndPassport
        ? "Identity & passport documents ready."
        : "Prepare valid passport, current registration certificate and birth certificate.",
    },
    {
      id: "language-b1",
      label: `Language proof (${rule.languageRequirement})`,
      status: input.documents.hasLanguageB1Certificate ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasLanguageB1Certificate
        ? "B1 or higher language certificate ready."
        : "Obtain a recognized B1 certificate (e.g. telc, Goethe, TestDaF or German degree).",
    },
    {
      id: "naturalization-test",
      label: "Einbürgerungstest / Leben in Deutschland certificate",
      status: input.documents.hasNaturalizationTest ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasNaturalizationTest
        ? "Naturalization test certificate ready."
        : "Book and pass the Einbürgerungstest or document statutory exemption.",
    },
    {
      id: "livelihood",
      label: "Independent livelihood without Bürgergeld / Sozialhilfe",
      status: input.documents.hasIndependentLivelihoodProof ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasIndependentLivelihoodProof
        ? "Income, tax assessment and pension proof ready."
        : "Gather recent payslips, employment confirmation, tax assessments and rent/insurance proof.",
    },
    {
      id: "civil-status",
      label: "Translated / apostilled birth and marriage certificates (if applicable)",
      status: input.documents.hasCivilStatusCertificates ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.documents.hasCivilStatusCertificates
        ? "Civil status documents ready."
        : "Check local Einbürgerungsbehörde requirements for certified translations or apostilles.",
    },
  ];

  if (totalAbsenceDays > 0) {
    checklist.push({
      id: "residence-absences",
      label: "Absences abroad (§ 12b StAG continuity)",
      status: EvidenceStatus.NeedsAuthorityReview,
      detail: hasContinuityRisk
        ? `${totalAbsenceDays} absence days recorded including a >=180-day stay abroad. Confirm continuity under § 12b StAG with the Einbürgerungsbehörde.`
        : `${totalAbsenceDays} absence days recorded (each under 180 days). Confirm local documentation requirements.`,
    });
  }

  return Object.freeze({
    pathway: input.pathway,
    supported: true,
    requiredMonths: rule.requiredMonths,
    ...(residenceStartDate ? { residenceStartDate } : {}),
    ...(potentialEarliestApplicationDate ? { potentialEarliestApplicationDate } : {}),
    totalAbsenceDays,
    hasContinuityRisk,
    citizenshipMilestones: Object.freeze(citizenshipMilestones),
    checklist: Object.freeze(checklist),
    explanation: Object.freeze({
      kind: ExplanationFormulaKind.Statutory,
      status: ruleResolution.status === RuleResolutionStatus.Projected
        ? ExplanationStatus.Projected
        : ExplanationStatus.Supported,
      formulaName: "Germany Citizenship Preparation Estimate",
      formulaExpression: `potentialEarliestDate = earliestLawfulResidence + ${rule.requiredMonths} calendar months`,
      formulaVersion: CITIZENSHIP_PREP_FORMULA_VERSION,
      jurisdiction: input.jurisdiction,
      effectiveDate: input.asOf,
      inputs: Object.freeze([
        {
          label: "Selected pathway",
          value: rule.statuteLabel,
          source: "User selection",
        },
        {
          label: "Earliest recorded residence permit",
          value: residenceStartDate ?? "Missing",
          source: "Timeline residence.permit entries",
        },
        {
          label: "Recorded absences",
          value: `${totalAbsenceDays} days`,
          source: "Timeline residence.interruption entries",
        },
      ]),
      parameters: Object.freeze([
        Object.freeze({
          label: ruleResolution.entry.label,
          value: `${rule.requiredMonths} months (${rule.languageRequirement})`,
          jurisdiction: ruleResolution.entry.jurisdiction,
          effectiveFrom: ruleResolution.entry.effectiveFrom,
          effectiveTo: ruleResolution.entry.effectiveTo,
          status: ruleResolution.status,
          sourceUrl: ruleResolution.entry.sourceUrl,
          lawIds: ruleResolution.entry.lawIds,
        }),
      ]),
      lawIds: Object.freeze([]),
      topicIds: Object.freeze([]),
      assumptions: Object.freeze([
        "Assumes continuous lawful ordinary residence in Germany and fulfillment of statutory StAG criteria.",
        "Absences over 6 months (§ 12b StAG) or ineligible permit periods may interrupt or reduce credited residence.",
        "This preparation checklist is informational and not a legal determination by an Einbürgerungsbehörde.",
      ]),
    }),
  });
}
