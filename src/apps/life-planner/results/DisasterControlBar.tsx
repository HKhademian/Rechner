import type {
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
} from "#/components/ui/index.ts";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  toEuroAmount,
  toSimulationMonth,
} from "#engine/types";
import {
  SolvencyVerdict,
} from "#engine/lifeSimulator/types";
import {
  DISASTER_PRESETS,
} from "#engine/lifeSimulator/disasterSimulator";
import {
  activeDisasterPresetId,
  commitmentStressDeltaEur,
  disasterTriggerMonth,
  lifeWorkbenchPlan,
  useCustomDisasterMode,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  displayedLifeBundle,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  openCustomDisasterModal,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/**
 * Contextual Life Disaster & Commitment Affordability Bar.
 * Visible only in Stress Test or Compare mode to keep the main workspace whisper-quiet.
 */
export function DisasterControlBar(): JSX.Element {
  const presetId = activeDisasterPresetId.value;
  const isCustom = useCustomDisasterMode.value;
  const trigger = disasterTriggerMonth.value;
  const delta = commitmentStressDeltaEur.value;
  const horizon = lifeWorkbenchPlan.value.baseline.horizonMonths;
  const aff = displayedLifeBundle.value.affordability;

  const verdictTone = aff.verdict === SolvencyVerdict.Resilient
    ? BadgeTone.Gain
    : aff.verdict === SolvencyVerdict.Tight
      ? BadgeTone.Warning
      : BadgeTone.Loss;

  const verdictLabel = aff.verdict === SolvencyVerdict.Resilient
    ? "Resilient"
    : aff.verdict === SolvencyVerdict.Tight
      ? "Tight Buffer"
      : "Insolvent";

  const signedHeadroom = aff.maxSafeAdditionalMonthlyCommitmentEur >= 0
    ? `+${formatEur(aff.maxSafeAdditionalMonthlyCommitmentEur)}/mo`
    : `${formatEur(aff.maxSafeAdditionalMonthlyCommitmentEur)}/mo`;

  return (
    <section className="lpw-disaster-bar" aria-label="Life disaster stress test controls">
      <div className="lpw-disaster-bar__row">
        <div className="lpw-disaster-chips" role="group" aria-label="Disaster shock presets">
          {DISASTER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`lpw-chip${!isCustom && presetId === preset.id ? " lpw-chip--active" : ""}`}
              title={preset.description}
              onClick={() => {
                useCustomDisasterMode.value = false;
                activeDisasterPresetId.value = preset.id;
              }}
            >
              {preset.shortLabel}
            </button>
          ))}
          <button
            type="button"
            className={`lpw-chip${isCustom ? " lpw-chip--active" : ""}`}
            onClick={openCustomDisasterModal}
          >
            Custom / Matrix…
          </button>
        </div>

        <div className="lpw-slider-group">
          <label htmlFor="lpw-disaster-month">Trigger M{trigger}</label>
          <input
            id="lpw-disaster-month"
            type="range"
            min={2}
            max={Math.max(6, horizon - 6)}
            step={1}
            value={trigger}
            onInput={(e) => {
              disasterTriggerMonth.value = toSimulationMonth(Number(e.currentTarget.value));
            }}
          />
        </div>
      </div>

      <div className="lpw-disaster-bar__row">
        <div className="lpw-slider-group">
          <label htmlFor="lpw-commitment-slider">
            Test Rent / Mortgage Delta:
            {" "}
            <strong>{delta >= 0 ? `+${formatEur(delta)}` : formatEur(delta)}/mo</strong>
          </label>
          <input
            id="lpw-commitment-slider"
            type="range"
            min={-500}
            max={1500}
            step={50}
            value={delta}
            onInput={(e) => {
              commitmentStressDeltaEur.value = toEuroAmount(Number(e.currentTarget.value));
            }}
          />
        </div>

        <div className="lpw-affordability-readout">
          <Badge tone={verdictTone}>{verdictLabel}</Badge>
          <span>
            Max safe headroom:
            {" "}
            <strong>{signedHeadroom}</strong>
          </span>
          <span>
            Safe rent ceiling:
            {" "}
            <strong>{formatEur(aff.maxSafeTotalRentEur)}/mo</strong>
          </span>
          <span>
            Max safe loan:
            {" "}
            <strong>{formatEur(aff.impliedMaxLoanAmountEur)}</strong>
          </span>
        </div>
      </div>
    </section>
  );
}
