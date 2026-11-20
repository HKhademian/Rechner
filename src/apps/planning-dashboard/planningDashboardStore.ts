import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  PlanningPriority,
  toPlanningPriority,
} from "#engine/lifeProfile/planningAssistant";
import {
  createScopedStateStore,
} from "#engine/storage/scopedStateStore";

export interface PlanningDashboardState {
  readonly priority: PlanningPriority;
  readonly hasJobTransition: boolean;
  readonly hasResidencyOrCitizenship: boolean;
  readonly hasFamilyOrChildcare: boolean;
  readonly hasPartnerTaxSwitch: boolean;
  readonly hasMajorPurchase: boolean;
  readonly hasUpcomingTravel: boolean;
}

const DEFAULT_STATE: PlanningDashboardState = {
  priority: PlanningPriority.CashRunway,
  hasJobTransition: true,
  hasResidencyOrCitizenship: true,
  hasFamilyOrChildcare: false,
  hasPartnerTaxSwitch: true,
  hasMajorPurchase: false,
  hasUpcomingTravel: false,
};

function parseState(raw: unknown): PlanningDashboardState {
  if (typeof raw !== "object" || raw === null) {
    return DEFAULT_STATE;
  }
  const obj = raw as Record<string, unknown>;
  let priority: PlanningPriority = DEFAULT_STATE.priority;
  if (typeof obj.priority === "string") {
    try {
      priority = toPlanningPriority(obj.priority);
    }
    catch {
      priority = DEFAULT_STATE.priority;
    }
  }
  return {
    priority,
    hasJobTransition: typeof obj.hasJobTransition === "boolean" ? obj.hasJobTransition : DEFAULT_STATE.hasJobTransition,
    hasResidencyOrCitizenship: typeof obj.hasResidencyOrCitizenship === "boolean" ? obj.hasResidencyOrCitizenship : DEFAULT_STATE.hasResidencyOrCitizenship,
    hasFamilyOrChildcare: typeof obj.hasFamilyOrChildcare === "boolean" ? obj.hasFamilyOrChildcare : DEFAULT_STATE.hasFamilyOrChildcare,
    hasPartnerTaxSwitch: typeof obj.hasPartnerTaxSwitch === "boolean" ? obj.hasPartnerTaxSwitch : DEFAULT_STATE.hasPartnerTaxSwitch,
    hasMajorPurchase: typeof obj.hasMajorPurchase === "boolean" ? obj.hasMajorPurchase : DEFAULT_STATE.hasMajorPurchase,
    hasUpcomingTravel: typeof obj.hasUpcomingTravel === "boolean" ? obj.hasUpcomingTravel : DEFAULT_STATE.hasUpcomingTravel,
  };
}

export const planningDashboardStore = createScopedStateStore<PlanningDashboardState>({
  appId: AppId.PlanningDashboard,
  field: "state",
  createDefault: () => DEFAULT_STATE,
  parse: parseState,
});
