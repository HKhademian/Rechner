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
  AddActionIcon,
  DismissIcon,
  EditSettingsIcon,
  RemoveItemIcon,
} from "#components/Icons";
import {
  TaxClass,
  toCalendarMonth,
  toEuroAmount,
  toGrossSalary,
  toPercentageRate,
  toSimulationMonth,
  toTaxClass,
  toWorkingHours,
} from "#engine/types";
import {
  GERMAN_FEDERAL_STATE_LABELS,
  GermanFederalState,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  HealthInsuranceKind,
  LifePersonKey,
  ResidencyPermitBaseline,
  toHealthInsuranceKind,
  toResidencyPermitBaseline,
} from "#engine/lifeSimulator/types";
import {
  lifeWorkbenchPlan,
  removeLifeEvent,
  updateLifeBaseline,
} from "#/apps/life-planner/store/lifeWorkbenchState.ts";
import {
  closeLifeInputsDrawer,
  lifeDrawerOpen,
  openLifeEventComposer,
  openLifeEventEditor,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

function parseNonNegative(raw: string): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function churchTaxRateForState(state: GermanFederalState): number {
  return state === GermanFederalState.Bayern || state === GermanFederalState.BadenWuerttemberg
    ? 0.08
    : 0.09;
}

/**
 * Slide-over Plan Inputs Drawer — Complete Household Baseline Profile for the new Life Planner.
 * Covers Payroll & Tax Precision (State, Church Tax, GKV/PKV, 12x-14x cadence), Opening Balance
 * Sheet (Cash, Investments & Return, Existing Debt), Housing/Inflation Macro, Employment Terms
 * (Notice, Tenure/Severance, ALG I), Residency & Permit Clock, and Scheduled Events.
 */
export function LifePlanInputsDrawer(): JSX.Element | null {
  const open = lifeDrawerOpen.value;
  const plan = lifeWorkbenchPlan.value;
  const { baseline, events } = plan;

  const activeState = baseline.federalState ?? GermanFederalState.NordrheinWestfalen;
  const hasChurchTax = baseline.primary.churchTaxRate > 0;
  const primaryHealthKind = baseline.primary.healthInsuranceKind ?? HealthInsuranceKind.PublicGkv;
  const activePermit = baseline.residencyPermit ?? ResidencyPermitBaseline.CitizenOrEu;

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
      aria-label="Edit Life Plan Baseline Profile"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          closeLifeInputsDrawer();
        }
      }}
    >
      <aside className="lpw-drawer">
        <div className="lpw-drawer__header">
          <h2 className="lpw-drawer__title">Life Plan Profile &amp; Baseline</h2>
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
          {/* Card 1: Household, Payroll & Tax Precision */}
          <section className="lpw-card">
            <div className="lpw-card__header">
              <h3 className="lpw-card__title">Household, Payroll &amp; Tax</h3>
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
                          churchTaxRate: prev.primary.churchTaxRate,
                        }
                        : undefined,
                    }));
                  }}
                />
                {" "}
                Partner
              </label>
            </div>

            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-state">Federal State</label>
                <select
                  id="lpw-state"
                  value={activeState}
                  onChange={(e) => {
                    const nextState = toGermanFederalState(e.currentTarget.value);
                    const nextRate = hasChurchTax ? toPercentageRate(churchTaxRateForState(nextState)) : toPercentageRate(0);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      federalState: nextState,
                      primary: Object.freeze({
                        ...prev.primary,
                        churchTaxRate: nextRate,
                      }),
                      partner: prev.partner
                        ? Object.freeze({
                          ...prev.partner,
                          churchTaxRate: nextRate,
                        })
                        : undefined,
                    }));
                  }}
                >
                  {Object.values(GermanFederalState).map((st) => (
                    <option key={st} value={st}>{GERMAN_FEDERAL_STATE_LABELS[st]}</option>
                  ))}
                </select>
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-church">Church Tax ({Math.round(churchTaxRateForState(activeState) * 100)}%)</label>
                <select
                  id="lpw-church"
                  value={hasChurchTax ? "yes" : "no"}
                  onChange={(e) => {
                    const enabled = e.currentTarget.value === "yes";
                    const nextRate = enabled
                      ? toPercentageRate(churchTaxRateForState(activeState))
                      : toPercentageRate(0);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        churchTaxRate: nextRate,
                      }),
                      partner: prev.partner
                        ? Object.freeze({
                          ...prev.partner,
                          churchTaxRate: nextRate,
                        })
                        : undefined,
                    }));
                  }}
                >
                  <option value="no">None (0%)</option>
                  <option value="yes">Active ({Math.round(churchTaxRateForState(activeState) * 100)}%)</option>
                </select>
              </div>

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

              <div className="lpw-field">
                <label htmlFor="lpw-primary-cadence">Salary Cadence</label>
                <select
                  id="lpw-primary-cadence"
                  value={baseline.primary.annualSalariesCount ?? 12}
                  onChange={(e) => {
                    const count = Number(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        annualSalariesCount: count,
                      }),
                    }));
                  }}
                >
                  <option value={12}>12× Monthly</option>
                  <option value={13}>13× (+Nov Christmas)</option>
                  <option value={14}>14× (+Jun &amp; Nov)</option>
                </select>
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-health-kind">Health Insurance</label>
                <select
                  id="lpw-health-kind"
                  value={primaryHealthKind}
                  onChange={(e) => {
                    const nextKind = toHealthInsuranceKind(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        healthInsuranceKind: nextKind,
                        privateHealthMonthlyEur: prev.primary.privateHealthMonthlyEur ?? toEuroAmount(420),
                      }),
                    }));
                  }}
                >
                  <option value={HealthInsuranceKind.PublicGkv}>Public (GKV)</option>
                  <option value={HealthInsuranceKind.PrivatePkv}>Private (PKV)</option>
                </select>
              </div>

              {primaryHealthKind === HealthInsuranceKind.PrivatePkv ? (
                <div className="lpw-field">
                  <label htmlFor="lpw-pkv-eur">PKV Employee Share (€/mo)</label>
                  <input
                    id="lpw-pkv-eur"
                    type="number"
                    min={0}
                    step={20}
                    value={baseline.primary.privateHealthMonthlyEur ?? 420}
                    onInput={(e) => {
                      const val = parseNonNegative(e.currentTarget.value);
                      updateLifeBaseline((prev) => ({
                        ...prev,
                        primary: Object.freeze({
                          ...prev.primary,
                          privateHealthMonthlyEur: toEuroAmount(val),
                        }),
                      }));
                    }}
                  />
                </div>
              ) : (
                <div className="lpw-field">
                  <label htmlFor="lpw-gkv-supp">GKV Zusatzbeitrag (%)</label>
                  <input
                    id="lpw-gkv-supp"
                    type="number"
                    min={0}
                    max={6}
                    step={0.1}
                    value={Math.round((baseline.primary.healthSupplementRate ?? 0.025) * 1000) / 10}
                    onInput={(e) => {
                      const pct = parseNonNegative(e.currentTarget.value);
                      updateLifeBaseline((prev) => ({
                        ...prev,
                        primary: Object.freeze({
                          ...prev.primary,
                          healthSupplementRate: toPercentageRate(pct / 100),
                        }),
                      }));
                    }}
                  />
                </div>
              )}

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

          {/* Card 2: Opening Balance Sheet (Cash, Investments, Existing Debt) */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Opening Balance Sheet</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-open-cash">Liquid Cash (€)</label>
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
                <label htmlFor="lpw-open-invest">Existing Investments / ETFs (€)</label>
                <input
                  id="lpw-open-invest"
                  type="number"
                  min={0}
                  step={1000}
                  value={baseline.openingInvestmentsValue ?? 0}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      openingInvestmentsValue: toEuroAmount(val),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-invest-return">Expected Return (%/yr)</label>
                <input
                  id="lpw-invest-return"
                  type="number"
                  min={0}
                  max={15}
                  step={0.5}
                  value={Math.round((baseline.annualInvestmentReturnRate ?? 0.05) * 1000) / 10}
                  onInput={(e) => {
                    const pct = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      annualInvestmentReturnRate: toPercentageRate(pct / 100),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-open-debt">Existing Debt Balance (€)</label>
                <input
                  id="lpw-open-debt"
                  type="number"
                  min={0}
                  step={500}
                  value={baseline.openingDebtBalance}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      openingDebtBalance: toEuroAmount(val),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-debt-pmt">Debt Payment (€/mo)</label>
                <input
                  id="lpw-debt-pmt"
                  type="number"
                  min={0}
                  step={50}
                  value={baseline.openingDebtMonthlyPayment ?? 0}
                  onInput={(e) => {
                    const val = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      openingDebtMonthlyPayment: toEuroAmount(val),
                    }));
                  }}
                />
              </div>
            </div>
          </section>

          {/* Card 3: Housing, Living Budget & Macro Inflation */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Housing, Budget &amp; Inflation</h3>
            <div className="lpw-field-grid">
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
                <label htmlFor="lpw-rent-idx">Rent Indexation (%/yr)</label>
                <input
                  id="lpw-rent-idx"
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={Math.round(baseline.annualRentIndexationRate * 1000) / 10}
                  onInput={(e) => {
                    const pct = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      annualRentIndexationRate: toPercentageRate(pct / 100),
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

              <div className="lpw-field">
                <label htmlFor="lpw-cpi">Living Inflation CPI (%/yr)</label>
                <input
                  id="lpw-cpi"
                  type="number"
                  min={0}
                  max={10}
                  step={0.5}
                  value={Math.round(baseline.annualInflationRate * 1000) / 10}
                  onInput={(e) => {
                    const pct = parseNonNegative(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      annualInflationRate: toPercentageRate(pct / 100),
                    }));
                  }}
                />
              </div>
            </div>
          </section>

          {/* Card 4: Employment Terms (Disaster Baseline) */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Employment Terms (Disaster Baseline)</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-tenure">Employer Tenure (Years)</label>
                <input
                  id="lpw-tenure"
                  type="number"
                  min={0}
                  max={45}
                  step={1}
                  value={baseline.primary.tenureYears ?? 0}
                  onInput={(e) => {
                    const yrs = Math.trunc(parseNonNegative(e.currentTarget.value));
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        tenureYears: yrs,
                      }),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-notice">Notice Period (Months)</label>
                <input
                  id="lpw-notice"
                  type="number"
                  min={1}
                  max={12}
                  step={1}
                  value={baseline.primary.contractNoticeMonths ?? 3}
                  onInput={(e) => {
                    const mo = Math.max(1, Math.min(12, Math.trunc(parseNonNegative(e.currentTarget.value))));
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        contractNoticeMonths: mo,
                      }),
                    }));
                  }}
                />
              </div>

              <div className="lpw-field">
                <label htmlFor="lpw-alg1">ALG I Insured</label>
                <select
                  id="lpw-alg1"
                  value={baseline.primary.alg1Insured === false ? "no" : "yes"}
                  onChange={(e) => {
                    const insured = e.currentTarget.value === "yes";
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      primary: Object.freeze({
                        ...prev.primary,
                        alg1Insured: insured,
                      }),
                    }));
                  }}
                >
                  <option value="yes">Yes (Employee — 60%/67% ALG I)</option>
                  <option value="no">No (Self-employed — €0 ALG I)</option>
                </select>
              </div>
            </div>
            <p className="lpw-hint">
              Employer tenure auto-estimates § 1a KSchG severance (0.5× gross × years) during layoff stress tests.
            </p>
          </section>

          {/* Card 5: Residency & Permit Clock */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Residency &amp; Permit Clock</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-permit">Current Status</label>
                <select
                  id="lpw-permit"
                  value={activePermit}
                  onChange={(e) => {
                    const nextPermit = toResidencyPermitBaseline(e.currentTarget.value);
                    updateLifeBaseline((prev) => ({
                      ...prev,
                      residencyPermit: nextPermit,
                    }));
                  }}
                >
                  <option value={ResidencyPermitBaseline.CitizenOrEu}>German / EU Citizen</option>
                  <option value={ResidencyPermitBaseline.PermanentResidency}>Permanent Residency (§ 18c)</option>
                  <option value={ResidencyPermitBaseline.EuBlueCard}>EU Blue Card (§ 18g)</option>
                  <option value={ResidencyPermitBaseline.SkilledWorker18b}>Skilled Worker (§ 18b)</option>
                  <option value={ResidencyPermitBaseline.OtherPermit}>Other Residence Permit</option>
                </select>
              </div>

              {activePermit !== ResidencyPermitBaseline.CitizenOrEu && (
                <>
                  <div className="lpw-field">
                    <label htmlFor="lpw-yrs-de">Years in Germany</label>
                    <input
                      id="lpw-yrs-de"
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      value={baseline.yearsInGermany ?? 1}
                      onInput={(e) => {
                        const val = parseNonNegative(e.currentTarget.value);
                        updateLifeBaseline((prev) => ({
                          ...prev,
                          yearsInGermany: val,
                        }));
                      }}
                    />
                  </div>

                  <div className="lpw-field">
                    <label htmlFor="lpw-permit-exp">Permit Expiry Month (optional)</label>
                    <input
                      id="lpw-permit-exp"
                      type="number"
                      min={0}
                      max={baseline.horizonMonths}
                      step={1}
                      value={baseline.permitExpiryMonth ?? 0}
                      onInput={(e) => {
                        const val = Math.trunc(parseNonNegative(e.currentTarget.value));
                        updateLifeBaseline((prev) => ({
                          ...prev,
                          permitExpiryMonth: val > 0 ? toSimulationMonth(val) : undefined,
                        }));
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Card 6: Horizon, Tax Return & Scheduled Events */}
          <section className="lpw-card">
            <h3 className="lpw-card__title">Horizon &amp; Tax Return Month</h3>
            <div className="lpw-field-grid">
              <div className="lpw-field">
                <label htmlFor="lpw-horizon">Horizon</label>
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

          <section className="lpw-card">
            <div className="lpw-card__header">
              <h3 className="lpw-card__title">Scheduled Events ({events.length})</h3>
              <Button
                size={ButtonSize.Sm}
                variant={ButtonVariant.Secondary}
                onClick={() => {
                  closeLifeInputsDrawer();
                  openLifeEventComposer();
                }}
              >
                <AddActionIcon size={12} />
                <span>Add Event</span>
              </Button>
            </div>
            {events.length === 0 ? (
              <p className="lpw-hint">No scheduled events yet. Click + Add Event or pick a template from the Plan menu.</p>
            ) : (
              <div className="lpw-event-list">
                {events.map((ev) => (
                  <div key={ev.id} className="lpw-event-row">
                    <span>
                      <strong>M{ev.effectiveMonth}</strong>
                      {" · "}
                      {ev.title}
                    </span>
                    <span>
                      <Button
                        size={ButtonSize.Sm}
                        variant={ButtonVariant.Ghost}
                        onClick={() => {
                          closeLifeInputsDrawer();
                          openLifeEventEditor(ev.id);
                        }}
                        aria-label={`Edit ${ev.title}`}
                      >
                        <EditSettingsIcon size={13} />
                      </Button>
                      <Button
                        size={ButtonSize.Sm}
                        variant={ButtonVariant.Ghost}
                        onClick={() => removeLifeEvent(ev.id)}
                        aria-label={`Remove ${ev.title}`}
                      >
                        <RemoveItemIcon size={13} />
                      </Button>
                    </span>
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
