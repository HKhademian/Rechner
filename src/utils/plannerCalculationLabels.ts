import {
  ScenarioId,
} from "#engine/types";

/** User-facing calculation names; A/B/C remain the engine's stable identifiers. */
export const plannerCalculationLabels: Record<ScenarioId, string> = {
  [ScenarioId.A]: "Without planned births",
  [ScenarioId.B]: "Keep your original tax classes",
  [ScenarioId.C]: "Your planned tax-class changes",
};
