import type {
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  toWorkingHours,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  simMonthToCalendarDate,
} from "#engine/simulator/calendarNavigation";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  applyOptimalWorkbenchTaxSwitches,
  clearWorkbenchTaxSwitches,
  removeWorkbenchHoursChange,
  removeWorkbenchTaxSwitch,
  updateWorkbenchState,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchMetrics,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

const HOURS_PRESETS = [0, 20, 24, 28, 30, 32, 40] as const;

/** Card 3: Tax Strategy & Work Hours with recessed sub-panels matching the approved sketch. */
export function TaxAndWorkCard(): JSX.Element {
  const s = workbenchState.value;
  const metrics = displayedWorkbenchMetrics.value;
  const switches = s.customTaxClassSwitches;
  const hoursChanges = s.customWorkingHoursChanges ?? [];
  const hasSwitches = switches.length > 0;
  const hasBirths = s.customPregnancies.length > 0;
  const firstSwitch = switches[0];
  const firstSwitchLabel = firstSwitch
    ? (() => {
      const cal = simMonthToCalendarDate(firstSwitch.effectiveSimulationMonth, s.startCalendarYear, s.startCalendarMonth);
      return `${String(cal.calendarMonth).padStart(2, "0")}.${cal.calendarYear}`;
    })()
    : null;

  return (
    <section className="plw-card" aria-labelledby="plw-sec-tax-work">
      <div className="plw-card__header">
        <h2 id="plw-sec-tax-work" className="plw-card__title">3. Tax Strategy &amp; Work Hours</h2>
        <Badge tone={hasSwitches ? BadgeTone.Gain : BadgeTone.Neutral}>
          {hasSwitches ? "Optimal Active" : "Inactive"}
        </Badge>
      </div>

      <div className="plw-subpanel">
        <div className="plw-subpanel__top">
          <span className="plw-subpanel__title">
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>{" "}
            Tax-Class Switch
          </span>
          {metrics.gainCvsB !== 0 && (
            <span className="plw-subpanel__delta">
              {metrics.gainCvsB > 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}
            </span>
          )}
        </div>
        <p className="plw-card__hint">
          {hasSwitches && firstSwitchLabel
            ? (
              <>
                Auto switch to {firstSwitch.targetHusbandTaxClass} / {firstSwitch.targetWifeTaxClass} at {firstSwitchLabel} (7m lead before{" "}
                <WikiRefLink target={{ kind: WikiRefKind.Topic,
                  id: "maternity-protection" }}>Mutterschutz</WikiRefLink>
                ), revert at birth.
              </>
            )
            : "Enable the statutory 7-month tax-class switch to compare optimized Elterngeld against Baseline B."}
        </p>
        <div>
          <Button
            size={ButtonSize.Sm}
            variant={hasSwitches ? ButtonVariant.Ghost : ButtonVariant.Tint}
            disabled={!hasBirths}
            onClick={hasSwitches ? clearWorkbenchTaxSwitches : applyOptimalWorkbenchTaxSwitches}
          >
            {hasSwitches ? "Disable Switch" : "Enable Optimal Switch"}
          </Button>
        </div>
      </div>

      <div className="plw-subpanel plw-subpanel--row">
        <div>
          <div className="plw-subpanel__title">Post-Leave Working Hours</div>
          <p className="plw-card__hint">
            Return to {s.wifePostBirthHours} h/wk ·{" "}
            {s.wifePostBirthHours <= 32 ? "≤" : ">"}
            <WikiRefLink target={{ kind: WikiRefKind.Parameter,
              id: ParameterId.Benefit_MaximumWeeklyHours }}>32 h/wk</WikiRefLink>{" "}
            {s.wifePostBirthHours <= 32 ? "corridor OK" : "exceeds cap"}
          </p>
        </div>
        <select
          aria-label="Post-leave weekly working hours"
          className="plw-preset-select"
          value={s.wifePostBirthHours}
          onChange={(event) => {
            const next = toWorkingHours(Number(event.currentTarget.value));
            updateWorkbenchState((prev) => ({
              ...prev,
              wifePostBirthHours: next,
              customPregnancies: prev.customPregnancies.map((p) => ({
                ...p,
                motherPostBirthPartTimeHours: next,
              })),
            }));
          }}
        >
          {HOURS_PRESETS.map((h) => (
            <option key={h} value={h}>{h} h/wk</option>
          ))}
        </select>
      </div>

      {(switches.length > 1 || hoursChanges.length > 0) && (
        <div className="plw-chips" aria-label="Custom switches and schedules">
          {switches.length > 1 && switches.map((sw) => (
            <span key={sw.switchId} className="plw-chip plw-chip--gain">
              M{sw.effectiveSimulationMonth}: {sw.targetHusbandTaxClass}/{sw.targetWifeTaxClass}
              <button
                type="button"
                className="plw-chip__remove"
                aria-label={`Remove tax switch at M${sw.effectiveSimulationMonth}`}
                onClick={() => removeWorkbenchTaxSwitch(sw.switchId)}
              >
                ×
              </button>
            </span>
          ))}
          {hoursChanges.map((hc) => (
            <span key={hc.changeId} className="plw-chip">
              M{hc.effectiveSimulationMonth}: {hc.targetPerson} {hc.weeklyHours}h
              <button
                type="button"
                className="plw-chip__remove"
                aria-label={`Remove working hours change at M${hc.effectiveSimulationMonth}`}
                onClick={() => removeWorkbenchHoursChange(hc.changeId)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="plw-card__footer">
        <span>Custom switch dates or hour shifts</span>
        <button
          type="button"
          className="plw-granular-btn"
          onClick={() => openWorkbenchModal(WorkbenchGranularModal.TaxWork)}
        >
          Custom switches &amp; schedules…
        </button>
      </div>
    </section>
  );
}
