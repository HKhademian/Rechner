import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  resetSolarEnergyCalculator,
  solarEnergyEvaluation,
  solarEnergyState,
  syncSolarEnergyFromLifeProfile,
  updateSolarEnergyField,
} from "#/apps/solar-energy/solarEnergyStore.ts";
import {
  EligibilityConfirmedIcon,
  ResetDefaultsIcon,
  SolarEnergyIcon,
  StatutoryLimitationWarningIcon,
  SyncProfileActionIcon,
} from "#components/Icons";
import LawRefLink from "#components/laws/LawRefLink";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  SolarFeedInMode,
  toSolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

function formatEur(value: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
}

export default function SolarEnergyCalculator(): JSX.Element {
  const s = solarEnergyState.value;
  const evalResult = solarEnergyEvaluation.value.value;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.SolarEnergy)} />
      <main id="main-content" className="domain-calc-page" tabIndex={-1}>
        <header className="domain-calc-header">
          <div>
            <span className="domain-calc-header__eyebrow">
              <SolarEnergyIcon size={15} />
              <span>Rooftop Solar &amp; Clean Energy</span>
            </span>
            <h1>Solar PV, § 48 EEG Feed-In &amp; 0% VAT Calculator</h1>
            <p className="domain-calc-header__subtitle">
              Evaluate capacity-tiered EEG feed-in compensation, avoided grid electricity purchases, 0% UStG VAT savings, and 20-year payback.
            </p>
          </div>
          <div className="domain-calc-header__actions">
            <button
              type="button"
              className="domain-calc-btn domain-calc-btn--primary"
              onClick={syncSolarEnergyFromLifeProfile}
            >
              <SyncProfileActionIcon size={15} />
              <span>Sync from Shared Life Profile</span>
            </button>
            <button
              type="button"
              className="domain-calc-btn"
              onClick={resetSolarEnergyCalculator}
            >
              <ResetDefaultsIcon size={14} />
              <span>Reset Defaults</span>
            </button>
          </div>
        </header>

        <div className="domain-calc-layout">
          <section className="domain-calc-card" aria-labelledby="solar-inputs-heading">
            <h2 id="solar-inputs-heading">PV Array &amp; Consumption Profile</h2>
            <div className="domain-calc-fields">
              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="solar-kwp">
                  <span className="domain-calc-field__label-line">
                    <span>Installed Capacity (kWp)</span>
                    <LawRefLink lawId={LawId.EEG_48} label="§ 48 EEG" variant="badge" />
                  </span>
                  <input
                    id="solar-kwp"
                    type="number"
                    min={0.4}
                    max={100}
                    step={0.5}
                    value={s.capacityKwp}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0.4) {
                        updateSolarEnergyField("capacityKwp", num);
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="solar-yield">
                  <span>Specific Yield (kWh/kWp)</span>
                  <input
                    id="solar-yield"
                    type="number"
                    min={400}
                    max={1400}
                    step={25}
                    value={s.specificYieldKwhPerKwp}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 400) {
                        updateSolarEnergyField("specificYieldKwhPerKwp", num);
                      }
                    }}
                  />
                </label>
              </div>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="solar-cost">
                  <span className="domain-calc-field__label-line">
                    <span>Net System Cost (EUR)</span>
                    <LawRefLink lawId={LawId.UStG_12_3} label="0% USt" variant="badge" />
                  </span>
                  <input
                    id="solar-cost"
                    type="number"
                    min={200}
                    max={250000}
                    step={250}
                    value={s.systemCostNetEur}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 200) {
                        updateSolarEnergyField("systemCostNetEur", toEuroAmount(num));
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="solar-maint">
                  <span>Annual Maintenance (EUR)</span>
                  <input
                    id="solar-maint"
                    type="number"
                    min={0}
                    max={10000}
                    step={25}
                    value={s.annualMaintenanceEur}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateSolarEnergyField("annualMaintenanceEur", toEuroAmount(num));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-field" for="solar-mode">
                <span>EEG Feed-In Compensation Regime</span>
                <select
                  id="solar-mode"
                  value={s.feedInMode}
                  onChange={(event) => updateSolarEnergyField("feedInMode", toSolarFeedInMode(event.currentTarget.value))}
                >
                  <option value={SolarFeedInMode.PartialSelfConsumption}>Teileinspeisung (Partial Feed-In + Self-Consumption)</option>
                  <option value={SolarFeedInMode.FullFeedIn}>Volleinspeisung (100% Grid Feed-In at Higher Tariff)</option>
                </select>
              </label>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="solar-consumption">
                  <span>Household Demand (kWh/yr)</span>
                  <input
                    id="solar-consumption"
                    type="number"
                    min={0}
                    max={50000}
                    step={250}
                    value={s.annualHouseholdConsumptionKwh}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateSolarEnergyField("annualHouseholdConsumptionKwh", num);
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="solar-self-share">
                  <span>Self-Consumption Share (%)</span>
                  <input
                    id="solar-self-share"
                    type="number"
                    min={0}
                    max={100}
                    step={5}
                    value={Math.round(s.selfConsumptionShareRate * 100)}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0 && num <= 100) {
                        updateSolarEnergyField("selfConsumptionShareRate", toPercentageRate(num / 100));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-checkbox" for="solar-vat-zero">
                <input
                  id="solar-vat-zero"
                  type="checkbox"
                  checked={s.vatExemptEligible}
                  onChange={(event) => updateSolarEnergyField("vatExemptEligible", event.currentTarget.checked)}
                />
                <span>Eligible for 0% VAT zero-rating (§ 12 Abs. 3 UStG)</span>
              </label>
            </div>
          </section>

          <div className="domain-calc-results">
            <div
              className={`domain-calc-banner domain-calc-banner--${evalResult.isIncomeTaxExempt ? "gain" : "warn"}`}
              role="status"
            >
              <div>
                <strong>
                  {evalResult.isIncomeTaxExempt ? <EligibilityConfirmedIcon size={18} /> : <StatutoryLimitationWarningIcon size={18} />}
                  <span>
                    {evalResult.isIncomeTaxExempt
                      ? "Income-Tax Exempt under § 3 Nr. 72 EStG (PV system ≤ 30 kWp on qualifying building)"
                      : "Above 30 kWp threshold — feed-in revenue may be subject to income tax (§ 3 Nr. 72 EStG)"}
                  </span>
                </strong>
                <p>
                  {evalResult.isZeroVatEligible
                    ? `0% VAT (§ 12 Abs. 3 UStG) saves ${formatEur(evalResult.vatSavedAt19Percent)} upfront vs standard 19% VAT.`
                    : "Standard 19% VAT regime selected."}
                </p>
              </div>
              <LawRefLink lawId={LawId.EStG_3_72} label="Read § 3 Nr. 72 EStG" />
            </div>

            <div className="domain-calc-kpis">
              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Annual Net Cash Benefit</span>
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--gain">
                  +{formatEur(evalResult.annualNetCashBenefit)}
                </span>
                <span className="domain-calc-kpi__sub">
                  Generates {Math.round(evalResult.annualGenerationKwh).toLocaleString("de-DE")} kWh / year
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Simple Payback Period</span>
                </span>
                <span className="domain-calc-kpi__value">
                  {evalResult.simplePaybackYears !== null ? `${evalResult.simplePaybackYears.toFixed(1)} yrs` : "N/A"}
                </span>
                <span className="domain-calc-kpi__sub">
                  20-year EEG net gain {formatEur(evalResult.twentyYearNetGain)}
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Blended EEG Tariff</span>
                  <LawRefLink lawId={LawId.EEG_48} label="§ 48" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value">
                  {(evalResult.blendedFeedInTariffEurPerKwh * 100).toFixed(2)} ct/kWh
                </span>
                <span className="domain-calc-kpi__sub">
                  0% VAT savings: {formatEur(evalResult.vatSavedAt19Percent)}
                </span>
              </div>
            </div>

            <section className="domain-calc-card" aria-labelledby="solar-breakdown-heading">
              <h2 id="solar-breakdown-heading">Annual Energy &amp; Cash-Flow Breakdown</h2>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Yield &amp; Financial Metric</th>
                    <th className="num">Annual Figure</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Solar Electricity Generated</td>
                    <td className="num">{Math.round(evalResult.annualGenerationKwh).toLocaleString("de-DE")} kWh</td>
                  </tr>
                  <tr>
                    <td>Self-Consumed Electricity ({Math.round(s.selfConsumptionShareRate * 100)}% capped at demand)</td>
                    <td className="num">{Math.round(evalResult.selfConsumedKwh).toLocaleString("de-DE")} kWh</td>
                  </tr>
                  <tr>
                    <td>Grid-Fed Surplus Electricity</td>
                    <td className="num">{Math.round(evalResult.fedInKwh).toLocaleString("de-DE")} kWh</td>
                  </tr>
                  <tr>
                    <td>Avoided Grid Purchase Savings</td>
                    <td className="num">+{formatEur(evalResult.annualSelfConsumptionSavings)}</td>
                  </tr>
                  <tr>
                    <td>§ 48 EEG Feed-In Remuneration</td>
                    <td className="num">+{formatEur(evalResult.annualFeedInRevenue)}</td>
                  </tr>
                  <tr>
                    <td>Annual Maintenance Deduction</td>
                    <td className="num">-{formatEur(s.annualMaintenanceEur)}</td>
                  </tr>
                  <tr className="is-total">
                    <th>Annual Net Cash Benefit</th>
                    <td className="num">+{formatEur(evalResult.annualNetCashBenefit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Statutory Bases:</span>
                <LawRefLink lawId={LawId.EEG_48} label="EEG § 48" />
                <LawRefLink lawId={LawId.UStG_12_3} label="UStG § 12 Abs. 3" />
                <LawRefLink lawId={LawId.EStG_3_72} label="EStG § 3 Nr. 72" />
              </div>
            </section>

            <ParameterObserverSection projectionProfile={FormProjectionProfileId.SolarEnergyFocus} />
          </div>
        </div>

        <footer className="domain-calc-footer">
          <span>Customize the assumed household grid electricity tariff (EUR/kWh) inside Statutory Assumptions below.</span>
          <SourceRevision />
        </footer>
      </main>
    </>
  );
}
