import {
  type LifeDate,
  type LifePerson,
  PersonRelationship,
  upcomingBirthdays,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  jobEndedModule,
  jobLeaveModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  residenceInterruptionModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
} from "#engine/lifeProfile/familyEvent";
import {
  summarizeChildcareTimeline,
} from "#engine/lifeProfile/childcareTimeline";
import {
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  taxClassSwitchModule,
} from "#engine/lifeProfile/taxSwitchEvent";
import {
  AssetCategory,
  assetEventModule,
} from "#engine/lifeProfile/assetEvent";
import {
  calculatorPathForAssetCategory,
} from "#engine/lifeProfile/assetProjection";
import {
  detectTimelineConflicts,
} from "#engine/lifeProfile/timelineConflicts";

export const PlanningPriority = {
  CashRunway: "cash-runway",
  ResidencyAndCitizenship: "residency-and-citizenship",
  FamilyAndChildcare: "family-and-childcare",
  TaxOptimization: "tax-optimization",
  MajorPurchases: "major-purchases",
} as const;
export type PlanningPriority = (typeof PlanningPriority)[keyof typeof PlanningPriority];

export function toPlanningPriority(value: string): PlanningPriority {
  if (!Object.values(PlanningPriority).includes(value as PlanningPriority)) {
    throw new TypeError("Invalid planning priority.");
  }
  return value as PlanningPriority;
}

export interface PlanningSuggestion {
  readonly id: string;
  readonly domain: PlanningPriority;
  readonly priorityScore: number;
  readonly title: string;
  readonly whySuggested: string;
  readonly calculatorTitle?: string;
  readonly calculatorPath?: string;
  readonly checklistSteps: readonly string[];
  readonly missingInputs: readonly string[];
  readonly limitations: string;
}

export interface PriorityTradeOff {
  readonly priority: PlanningPriority;
  readonly label: string;
  readonly upside: string;
  readonly tradeOff: string;
  readonly activeSignalCount: number;
}

export interface PlanningAssistanceResult {
  readonly selectedPriority: PlanningPriority;
  readonly suggestions: readonly PlanningSuggestion[];
  readonly tradeOffs: readonly PriorityTradeOff[];
  readonly conflictCount: number;
  readonly generalAssumptions: readonly string[];
}

function scoreFor(domain: PlanningPriority, selectedPriority: PlanningPriority, baseUrgency: number): number {
  return baseUrgency + (domain === selectedPriority ? 50 : 0);
}

/**
 * Generates grounded calculator suggestions, preparation checklists, next steps and
 * priority trade-offs from supported timeline events and household records.
 */
export function buildPlanningAssistance(input: {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly asOf: LifeDate;
  readonly includePlanned: boolean;
  readonly priority: PlanningPriority;
}): PlanningAssistanceResult {
  const relevant = input.events.filter((event) => input.includePlanned || event.status === LifeEventStatus.Actual);
  const suggestions: PlanningSuggestion[] = [];
  const signalCounts: Record<PlanningPriority, number> = {
    [PlanningPriority.CashRunway]: 0,
    [PlanningPriority.ResidencyAndCitizenship]: 0,
    [PlanningPriority.FamilyAndChildcare]: 0,
    [PlanningPriority.TaxOptimization]: 0,
    [PlanningPriority.MajorPurchases]: 0,
  };

  const conflicts = detectTimelineConflicts(input.events);
  if (conflicts.length > 0) {
    signalCounts[PlanningPriority.CashRunway] += conflicts.length;
    suggestions.push(Object.freeze({
      id: "resolve-timeline-conflicts",
      domain: PlanningPriority.CashRunway,
      priorityScore: scoreFor(PlanningPriority.CashRunway, input.priority, 45),
      title: `Resolve ${conflicts.length} timeline conflict or ambiguity item(s)`,
      whySuggested: "Conflicting same-day changes, incomplete dates or unlinked duplicate cash entries reduce forecast reliability.",
      checklistSteps: Object.freeze([
        "Open the timeline conflict review box above and inspect flagged entries.",
        "Link any actual cash transaction to its planned counterpart so it is counted once.",
        "Confirm or correct incomplete dates before relying on monthly projections.",
      ]),
      missingInputs: Object.freeze(["Confirmed dates or explicit cash links for flagged entries"]),
      limitations: "Automated checks only detect structural conflicts; they cannot verify real-world receipts or contracts.",
    }));
  }

  const jobStarts = relevant.filter((e) => e.kind === jobStartedModule.kind);
  const jobEnds = relevant.filter((e) => e.kind === jobEndedModule.kind);
  const jobLeaves = relevant.filter((e) => e.kind === jobLeaveModule.kind);
  if (jobEnds.length > 0 || jobLeaves.length > 0) {
    signalCounts[PlanningPriority.CashRunway] += jobEnds.length + jobLeaves.length;
    suggestions.push(Object.freeze({
      id: "employment-transition-runway",
      domain: PlanningPriority.CashRunway,
      priorityScore: scoreFor(PlanningPriority.CashRunway, input.priority, 40),
      title: "Stress-test your job transition and resignation savings runway",
      whySuggested: `${jobEnds.length} job-ending and ${jobLeaves.length} leave event(s) recorded in your timeline.`,
      calculatorTitle: "Resignation & Transition Runway",
      calculatorPath: "/calculators/resignation-runway/",
      checklistSteps: Object.freeze([
        "Open the standalone Resignation & Transition Runway tool or the Monthly View.",
        "Compare 0-month vs. 3-month waiting period (Sperrzeit) scenarios against liquid savings.",
        "Verify contractual notice periods, final payout dates and health insurance coverage.",
      ]),
      missingInputs: Object.freeze(["Actual liquid cash reserve", "Agentur für Arbeit benefit confirmation"]),
      limitations: "Waiting-period rules and unemployment benefit amounts are manual assumptions, not official agency determinations.",
    }));
  }
  else if (jobStarts.length > 0) {
    signalCounts[PlanningPriority.TaxOptimization] += 1;
    suggestions.push(Object.freeze({
      id: "employment-net-pay-check",
      domain: PlanningPriority.TaxOptimization,
      priorityScore: scoreFor(PlanningPriority.TaxOptimization, input.priority, 20),
      title: "Verify take-home pay and contribution band from recorded employment",
      whySuggested: `${jobStarts.length} employment record(s) found.`,
      calculatorTitle: "Net Pay Calculator",
      calculatorPath: "/calculators/net-pay/",
      checklistSteps: Object.freeze([
        "Preview your monthly gross rate in Net Pay without overwriting saved comparisons.",
        "Check whether marginal (Minijob) or transition (Midijob) contribution bands apply.",
      ]),
      missingInputs: Object.freeze(["Health insurance Zusatzbeitrag", "Church tax status"]),
      limitations: "Recorded gross pay rates do not automatically include bonuses, company cars or private insurance.",
    }));
  }

  const permits = relevant.filter((e) => e.kind === residencePermitModule.kind);
  const absences = relevant.filter((e) => e.kind === residenceInterruptionModule.kind);
  if (permits.length > 0 || absences.length > 0) {
    signalCounts[PlanningPriority.ResidencyAndCitizenship] += permits.length + absences.length;
    suggestions.push(Object.freeze({
      id: "residency-citizenship-readiness",
      domain: PlanningPriority.ResidencyAndCitizenship,
      priorityScore: scoreFor(PlanningPriority.ResidencyAndCitizenship, input.priority, 38),
      title: "Review permanent residency (§ 18c AufenthG) and citizenship (§ 10 StAG) timelines",
      whySuggested: `${permits.length} residence permit(s) and ${absences.length} absence record(s) found.`,
      calculatorTitle: "Permanent Residency Planner",
      calculatorPath: "/calculators/permanent-residency/",
      checklistSteps: Object.freeze([
        "Check permit expiry alerts and earliest potential application dates in the Permanent Residency or Citizenship planners.",
        "Request an up-to-date Rentenversicherungsverlauf and confirm B1/A1 language certificates.",
        "Confirm continuity impact of any absences abroad with Ausländerbehörde / Einbürgerungsbehörde.",
      ]),
      missingInputs: Object.freeze(["Verified language certificate status", "Official pension contribution count"]),
      limitations: "Statutory timeline estimates are preparation guides and not legally binding authority decisions.",
    }));
  }

  const familyEvents = relevant.filter((e) =>
    e.kind === pregnancyStartedModule.kind
    || e.kind === expectedBirthModule.kind
    || e.kind === actualBirthModule.kind);
  const children = input.people.filter((p) => p.relationship === PersonRelationship.Child);
  const childcareSummary = summarizeChildcareTimeline({
    events: input.events,
    asOf: input.asOf,
    includePlanned: input.includePlanned,
  });
  const upcomingBdays = upcomingBirthdays(input.people, input.asOf, 45);

  if (familyEvents.length > 0 || children.length > 0 || childcareSummary.options.length > 0) {
    signalCounts[PlanningPriority.FamilyAndChildcare] += familyEvents.length + children.length + childcareSummary.options.length;
    suggestions.push(Object.freeze({
      id: "family-parental-childcare",
      domain: PlanningPriority.FamilyAndChildcare,
      priorityScore: scoreFor(PlanningPriority.FamilyAndChildcare, input.priority, 36),
      title: "Coordinate Parental Leave (Elterngeld) and Kita/Krippe deadlines",
      whySuggested: `${familyEvents.length} pregnancy/birth milestone(s), ${children.length} child record(s) and ${childcareSummary.options.length} childcare option(s) recorded.`,
      calculatorTitle: childcareSummary.options.length > 0 ? "Kita, Krippe & School Planner" : "Family Milestones & Births",
      calculatorPath: childcareSummary.options.length > 0 ? "/calculators/childcare-planner/" : "/calculators/family-milestones/",
      checklistSteps: Object.freeze([
        "Review the Parental Leave Planner handoff preview before confirming any profile transfer.",
        "Compare Kita/Krippe application deadlines and estimate § 10 EStG tax offsets in the Kita calculator.",
        ...(upcomingBdays.length > 0 ? [`Upcoming household birthday(s) within 45 days: ${upcomingBdays.map((b) => `${b.name} (${b.nextBirthday})`).join(", ")}.`] : []),
      ]),
      missingInputs: Object.freeze(["Municipal Kita fee schedule", "Actual maternity leave dates"]),
      limitations: "Municipal childcare availability and vouchers depend on local authorities; Elterngeld scenarios remain separate.",
    }));
  }

  const taxSwitches = relevant.filter((e) => e.kind === taxClassSwitchModule.kind);
  const hasPartner = input.people.some((p) => p.relationship === PersonRelationship.Partner);
  if (taxSwitches.length > 0 || hasPartner) {
    signalCounts[PlanningPriority.TaxOptimization] += Math.max(1, taxSwitches.length);
    suggestions.push(Object.freeze({
      id: "tax-class-switch-review",
      domain: PlanningPriority.TaxOptimization,
      priorityScore: scoreFor(PlanningPriority.TaxOptimization, input.priority, 30),
      title: "Compare tax class switch dates (monthly withholding vs. annual joint tax)",
      whySuggested: taxSwitches.length > 0
        ? `${taxSwitches.length} tax class switch event(s) recorded.`
        : "Household includes a partner — joint assessment and withholding timing may affect monthly cash flow.",
      calculatorTitle: "Tax Class Switch Comparator",
      calculatorPath: "/calculators/tax-class-switch/",
      checklistSteps: Object.freeze([
        "Open the Tax Class Switch Comparator to separate monthly payroll net from final annual joint tax.",
        "Budget for any estimated year-end Nachzahlung if using III/V.",
        "Note mandatory annual tax return filing (§ 46 Abs. 2 Nr. 3a EStG) when using III/V or IV/IV-factor.",
      ]),
      missingInputs: Object.freeze(["Partner verified annual taxable income", "Wage-replacement progression benefits (e.g. Elterngeld)"]),
      limitations: "Tax class changes affect monthly withholding timing only, not final combined annual income tax.",
    }));
  }

  const assets = relevant.filter((e) => e.kind === assetEventModule.kind);
  if (assets.length > 0) {
    signalCounts[PlanningPriority.MajorPurchases] += assets.length;
    const parsedAssets = assets.map((e) => assetEventModule.parsePayload(e.payload));
    const unlinkedCount = parsedAssets.filter((a) => a.upfrontCents && !a.linkedCashEventId).length;
    const primaryCategory: AssetCategory = parsedAssets[0]?.category ?? AssetCategory.Housing;
    suggestions.push(Object.freeze({
      id: "major-purchases-affordability",
      domain: PlanningPriority.MajorPurchases,
      priorityScore: scoreFor(PlanningPriority.MajorPurchases, input.priority, 32),
      title: "Check upfront liquidity and ongoing cost share for recorded purchases/assets",
      whySuggested: `${assets.length} housing, car, solar or major purchase event(s) recorded.`,
      calculatorTitle: "Purchases & Asset Affordability",
      calculatorPath: assets.length > 1 ? "/calculators/asset-affordability/" : calculatorPathForAssetCategory(primaryCategory),
      checklistSteps: Object.freeze([
        "Open the standalone Purchases, Housing, Cars & Solar Affordability tool to verify liquid savings gap and net monthly burden.",
        ...(unlinkedCount > 0 ? [`Link ${unlinkedCount} unlinked upfront purchase(s) to timeline cash entries if already logged in cash history so they are counted once.`] : []),
        "Stress-test ongoing monthly commitments in the standalone Household Expense Planner.",
      ]),
      missingInputs: Object.freeze(["Current mortgage interest quote / financing terms", "Insurance & maintenance quotes"]),
      limitations: "Affordability ratios are planning heuristics and do not replace bank underwriting or energy audits.",
    }));
  }

  const trips = relevant.filter((e) => e.kind === travelTripModule.kind);
  if (trips.length > 0) {
    signalCounts[PlanningPriority.CashRunway] += 1;
    suggestions.push(Object.freeze({
      id: "travel-document-budget-check",
      domain: PlanningPriority.CashRunway,
      priorityScore: scoreFor(PlanningPriority.CashRunway, input.priority, 24),
      title: "Verify travel passport/permit validity and compare offline transport costs",
      whySuggested: `${trips.length} trip(s) recorded in your timeline.`,
      calculatorTitle: "Travel Readiness & Transport",
      calculatorPath: "/calculators/travel-planner/",
      checklistSteps: Object.freeze([
        "Review passport 3-month/6-month and German eAT re-entry expiry checks in the Travel Readiness & Transport tool.",
        "Compare Car, Bus, Train and Flight rough cost/time estimates offline.",
      ]),
      missingInputs: Object.freeze(["Traveler nationality for embassy visa verification"]),
      limitations: "Destination visa and entry rules must always be verified with official authorities.",
    }));
  }

  if (suggestions.length === 0) {
    suggestions.push(Object.freeze({
      id: "start-building-timeline",
      domain: input.priority,
      priorityScore: 60,
      title: "Add your first life event to unlock tailored checklists",
      whySuggested: "No timeline events match the current view filters yet.",
      calculatorTitle: "Household Expense Planner",
      calculatorPath: "/calculators/expense-planner/",
      checklistSteps: Object.freeze([
        "Record a job start, residence permit, planned move, trip or major purchase in the timeline.",
        "Or start budgeting immediately without a Life Profile in the standalone Household Expense Planner.",
      ]),
      missingInputs: Object.freeze(["Recorded people and timeline events"]),
      limitations: "Suggestions only appear when supported by recorded facts or explicit planning choices.",
    }));
  }

  suggestions.sort((left, right) => right.priorityScore - left.priorityScore || left.id.localeCompare(right.id));

  const tradeOffs: readonly PriorityTradeOff[] = Object.freeze([
    {
      priority: PlanningPriority.CashRunway,
      label: "Cash buffer & resilience",
      upside: "Maximizes emergency runway during resignations, parental leave or cost shocks.",
      tradeOff: "Delays large upfront purchases (housing down payment, solar PV, car) or extra debt repayment.",
      activeSignalCount: signalCounts[PlanningPriority.CashRunway],
    },
    {
      priority: PlanningPriority.ResidencyAndCitizenship,
      label: "Residency & citizenship milestones",
      upside: "Protects permit continuity, avoids expiry gaps and prepares required pension/language proofs early.",
      tradeOff: "Limits long absences abroad (>6 months) and may constrain unplanned career breaks before eligibility.",
      activeSignalCount: signalCounts[PlanningPriority.ResidencyAndCitizenship],
    },
    {
      priority: PlanningPriority.FamilyAndChildcare,
      label: "Family, parental leave & childcare",
      upside: "Aligns birth milestones, Elterngeld basis months and early Kita/Krippe applications.",
      tradeOff: "Temporary household income dip during leave and recurring municipal childcare fees.",
      activeSignalCount: signalCounts[PlanningPriority.FamilyAndChildcare],
    },
    {
      priority: PlanningPriority.TaxOptimization,
      label: "Tax & withholding timing",
      upside: "Improves monthly cash flow via tax class choice and captures statutory deductions (Kita, commuting).",
      tradeOff: "III/V withholding can create year-end Nachzahlung and triggers mandatory annual tax filing.",
      activeSignalCount: signalCounts[PlanningPriority.TaxOptimization],
    },
    {
      priority: PlanningPriority.MajorPurchases,
      label: "Major purchases, housing & solar",
      upside: "Builds long-term assets or lowers utility bills (solar PV) with structured affordability tracking.",
      tradeOff: "Reduces liquid savings upfront and adds recurring monthly fixed commitments.",
      activeSignalCount: signalCounts[PlanningPriority.MajorPurchases],
    },
  ]);

  return Object.freeze({
    selectedPriority: input.priority,
    suggestions: Object.freeze(suggestions),
    tradeOffs,
    conflictCount: conflicts.length,
    generalAssumptions: Object.freeze([
      "Suggestions are generated locally in your browser strictly from your recorded timeline events and household entries.",
      "Changing your priority re-orders next steps and highlights trade-offs; it never mutates your profile or calculator inputs.",
      "Legal, tax and financial outputs remain informational estimates — you decide which trade-offs fit your circumstances.",
    ]),
  });
}
