import {
  AppId,
} from "#/apps/appDefinition.ts";

export const PlannerLinkMode = {
  PreviewOnly: "preview-only",
  OptInSnapshotHandoff: "opt-in-snapshot-handoff",
} as const;
export type PlannerLinkMode = (typeof PlannerLinkMode)[keyof typeof PlannerLinkMode];

export function toPlannerLinkMode(value: string): PlannerLinkMode {
  if (!Object.values(PlannerLinkMode).includes(value as PlannerLinkMode)) {
    throw new TypeError("Invalid planner link mode.");
  }
  return value as PlannerLinkMode;
}

export const PlannerLinkDirection = {
  ProfileToCalculator: "profile-to-calculator",
  CalculatorToProfilePromotion: "calculator-to-profile-promotion",
} as const;
export type PlannerLinkDirection = (typeof PlannerLinkDirection)[keyof typeof PlannerLinkDirection];

export interface PlannerLinkContract {
  readonly targetApp: Exclude<AppId, typeof AppId.Catalog>;
  readonly direction: PlannerLinkDirection;
  readonly mode: PlannerLinkMode;
  readonly preservesLiveInputs: true;
  readonly preservesOtherScenarios: true;
  readonly requiresExplicitPreview: true;
  readonly mappedFields: readonly string[];
  readonly untouchedFields: readonly string[];
}

/** Explicit opt-in handoff boundaries between Life Profile and standalone calculators. */
export const PLANNER_LINK_CONTRACTS: readonly PlannerLinkContract[] = Object.freeze([
  Object.freeze({
    targetApp: AppId.NetPay,
    direction: PlannerLinkDirection.ProfileToCalculator,
    mode: PlannerLinkMode.OptInSnapshotHandoff,
    preservesLiveInputs: true,
    preservesOtherScenarios: true,
    requiresExplicitPreview: true,
    mappedFields: Object.freeze(["grossIncome (monthly rate only)", "inputMode = monthly"]),
    untouchedFields: Object.freeze(["live inputs", "workingMonths", "salariesPerYear", "taxClass", "insurerRate", "other saved comparisons"]),
  }),
  Object.freeze({
    targetApp: AppId.ParentalLeave,
    direction: PlannerLinkDirection.ProfileToCalculator,
    mode: PlannerLinkMode.PreviewOnly,
    preservesLiveInputs: true,
    preservesOtherScenarios: true,
    requiresExplicitPreview: true,
    mappedFields: Object.freeze(["expected or actual birth month", "selected household person labels"]),
    untouchedFields: Object.freeze(["existing scenarios", "action batches", "tax swap settings", "simulation horizon"]),
  }),
  Object.freeze({
    targetApp: AppId.Mortgage,
    direction: PlannerLinkDirection.ProfileToCalculator,
    mode: PlannerLinkMode.PreviewOnly,
    preservesLiveInputs: true,
    preservesOtherScenarios: true,
    requiresExplicitPreview: true,
    mappedFields: Object.freeze(["property purchase price", "planned financing amounts"]),
    untouchedFields: Object.freeze(["bank interest offers", "KfW terms", "manual budget reserves"]),
  }),
]);

export function getPlannerLinkContract(
  targetApp: Exclude<AppId, typeof AppId.Catalog>,
): PlannerLinkContract | undefined {
  return PLANNER_LINK_CONTRACTS.find((contract) => contract.targetApp === targetApp);
}
