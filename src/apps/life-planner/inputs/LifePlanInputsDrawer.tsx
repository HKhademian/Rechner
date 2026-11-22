import type {
  JSX,
} from "preact";
import {
  useEffect,
} from "preact/hooks";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  DismissIcon,
  RemoveItemIcon,
} from "#components/Icons";
import {
  TaxClass,
  toCalendarMonth,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toTaxClass,
  toWorkingHours,
} from "#engine/types";
import {
  LifePersonKey,
} from "#engine/lifeSimulator/types";
import {
  lifeWorkbenchPlan,
  removeLifeEvent,
  updateLifeBaseline,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  closeLifeInputsDrawer,
  lifeDrawerOpen,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

function parseNonNegative(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

/**
 * Slide-over Plan Inputs Drawer (Phase 2 baseline editor + active event list).
 * Keeps the main analysis canvas 100% uncluttered while allowing live edits.
 */
export function LifePlanInputsDrawer(): JSX.Element | null {
  const open = lifeDrawerOpen.value;
  const plan = lifeWorkbenchPlan.value;
  const { baseline, events } = plan;

  useEffect(() => {
    if (!open || typeof document === "undefined") {
      return undefined;
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        closeLifeInputsDrawer();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="lpw-drawer-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Edit Life Plan Inputs"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLifeInputsDrawer();
        }
      }}
    >
      <aside className="lpw-drawer">
        <div className="lpw-drawer__header">
          <h2 className="lpw-drawer__title">Edit Life Plan</h2>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Ghost}
            onClick={closeLifeInputsDrawer}
            aria-label="Close Plan Inputs drawer"
          >
            <DismissIcon size={14} />
          </Button>
        </div>

        <div className="lpw-drawer__body">
          {/* Card 1: Household & Salaries */}
          <section className="lpw-card">
            <div className="lpw-card__header">
              <h3 className="lpw-card__title">Household &amp; Salaries</h3>
              <label className="lpw-hint">
                <input
                  type="checkbox"
                  checked={Boolean(baseline.partner)}
                  onChange={(e) => {
                    const checked = e.currentTarget.checked;
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      isMarriedJointAssessment: checked,
                      partner: checked
                        ? {
                          personKey: LifePersonKey.Partner,
                          name: "Partner",
                          monthlyGross: toGrossSalary(4500),
                          weeklyHours: toWorkingHours(40),
                          taxClass: TaxClass.IV,
                          churchTaxRate: toPercentageRate(0),
                        }
                        : undefined,
                    }));
                  }}
                />
                {" "}
                Include Partner
              </label>
            </div>

            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-primary-gross">Primary Gross (€/mo)</label>
                <input
                  id="lpw-primary-gross"
                  type="number"
                  min={0}
                  step={100}
                  value={baseline.primary.monthlyGross}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        monthlyGross: toGrossSalary(val),
                      }),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-primary-tax">Primary Tax Class</label>
                <select
                  id="lpw-primary-tax"
                  value={baseline.primary.taxClass}
                  onChange={(e) => {
                    const tc = toTaxClass(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        taxClass: tc,
                      }),
                    }));
                  }}
                >
                  {Object.values(TaxClass).map((tc) => (
                    <option key={tc} value={tc}>Class {tc}</option>
                  ))}
                </select>
              </div>

              {baseline.partner && (
                <>
                  <div className="lpw-field">
                    <label htmlFor="lpw-partner-gross">Partner Gross (€/mo)</label>
                    <input
                      id="lpw-partner-gross"
                      type="number"
                      min={0}
                      step={100}
                      value={baseline.partner.monthlyGross}
                      onInput={(e) => {
                        const val = parseNonNegative(e.currentTarget.value);
                        updateLifeBaseline((prev) => ({
                          ...prev,
                          partner: prev.partner
                            ? Object.freeze({
                              ...prev.partner,
                              monthlyGross: toGrossSalary(val),
                            })
                            : undefined,
                        }));
                      }}
                    />
                  </div>

                  <div className="lpw-field">
                    <label htmlFor="lpw-partner-tax">Partner Tax Class</label>
                    <select
                      id="lpw-partner-tax"
                      value={baseline.partner.taxClass}
                      onChange={(e) => {
                        const tc = toTaxClass(e.currentTarget.value);
                        updateLifeBaseline((prev) => ({
                          ...prev,
                          partner: prev.partner
                            ? Object.freeze({
                              ...prev.partner,
                              taxClass: tc,
                            })
                            : undefined,
                        }));
                      }}
                    >
                      {Object.values(TaxClass).map((tc) => (
                        <option key={tc} value={tc}>Class {tc}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Card 2: Opening Cash, Housing & Living Costs */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Cash, Housing &amp; Monthly Budget</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-open-cash">Opening Liquid Cash (€)</label>
                <input
                  id="lpw-open-cash"
                  type="number"
                  min={0}
                  step={1000}
                  value={baseline.openingLiquidCash}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      openingLiquidCash: toEuroAmount(val),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-emergency-months">Emergency Floor (Months)</label>
                <input
                  id="lpw-emergency-months"
                  type="number"
                  min={0}
                  max={24}
                  step={1}
                  value={baseline.emergencyBufferMonths}
                  onInput={(e) => {
                    const val = Math.min(24, Math.trunc(parseNonNegative(e.currentTarget.value)));
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      emergencyBufferMonths: val,
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-rent">Monthly Rent (€/mo)</label>
                <input
                  id="lpw-rent"
                  type="number"
                  min={0}
                  step={50}
                  value={baseline.monthlyRent}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      monthlyRent: toEuroAmount(val),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-living">Living Expenses (€/mo)</label>
                <input
                  id="lpw-living"
                  type="number"
                  min={0}
                  step={50}
                  value={baseline.monthlyLivingExpenses}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      monthlyLivingExpenses: toEuroAmount(val),
                    }));
                  }}
                />
              </div>
            </div>
          </section>

          {/* Card 3: Horizon & Tax Return Month */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Horizon &amp; Tax Settings</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-horizon">Horizon (Months)</label>
                <select
                  id="lpw-horizon"
                  value={baseline.horizonMonths}
                  onChange={(e) => {
                    const m = Math.max(12, Math.min(360, Number(e.currentTarget.value)));
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      horizonMonths: m,
                    }));
                  }}
                >
                  <option value={36}>3 Years (36M)</option>
                  <option value={60}>5 Years (60M)</option>
                  <option value={120}>10 Years (120M)</option>
                  <option value={180}>15 Years (180M)</option>
                </select>
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-tax-month">Tax Refund Month</label>
                <select
                  id="lpw-tax-month"
                  value={baseline.taxReturnMonth}
                  onChange={(e) => {
                    const m = toCalendarMonth(Number(e.currentTarget.value));
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      taxReturnMonth: m,
                    }));
                  }}
                >
                  {[3, 4, 5, 6, 7, 8, 9, 10].map((m) => (
                    <option key={m} value={m}>Month {m}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          {/* Card 4: Active Life Events */}
          <section className="lpw-card">
            <div className="lpw-card__header">
              <h3 className="lpw-card__title">Scheduled Events ({events.length})</h3>
            </div>
            {events.length === 0 ? (
              <p className="lpw-hint">No scheduled events yet. Pick a starter template from the Plan menu to explore.</p>
            ) : (
              <div className="lpw-event-list">
                {events.map((ev) => (
                  <div key={ev.id} className="lpw-event-row">
                    <span>
                      <strong>M{ev.effectiveMonth}</strong>
                      {" · "}
                      {ev.title}
                    </span>
                    <Button
                      size={ButtonSize.Sm}
                      variant={ButtonVariant.Ghost}
                      onClick={() => removeLifeEvent(ev.id)}
                      aria-label={`Remove ${ev.title}`}
                    >
                      <RemoveItemIcon size={13} />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}
