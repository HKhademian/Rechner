import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  type CalculationExplanation,
  ExplanationFormulaKind,
  ExplanationStatus,
  toFormulaVersion,
} from "#engine/lifeProfile/calculationExplanation";
import {
  type AssetCategory,
  type AssetEventPayload,
  type LifeAssetId,
  AssetActionKind,
  assetEventModule,
} from "#engine/lifeProfile/assetEvent";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
  orderLifeEvents,
} from "#engine/lifeProfile/timeline";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export const AssetAffordabilityStatus = {
  Comfortable: "comfortable",
  Stretched: "stretched",
  UnfundedShortfall: "unfunded-shortfall",
} as const;
export type AssetAffordabilityStatus = (typeof AssetAffordabilityStatus)[keyof typeof AssetAffordabilityStatus];

export interface AssetSummaryRow {
  readonly eventId: LifeEventId;
  readonly date?: string;
  readonly payload: AssetEventPayload;
  readonly countedInLinkedCash: boolean;
  readonly activeAfterEvents: boolean;
  readonly netOngoingMonthlyCents: EuroCents;
}

export interface AssetAffordabilityResult {
  readonly rows: readonly AssetSummaryRow[];
  readonly totalUpfrontAllCents: EuroCents;
  /** Upfront cost already represented by a linked cash.entry (excluded from incremental cash impact). */
  readonly linkedCashUpfrontCents: EuroCents;
  /** Incremental upfront cost not yet mirrored by a linked cash.entry. */
  readonly unlinkedUpfrontCents: EuroCents;
  readonly totalSaleProceedsCents: EuroCents;
  readonly activeOngoingMonthlyCents: EuroCents;
  readonly activeMonthlySavingsCents: EuroCents;
  readonly netActiveMonthlyImpactCents: EuroCents;
  readonly liquidSavingsGapCents: EuroCents;
  readonly ongoingIncomeSharePercent?: number;
  readonly affordabilityStatus: AssetAffordabilityStatus;
  readonly explanation: CalculationExplanation;
}

export const ASSET_AFFORDABILITY_FORMULA_VERSION = toFormulaVersion("asset-affordability-v1");

/**
 * Evaluates recorded housing, car, solar and major purchase events, comparing upfront costs,
 * ongoing net monthly costs and affordability while ensuring linked cash entries are counted once.
 */
export function evaluateAssetAffordability(input: {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly includePlanned: boolean;
  readonly availableSavingsCents: EuroCents;
  readonly monthlyNetIncomeCents: EuroCents;
}): AssetAffordabilityResult {
  const ordered = orderLifeEvents(
    input.events.filter((event) => event.personId === input.personId
      && event.kind === assetEventModule.kind
      && (input.includePlanned || event.status === LifeEventStatus.Actual)),
  );

  // Determine latest action per assetId so sold assets stop contributing ongoing costs
  const latestActionByAsset = new Map<LifeAssetId, AssetActionKind>();
  const latestEventIdByAsset = new Map<LifeAssetId, LifeEventId>();
  for (const event of ordered) {
    const payload = assetEventModule.parsePayload(event.payload);
    latestActionByAsset.set(payload.assetId, payload.action);
    latestEventIdByAsset.set(payload.assetId, event.id);
  }

  let totalUpfrontAll = 0;
  let linkedCashUpfront = 0;
  let unlinkedUpfront = 0;
  let totalSaleProceeds = 0;
  let activeOngoing = 0;
  let activeSavings = 0;
  const rows: AssetSummaryRow[] = [];

  for (const event of ordered) {
    const payload = assetEventModule.parsePayload(event.payload);
    const countedInLinkedCash = Boolean(payload.linkedCashEventId);
    const activeAfterEvents = latestActionByAsset.get(payload.assetId) !== AssetActionKind.Sale
      && latestEventIdByAsset.get(payload.assetId) === event.id;

    if (payload.action === AssetActionKind.Sale) {
      totalSaleProceeds += payload.upfrontCents ?? 0;
    }
    else if (payload.upfrontCents !== undefined) {
      totalUpfrontAll += payload.upfrontCents;
      if (countedInLinkedCash) {
        linkedCashUpfront += payload.upfrontCents;
      }
      else {
        unlinkedUpfront += payload.upfrontCents;
      }
    }

    const ongoing = payload.ongoingMonthlyCents ?? 0;
    const savings = payload.monthlySavingsCents ?? 0;
    const netMonthly = ongoing - savings;
    if (activeAfterEvents) {
      activeOngoing += ongoing;
      activeSavings += savings;
    }

    rows.push(Object.freeze({
      eventId: event.id,
      ...(event.date ? { date: event.date } : {}),
      payload,
      countedInLinkedCash,
      activeAfterEvents,
      netOngoingMonthlyCents: toEuroCents(netMonthly),
    }));
  }

  const netActiveMonthly = activeOngoing - activeSavings;
  const netUpfrontNeeded = Math.max(0, totalUpfrontAll - totalSaleProceeds);
  const liquidSavingsGapCents = toEuroCents(Math.max(0, netUpfrontNeeded - input.availableSavingsCents));
  const ongoingIncomeSharePercent = input.monthlyNetIncomeCents > 0
    ? Math.round((Math.max(0, netActiveMonthly) / input.monthlyNetIncomeCents) * 1000) / 10
    : undefined;

  let affordabilityStatus: AssetAffordabilityStatus = AssetAffordabilityStatus.Comfortable;
  if (liquidSavingsGapCents > 0 || (ongoingIncomeSharePercent !== undefined && ongoingIncomeSharePercent > 45)) {
    affordabilityStatus = AssetAffordabilityStatus.UnfundedShortfall;
  }
  else if (ongoingIncomeSharePercent !== undefined && ongoingIncomeSharePercent > 30) {
    affordabilityStatus = AssetAffordabilityStatus.Stretched;
  }

  const explanation: CalculationExplanation = Object.freeze({
    kind: ExplanationFormulaKind.PureArithmetic,
    status: ExplanationStatus.Supported,
    formulaName: "Asset Upfront, Ongoing Cost & Single-Counting Check",
    formulaExpression: "netMonthlyImpact = Σ(active ongoing − active savings); unlinkedUpfront = totalUpfront − linkedCashUpfront",
    formulaVersion: ASSET_AFFORDABILITY_FORMULA_VERSION,
    inputs: Object.freeze([
      {
        label: "Recorded asset events",
        value: `${rows.length}`,
        source: "Timeline asset.event entries",
      },
      {
        label: "Available liquid savings",
        value: formatIntegerEuroCents(input.availableSavingsCents),
        source: "User affordability input",
      },
      {
        label: "Monthly household net income",
        value: formatIntegerEuroCents(input.monthlyNetIncomeCents),
        source: "User affordability input",
      },
      {
        label: "Linked cash upfront amounts",
        value: `${formatIntegerEuroCents(toEuroCents(linkedCashUpfront))} (counted once via cash.entry)`,
        source: "Validated linkedCashEventId references",
      },
    ]),
    parameters: Object.freeze([]),
    lawIds: Object.freeze([]),
    topicIds: Object.freeze(["solar", "company-car", "mortgage-repayment"]),
    assumptions: Object.freeze([
      "Linked cash events prevent double-counting upfront purchase/installation costs against timeline cash flows.",
      "Sold assets stop contributing ongoing monthly costs once a Sale event is recorded for the same assetId.",
      "Affordability bands (<=30% comfortable, 30–45% stretched, >45% or upfront gap unfunded) are planning heuristics, not bank underwriting.",
    ]),
  });

  return Object.freeze({
    rows: Object.freeze(rows),
    totalUpfrontAllCents: toEuroCents(totalUpfrontAll),
    linkedCashUpfrontCents: toEuroCents(linkedCashUpfront),
    unlinkedUpfrontCents: toEuroCents(unlinkedUpfront),
    totalSaleProceedsCents: toEuroCents(totalSaleProceeds),
    activeOngoingMonthlyCents: toEuroCents(activeOngoing),
    activeMonthlySavingsCents: toEuroCents(activeSavings),
    netActiveMonthlyImpactCents: toEuroCents(netActiveMonthly),
    liquidSavingsGapCents,
    ...(ongoingIncomeSharePercent !== undefined ? { ongoingIncomeSharePercent } : {}),
    affordabilityStatus,
    explanation,
  });
}

export function calculatorPathForAssetCategory(category: AssetCategory): string {
  if (category === "housing") {
    return "/calculators/mortgage/";
  }
  if (category === "car") {
    return "/calculators/company-car/";
  }
  if (category === "solar") {
    return "/calculators/solar-energy/";
  }
  return "/calculators/housing/";
}
