import type {
  JSX,
} from "preact";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  toEuroAmount,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  getAllMunicipalDaycarePresets,
} from "#engine/benefits/childcare";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  removeWorkbenchFinancialEvent,
  updateWorkbenchChildcarePlan,
  updateWorkbenchExtras,
  workbenchExtras,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchDeductibles,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Card 4: Compact Costs, Benefits & Tax Deductibles matching the approved prototype. */
export function CostsBenefitsCard(): JSX.Element {
  const s = workbenchState.value;
  const extras = workbenchExtras.value;
  const deductibles = displayedWorkbenchDeductibles.value;
  const kitaEnabled = s.childcarePlan?.enabled === true;
  const presets = getAllMunicipalDaycarePresets();
  const activePreset = presets.find((p) => p.id === s.childcarePlan?.presetId);
  const events = s.customFinancialEvents;
  const hasRegional = extras.regionalBenefitMonthly > 0;
  const hasDeductibles = deductibles.totalEstimatedAnnualTaxRefund > 0;

  return (
    <section className="plw-card" aria-labelledby="plw-sec-costs">
      <div className="plw-card__header">
        <h2 id="plw-sec-costs" className="plw-card__title">4. Costs, Benefits &amp; Tax Deductibles</h2>
        <button
          type="button"
          className="plw-granular-btn"
          aria-pressed={kitaEnabled}
          onClick={() => updateWorkbenchChildcarePlan({ enabled: !kitaEnabled })}
        >
          Kita: {kitaEnabled ? "On" : "Off"}
        </button>
      </div>

      <p className="plw-card__hint">
        {kitaEnabled ? (
          <>
            {activePreset?.label ?? "Custom Kita"} (age {s.childcarePlan?.startAgeMonths ?? 12}–{s.childcarePlan?.endAgeMonths ?? 36}m,{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10_1_5 }}>§ 10(1)5 EStG</WikiRefLink>{" "}
            deductible).
          </>
        ) : (
          <>
            Kita fees off by default. Toggle on or add{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10_1_5 }}>§ 10(1)5 EStG</WikiRefLink>{" "}
            childcare, regional benefits &amp; deductibles.
          </>
        )}
      </p>

      {(hasRegional || hasDeductibles || events.length > 0) && (
        <div className="plw-chips" aria-label="Active benefits, costs, and deductible credits">
          {hasRegional && (
            <span className="plw-chip plw-chip--gain">
              +{formatEur(extras.regionalBenefitMonthly)}/mo {extras.regionalBenefitLabel.slice(0, 22)}
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Remove regional family benefit"
                onClick={() => updateWorkbenchExtras({ regionalBenefitMonthly: toEuroAmount(0) })}
              >
                ×
              </button>
            </span>
          )}
          {hasDeductibles && (
            <span className="plw-chip plw-chip--gain">
              Deductibles ~+{formatEur(deductibles.totalEstimatedAnnualTaxRefund)}/yr
              <button
                type="button"
                className="plw-chip__remove"
                aria-label="Clear deductible expenses"
                onClick={() => updateWorkbenchExtras({
                  werbungskostenAnnual: toEuroAmount(0),
                  sonderausgabenAnnual: toEuroAmount(0),
                  householdServicesLaborAnnual: toEuroAmount(0),
                  craftsmenLaborAnnual: toEuroAmount(0),
                })}
              >
                ×
              </button>
            </span>
          )}
          {events.map((ev) => (
            <span
              key={ev.eventId}
              className={`plw-chip${ev.amount >= 0 ? " plw-chip--gain" : " plw-chip--warning"}`}
            >
              M{ev.effectiveSimulationMonth}: {ev.title} ({ev.amount >= 0 ? "+" : ""}{formatEur(ev.amount)})
              <button
                type="button"
                className="plw-chip__remove"
                aria-label={`Remove ${ev.title}`}
                onClick={() => removeWorkbenchFinancialEvent(ev.eventId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="plw-card__footer">
        <span>
          Familiengeld, one-offs,{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_35a }}>§ 35a EStG</WikiRefLink>
        </span>
        <button
          type="button"
          className="plw-granular-btn plw-granular-btn--primary"
          onClick={() => openWorkbenchModal(WorkbenchGranularModal.Costs)}
        >
          + Benefits, costs &amp; deductibles…
        </button>
      </div>
    </section>
  );
}
