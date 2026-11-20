import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  LawId,
} from "#engine/laws/types";
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
  type ResidenceInterruptionPayload,
  type ResidenceMilestonePayload,
  type ResidencePermitPayload,
  ResidencePermitKind,
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
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

export const PermanentResidencyRoute = {
  BlueCardB1: "blue-card-b1",
  BlueCardA1: "blue-card-a1",
  SkilledWorkerGermanGraduate: "skilled-worker-german-graduate",
  SkilledWorkerStandard: "skilled-worker-standard",
} as const;
export type PermanentResidencyRoute = (typeof PermanentResidencyRoute)[keyof typeof PermanentResidencyRoute];

export function toPermanentResidencyRoute(value: string): PermanentResidencyRoute {
  if (!Object.values(PermanentResidencyRoute).includes(value as PermanentResidencyRoute)) {
    throw new TypeError("Invalid permanent residency route.");
  }
  return value as PermanentResidencyRoute;
}

export const EvidenceStatus = {
  Recorded: "recorded",
  Missing: "missing",
  NeedsAuthorityReview: "needs-authority-review",
} as const;
export type EvidenceStatus = (typeof EvidenceStatus)[keyof typeof EvidenceStatus];

export interface EvidenceChecklistItem {
  readonly id: string;
  readonly label: string;
  readonly status: EvidenceStatus;
  readonly detail: string;
}

export interface PermitExpiryAlert {
  readonly permitKind: ResidencePermitKind;
  readonly label?: string;
  readonly expiryDate: LifeDate;
  readonly daysRemaining: number;
  readonly expired: boolean;
}

export interface ResidencyEvidenceFlags {
  readonly hasLanguageCertificate: boolean;
  readonly hasPensionHistoryProof: boolean;
  readonly hasCivicTestCertificate: boolean;
  readonly hasLivelihoodAndHousingProof: boolean;
}

export interface ResidencyPreparationInput {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly asOf: LifeDate;
  readonly includePlanned: boolean;
  readonly route: PermanentResidencyRoute;
  readonly jurisdiction: JurisdictionCode;
  readonly allowProjection?: boolean;
  readonly evidence: ResidencyEvidenceFlags;
}

interface ResidencyRouteRule {
  readonly requiredMonths: number;
  readonly requiredLanguage: string;
  readonly qualifyingPermits: readonly ResidencePermitKind[];
  readonly statuteLabel: string;
}

export interface ResidencyPreparationResult {
  readonly route: PermanentResidencyRoute;
  readonly supported: boolean;
  readonly requiredMonths?: number;
  readonly qualifyingStartDate?: LifeDate;
  readonly potentialEarliestApplicationDate?: LifeDate;
  readonly totalAbsenceDays: number;
  readonly hasLongAbsenceRisk: boolean;
  readonly permitCount: number;
  readonly expiringPermits: readonly PermitExpiryAlert[];
  readonly milestones: readonly {
    readonly date?: string;
    readonly payload: ResidenceMilestonePayload;
  }[];
  readonly evidenceChecklist: readonly EvidenceChecklistItem[];
  readonly explanation: CalculationExplanation;
}

export const RESIDENCY_PREP_FORMULA_VERSION = toFormulaVersion("de-aufenthg-18c-v1");

const AUFENTHG_18C_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/aufenthg_2004/__18c.html");

const ROUTE_RULES: Readonly<Record<PermanentResidencyRoute, readonly EffectiveRuleEntry<ResidencyRouteRule>[]>> = Object.freeze({
  [PermanentResidencyRoute.BlueCardB1]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2023-11-18"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 21,
        requiredLanguage: "German B1",
        qualifyingPermits: Object.freeze([ResidencePermitKind.EuBlueCard]),
        statuteLabel: "§ 18c Abs. 2 S. 3 AufenthG (EU Blue Card + B1)",
      }),
      label: "EU Blue Card permanent residency threshold (21 months, B1)",
      sourceUrl: AUFENTHG_18C_SOURCE,
      lawIds: Object.freeze([LawId.AufenthG_18c, LawId.AufenthG_18g]),
    }),
  ]),
  [PermanentResidencyRoute.BlueCardA1]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2023-11-18"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 27,
        requiredLanguage: "German A1",
        qualifyingPermits: Object.freeze([ResidencePermitKind.EuBlueCard]),
        statuteLabel: "§ 18c Abs. 2 S. 1 AufenthG (EU Blue Card + A1)",
      }),
      label: "EU Blue Card permanent residency threshold (27 months, A1)",
      sourceUrl: AUFENTHG_18C_SOURCE,
      lawIds: Object.freeze([LawId.AufenthG_18c, LawId.AufenthG_18g]),
    }),
  ]),
  [PermanentResidencyRoute.SkilledWorkerGermanGraduate]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2023-11-18"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 24,
        requiredLanguage: "German B1",
        qualifyingPermits: Object.freeze([ResidencePermitKind.SkilledWorker, ResidencePermitKind.EuBlueCard]),
        statuteLabel: "§ 18c Abs. 1 S. 2 AufenthG (German graduate skilled worker)",
      }),
      label: "Skilled worker German graduate permanent residency threshold (24 months)",
      sourceUrl: AUFENTHG_18C_SOURCE,
      lawIds: Object.freeze([LawId.AufenthG_18c]),
    }),
  ]),
  [PermanentResidencyRoute.SkilledWorkerStandard]: Object.freeze([
    Object.freeze({
      jurisdiction: JurisdictionCode.GermanyFederal,
      effectiveFrom: toLifeDate("2023-11-18"),
      effectiveTo: toLifeDate("2026-12-31"),
      value: Object.freeze({
        requiredMonths: 36,
        requiredLanguage: "German B1",
        qualifyingPermits: Object.freeze([ResidencePermitKind.SkilledWorker, ResidencePermitKind.EuBlueCard]),
        statuteLabel: "§ 18c Abs. 1 AufenthG (Skilled worker standard route)",
      }),
      label: "Skilled worker permanent residency threshold (36 months, B1)",
      sourceUrl: AUFENTHG_18C_SOURCE,
      lawIds: Object.freeze([LawId.AufenthG_18c]),
    }),
  ]),
});

/** Adds exact calendar months to an ISO YYYY-MM-DD date, clamping day to the target month's length. */
export function addCalendarMonths(date: LifeDate, months: number): LifeDate {
  const year = Number(date.slice(0, 4));
  const month = Number(date.slice(5, 7));
  const day = Number(date.slice(8, 10));
  const zeroBased = (year * 12) + (month - 1) + months;
  const targetYear = Math.floor(zeroBased / 12);
  const targetMonth = (zeroBased % 12) + 1;
  const maxDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const clampedDay = Math.min(day, maxDay);
  return toLifeDate(
    `${String(targetYear).padStart(4, "0")}-${String(targetMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`,
  );
}

function dayDifference(from: LifeDate, to: LifeDate): number {
  const startMs = Date.parse(`${from}T00:00:00Z`);
  const endMs = Date.parse(`${to}T00:00:00Z`);
  return Math.round((endMs - startMs) / 86400000);
}

/** Evaluates recorded residence permits, absences and milestones for permanent residency preparation. */
export function evaluateResidencyPreparation(input: ResidencyPreparationInput): ResidencyPreparationResult {
  const relevant = input.events.filter((event) => event.personId === input.personId
    && (input.includePlanned || event.status === LifeEventStatus.Actual));

  const permits: { readonly event: LifeEvent<unknown>;
    readonly payload: ResidencePermitPayload }[] = [];
  const interruptions: ResidenceInterruptionPayload[] = [];
  const milestones: { readonly date?: string;
    readonly payload: ResidenceMilestonePayload }[] = [];

  for (const event of relevant) {
    if (event.kind === residencePermitModule.kind) {
      permits.push({
        event,
        payload: residencePermitModule.parsePayload(event.payload),
      });
    }
    else if (event.kind === residenceInterruptionModule.kind) {
      interruptions.push(residenceInterruptionModule.parsePayload(event.payload));
    }
    else if (event.kind === residenceMilestoneModule.kind) {
      milestones.push({
        ...(event.date ? { date: event.date } : {}),
        payload: residenceMilestoneModule.parsePayload(event.payload),
      });
    }
  }

  const totalAbsenceDays = interruptions.reduce((sum, entry) => sum + entry.days, 0);
  const hasLongAbsenceRisk = interruptions.some((entry) => entry.days >= 180) || totalAbsenceDays >= 180;

  const expiringPermits: PermitExpiryAlert[] = [];
  for (const { payload } of permits) {
    if (!payload.expiryDate) {
      continue;
    }
    const daysRemaining = dayDifference(input.asOf, payload.expiryDate);
    if (daysRemaining <= 180) {
      expiringPermits.push(Object.freeze({
        permitKind: payload.permitKind,
        ...(payload.label ? { label: payload.label } : {}),
        expiryDate: payload.expiryDate,
        daysRemaining,
        expired: daysRemaining < 0,
      }));
    }
  }

  const ruleResolution = resolveEffectiveRule(ROUTE_RULES[input.route], {
    date: input.asOf,
    jurisdiction: input.jurisdiction,
    allowProjection: input.allowProjection,
  });

  if (ruleResolution.status === RuleResolutionStatus.Unsupported) {
    const explanation: CalculationExplanation = Object.freeze({
      kind: ExplanationFormulaKind.Statutory,
      status: ExplanationStatus.Unsupported,
      formulaName: "Permanent Residency Preparation Check",
      formulaExpression: "earliestDate = qualifyingPermitStart + requiredMonths (subject to continuous residence and authority review)",
      formulaVersion: RESIDENCY_PREP_FORMULA_VERSION,
      jurisdiction: input.jurisdiction,
      effectiveDate: input.asOf,
      unsupportedReason: `No verified residency rule is available for jurisdiction ${input.jurisdiction} on ${input.asOf}.`,
      inputs: Object.freeze([
        {
          label: "Selected route",
          value: input.route,
          source: "User selection",
        },
        {
          label: "Recorded permits",
          value: `${permits.length}`,
          source: "Life timeline",
        },
      ]),
      parameters: Object.freeze([]),
      lawIds: Object.freeze([LawId.AufenthG_18c]),
      topicIds: Object.freeze(["blue-card"]),
      assumptions: Object.freeze([
        "Only Germany federal AufenthG § 18c routes effective from 2023-11-18 are modeled.",
        "This planning estimate is not an official Ausländerbehörde decision.",
      ]),
    });

    return Object.freeze({
      route: input.route,
      supported: false,
      totalAbsenceDays,
      hasLongAbsenceRisk,
      permitCount: permits.length,
      expiringPermits: Object.freeze(expiringPermits),
      milestones: Object.freeze(milestones),
      evidenceChecklist: Object.freeze([]),
      explanation,
    });
  }

  const rule = ruleResolution.entry.value;
  const qualifyingDates = permits
    .filter(({ payload }) => rule.qualifyingPermits.includes(payload.permitKind))
    .map(({ event, payload }) => payload.issueDate ?? (event.date?.length === 10 ? toLifeDate(event.date) : undefined))
    .filter((date): date is LifeDate => date !== undefined)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));

  const qualifyingStartDate = qualifyingDates[0];
  const potentialEarliestApplicationDate = qualifyingStartDate
    ? addCalendarMonths(qualifyingStartDate, rule.requiredMonths)
    : undefined;

  const checklist: EvidenceChecklistItem[] = [
    {
      id: "qualifying-permit",
      label: "Qualifying residence permit start date",
      status: qualifyingStartDate ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: qualifyingStartDate
        ? `Earliest qualifying permit recorded on ${qualifyingStartDate}.`
        : `Record a qualifying permit (${rule.qualifyingPermits.join(" or ")}) with an exact issue or start date.`,
    },
    {
      id: "language",
      label: `Language certificate (${rule.requiredLanguage})`,
      status: input.evidence.hasLanguageCertificate ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.evidence.hasLanguageCertificate
        ? `${rule.requiredLanguage} certificate marked available.`
        : `Required for ${rule.statuteLabel}.`,
    },
    {
      id: "pension-contributions",
      label: `Statutory pension history (${rule.requiredMonths} months)`,
      status: input.evidence.hasPensionHistoryProof ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.evidence.hasPensionHistoryProof
        ? "Rentenversicherungsverlauf marked available."
        : "Obtain Rentenversicherungsverlauf or equivalent private pension proof.",
    },
    {
      id: "civic-test",
      label: "Basic knowledge of German legal and social order (Leben in Deutschland)",
      status: input.evidence.hasCivicTestCertificate ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.evidence.hasCivicTestCertificate
        ? "Civic test or equivalent exemption marked available."
        : "Prepare Leben in Deutschland / Einbürgerungstest or verify exemption.",
    },
    {
      id: "livelihood-housing",
      label: "Secured livelihood, employment contract and sufficient housing",
      status: input.evidence.hasLivelihoodAndHousingProof ? EvidenceStatus.Recorded : EvidenceStatus.Missing,
      detail: input.evidence.hasLivelihoodAndHousingProof
        ? "Income, rent contract and health insurance proof marked available."
        : "Collect payslips, employment confirmation, lease and health insurance confirmation.",
    },
  ];

  if (totalAbsenceDays > 0) {
    checklist.push({
      id: "absences",
      label: "Residence continuity and absences abroad",
      status: EvidenceStatus.NeedsAuthorityReview,
      detail: hasLongAbsenceRisk
        ? `${totalAbsenceDays} absence days recorded (includes a >=180-day absence or cumulative threshold). Confirm continuity with Ausländerbehörde before applying.`
        : `${totalAbsenceDays} absence days recorded; confirm whether any absence pauses qualifying months.`,
    });
  }

  const explanation: CalculationExplanation = Object.freeze({
    kind: ExplanationFormulaKind.Statutory,
    status: ruleResolution.status === RuleResolutionStatus.Projected
      ? ExplanationStatus.Projected
      : ExplanationStatus.Supported,
    formulaName: "Permanent Residency Preparation Estimate",
    formulaExpression: `potentialEarliestDate = qualifyingPermitStart + ${rule.requiredMonths} calendar months`,
    formulaVersion: RESIDENCY_PREP_FORMULA_VERSION,
    jurisdiction: input.jurisdiction,
    effectiveDate: input.asOf,
    inputs: Object.freeze([
      {
        label: "Selected route",
        value: rule.statuteLabel,
        source: "User selection",
      },
      {
        label: "Qualifying permit start date",
        value: qualifyingStartDate ?? "Missing",
        source: "Timeline residence.permit entries",
      },
      {
        label: "Recorded absence days",
        value: `${totalAbsenceDays} days`,
        source: "Timeline residence.interruption entries",
      },
    ]),
    parameters: Object.freeze([
      Object.freeze({
        label: ruleResolution.entry.label,
        value: `${rule.requiredMonths} months (${rule.requiredLanguage})`,
        jurisdiction: ruleResolution.entry.jurisdiction,
        effectiveFrom: ruleResolution.entry.effectiveFrom,
        effectiveTo: ruleResolution.entry.effectiveTo,
        status: ruleResolution.status,
        sourceUrl: ruleResolution.entry.sourceUrl,
        lawIds: ruleResolution.entry.lawIds,
      }),
    ]),
    lawIds: ruleResolution.entry.lawIds,
    topicIds: Object.freeze(["blue-card"]),
    assumptions: Object.freeze([
      "Potential earliest date assumes continuous qualifying employment and statutory pension contributions from the recorded permit start date.",
      "Interruptions, unpaid leave or permit switches may change credited months and require Ausländerbehörde confirmation.",
      "This calculation is a preparation checklist and not a binding legal decision.",
    ]),
  });

  return Object.freeze({
    route: input.route,
    supported: true,
    requiredMonths: rule.requiredMonths,
    ...(qualifyingStartDate ? { qualifyingStartDate } : {}),
    ...(potentialEarliestApplicationDate ? { potentialEarliestApplicationDate } : {}),
    totalAbsenceDays,
    hasLongAbsenceRisk,
    permitCount: permits.length,
    expiringPermits: Object.freeze(expiringPermits),
    milestones: Object.freeze(milestones),
    evidenceChecklist: Object.freeze(checklist),
    explanation,
  });
}
