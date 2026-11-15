import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  companyCarEvaluation,
  companyCarState,
  resetCompanyCarCalculator,
  syncCompanyCarFromLifeProfile,
  updateCompanyCarField,
} from "#/apps/company-car/companyCarStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  CompanyCarMobilityIcon,
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import LawRefLink from "#components/laws/LawRefLink";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  CommuteValuationMethod,
  VehiclePowertrain,
  toCommuteValuationMethod,
  toVehiclePowertrain,
} from "#engine/formulas/pure/companyCarFormulas";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";

function formatEur(value: number): string {
  return formatSharedEur(value, 2);
}

export default function CompanyCarCalculator(): JSX.Element {
  const s = companyCarState.value;
  const evalResult = companyCarEvaluation.value.value;
  const evCapExceeded = s.powertrain === VehiclePowertrain.PureElectricEv && evalResult.exceedsEvQuarterRateCap;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.CompanyCar)} />
      <main id="main-content" className="domain-calc-page" tabIndex={-1}>
        <header className="domain-calc-header">
          <div>
            <span className="domain-calc-header__eyebrow">
              <CompanyCarMobilityIcon size={15} />
              <span>Dienstwagen &amp; Electric Mobility</span>
            </span>
            <h1>Company Car Calculator</h1>
            <p className="domain-calc-header__subtitle">
              Compare tax on electric, hybrid, and fuel company cars, including your commute.
            </p>
          </div>
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncCompanyCarFromLifeProfile}
            onResetDefaults={resetCompanyCarCalculator}
            syncTooltip="Populate planning year, vehicle gross list price, powertrain, commute distance, office days, and marginal rate from the Unified Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.hasCompanyCar
                ? undefined
                : "Company car is currently toggled off in Life Profile"
            }
          />
        </header>

        <div className="domain-calc-layout">
          <section className="domain-calc-card" aria-labelledby="car-inputs-heading">
            <h2 id="car-inputs-heading">Vehicle &amp; Commute Configuration</h2>
            <div className="domain-calc-fields">
              <label className="domain-calc-field" for="car-blp">
                <span className="domain-calc-field__label-line">
                  <span>Gross List Price — Bruttolistenpreis (EUR)</span>
                  <LawRefLink lawId={LawId.EStG_6_1_4} label="§ 6 EStG" variant="badge" />
                </span>
                <input
                  id="car-blp"
                  type="number"
                  min={5000}
                  max={500000}
                  step={500}
                  value={s.grossListPriceEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 5000) {
                      updateCompanyCarField("grossListPriceEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>

              <label className="domain-calc-field" for="car-powertrain">
                <span>Vehicle Powertrain Tier</span>
                <select
                  id="car-powertrain"
                  value={s.powertrain}
                  onChange={(event) => updateCompanyCarField("powertrain", toVehiclePowertrain(event.currentTarget.value))}
                >
                  <option value={VehiclePowertrain.PureElectricEv}>Electric (0.25% under cap, 0.50% above)</option>
                  <option value={VehiclePowertrain.PlugInHybrid}>Plug-in Hybrid (0.50%)</option>
                  <option value={VehiclePowertrain.CombustionIce}>Petrol / Diesel (1.00%)</option>
                </select>
              </label>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="car-commute-km">
                  <span className="domain-calc-field__label-line">
                    <span>One-Way Commute (km)</span>
                    <LawRefLink lawId={LawId.EStG_8_2} label="§ 8 Abs. 2" variant="badge" />
                  </span>
                  <input
                    id="car-commute-km"
                    type="number"
                    min={0}
                    max={500}
                    step={1}
                    value={s.commuteOneWayKm}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateCompanyCarField("commuteOneWayKm", num);
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="car-office-days">
                  <span>Office Commute Days / Mo</span>
                  <input
                    id="car-office-days"
                    type="number"
                    min={0}
                    max={31}
                    step={1}
                    value={s.commuteOfficeDaysPerMonth}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateCompanyCarField("commuteOfficeDaysPerMonth", Math.min(31, Math.round(num)));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-field" for="car-commute-method">
                <span>Commute tax method</span>
                <select
                  id="car-commute-method"
                  value={s.commuteValuationMethod}
                  onChange={(event) => updateCompanyCarField("commuteValuationMethod", toCommuteValuationMethod(event.currentTarget.value))}
                >
                  <option value={CommuteValuationMethod.MonthlyFlat003}>Monthly flat rate (0.03% per km)</option>
                  <option value={CommuteValuationMethod.PerTrip0002}>Per office trip (0.002% per km)</option>
                </select>
              </label>

              <label className="domain-calc-field" for="car-tax-rate">
                <span>Combined Marginal Tax + Social Rate (%)</span>
                <input
                  id="car-tax-rate"
                  type="number"
                  min={0}
                  max={60}
                  step={1}
                  value={Math.round(s.combinedMarginalTaxAndSocialRate * 100)}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0 && num <= 60) {
                      updateCompanyCarField("combinedMarginalTaxAndSocialRate", toPercentageRate(num / 100));
                    }
                  }}
                />
              </label>
            </div>
          </section>

          <div className="domain-calc-results">
            <div className={`domain-calc-banner domain-calc-banner--${evCapExceeded ? "warn" : "gain"}`} role="status">
              <div>
                <strong>
                  {evCapExceeded ? <StatutoryLimitationWarningIcon size={18} /> : <EligibilityConfirmedIcon size={18} />}
                  <span>
                    {evCapExceeded
                      ? "List price exceeds EV cap — taxed at 0.50% instead of 0.25%"
                      : `Taxable basis: ${Math.round(evalResult.effectiveBasisMultiplier * 100)}% of list price (${formatEur(evalResult.effectiveAssessmentBasis)})`}
                  </span>
                </strong>
                <p>
                  {evalResult.perTripCommuteSavesMoney
                    ? `With ${s.commuteOfficeDaysPerMonth} office days/mo (< 15), per-trip tracking saves ${formatEur(evalResult.monthlyCommuteFlat003Alternative - evalResult.monthlyCommutePerTripAlternative)}/mo taxable benefit.`
                    : "The monthly flat commute rate is equal or lower at this office attendance."}
                </p>
              </div>
              <LawRefLink lawId={LawId.EStG_6_1_4} label="Read § 6 Abs. 1 Nr. 4" />
            </div>

            <div className="domain-calc-kpis">
              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Monthly Imputed Benefit</span>
                  <LawRefLink lawId={LawId.EStG_6_1_4} label="1%/0.25%" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value">{formatEur(evalResult.totalMonthlyImputedBenefit)}</span>
                <span className="domain-calc-kpi__sub">
                  {formatEur(evalResult.totalAnnualImputedBenefit)} / year taxable gross
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Est. Monthly Net Cost</span>
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--loss">
                  -{formatEur(evalResult.estimatedMonthlyNetCost)}
                </span>
                <span className="domain-calc-kpi__sub">
                  -{formatEur(evalResult.estimatedAnnualNetCost)} / year net deduction
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Annual Net Savings vs ICE</span>
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--gain">
                  +{formatEur(evalResult.annualTaxSavingsVsIce)}
                </span>
                <span className="domain-calc-kpi__sub">
                  Equivalent ICE net cost: {formatEur(evalResult.equivalentIceAnnualNetCost)}/yr
                </span>
              </div>
            </div>

            <section className="domain-calc-card" aria-labelledby="car-breakdown-heading">
              <h2 id="car-breakdown-heading">Monthly Tax &amp; Commute Comparison</h2>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Statutory Component</th>
                    <th className="num">Monthly Taxable Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Rounded BLP (nearest full €100 down)</td>
                    <td className="num">{formatEur(evalResult.roundedListPrice)}</td>
                  </tr>
                  <tr>
                    <td>Private Use Valuation (1% × {Math.round(evalResult.effectiveBasisMultiplier * 100)}% basis)</td>
                    <td className="num">{formatEur(evalResult.monthlyPrivateUseBenefit)}</td>
                  </tr>
                  <tr>
                    <td>Commute — Active Selected Method ({s.commuteOneWayKm} km)</td>
                    <td className="num">{formatEur(evalResult.monthlyCommuteBenefit)}</td>
                  </tr>
                  <tr>
                    <td>Commute Alternative: 0.03% Flat Rate</td>
                    <td className="num">{formatEur(evalResult.monthlyCommuteFlat003Alternative)}</td>
                  </tr>
                  <tr>
                    <td>Commute Alternative: 0.002% × {s.commuteOfficeDaysPerMonth} Trips</td>
                    <td className="num">{formatEur(evalResult.monthlyCommutePerTripAlternative)}</td>
                  </tr>
                  <tr className="is-total">
                    <th>Total Monthly Geldwerter Vorteil</th>
                    <td className="num">{formatEur(evalResult.totalMonthlyImputedBenefit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Statutory Bases:</span>
                <LawRefLink lawId={LawId.EStG_6_1_4} label="EStG § 6 Abs. 1 Nr. 4" />
                <LawRefLink lawId={LawId.EStG_8_2} label="EStG § 8 Abs. 2" />
              </div>
            </section>

            <ParameterObserverSection projectionProfile={FormProjectionProfileId.CompanyCarFocus} />
          </div>
        </div>

        <footer className="domain-calc-footer">
          <span>EV gross list price cap switches automatically between 2024 (€70,000) and 2025/2026 (€100,000).</span>
          <SourceRevision />
        </footer>
      </main>
    </>
  );
}
