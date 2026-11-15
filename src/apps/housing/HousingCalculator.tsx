import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  housingEvaluation,
  housingState,
  resetHousingCalculator,
  syncHousingFromLifeProfile,
  updateHousingField,
} from "#/apps/housing/housingStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  EligibilityConfirmedIcon,
  HomeAcquisitionIcon,
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
  GERMAN_FEDERAL_STATE_LABELS,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
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
  return formatSharedEur(value);
}

export default function HousingCalculator(): JSX.Element {
  const s = housingState.value;
  const evalResult = housingEvaluation.value.value;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.Housing)} />
      <main id="main-content" className="domain-calc-page" tabIndex={-1}>
        <header className="domain-calc-header">
          <div>
            <span className="domain-calc-header__eyebrow">
              <HomeAcquisitionIcon size={15} />
              <span>Real Estate, Closing Costs &amp; Family Subsidies</span>
            </span>
            <h1>Home Purchase Planner</h1>
            <p className="domain-calc-header__subtitle">
              Estimate buying costs across all 16 states, KfW 300 family loans, and renovation tax credits.
            </p>
          </div>
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncHousingFromLifeProfile}
            onResetDefaults={resetHousingCalculator}
            syncTooltip="Populate planning year, federal state, property price, equity, children, household ZvE, KfW 300 options, and craftsmanship labor from the Unified Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.plansHomePurchase
                ? undefined
                : "Home acquisition is currently toggled off in Life Profile"
            }
          />
        </header>

        <div className="domain-calc-layout">
          <section className="domain-calc-card" aria-labelledby="housing-inputs-heading">
            <h2 id="housing-inputs-heading">Property &amp; Family Financing Details</h2>
            <div className="domain-calc-fields">
              <label className="domain-calc-field" for="housing-state">
                <span className="domain-calc-field__label-line">
                  <span>Federal State</span>
                  <LawRefLink lawId={LawId.GrEStG_11} label="§ 11 GrEStG" variant="badge" />
                </span>
                <select
                  id="housing-state"
                  value={s.federalState}
                  onChange={(event) => updateHousingField("federalState", toGermanFederalState(event.currentTarget.value))}
                >
                  {Object.entries(GERMAN_FEDERAL_STATE_LABELS).map(([code, label]) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </label>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="housing-price">
                  <span>Purchase Price (EUR)</span>
                  <input
                    id="housing-price"
                    type="number"
                    min={10000}
                    step={10000}
                    value={s.purchasePriceEur}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 10000) {
                        updateHousingField("purchasePriceEur", toEuroAmount(num));
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="housing-equity">
                  <span>Available Equity (EUR)</span>
                  <input
                    id="housing-equity"
                    type="number"
                    min={0}
                    step={5000}
                    value={s.availableEquityEur}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateHousingField("availableEquityEur", toEuroAmount(num));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-checkbox" for="housing-broker">
                <input
                  id="housing-broker"
                  type="checkbox"
                  checked={s.includesBrokerCommission}
                  onChange={(event) => updateHousingField("includesBrokerCommission", event.currentTarget.checked)}
                />
                <span>Include statutory buyer broker commission (Maklerprovision)</span>
              </label>

              <h3>KfW 300 &amp; § 35a Tax Relief</h3>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="housing-children">
                  <span className="domain-calc-field__label-line">
                    <span>Dependent Children</span>
                    <LawRefLink lawId={LawId.KfW_300} label="KfW 300" variant="badge" />
                  </span>
                  <input
                    id="housing-children"
                    type="number"
                    min={0}
                    max={15}
                    step={1}
                    value={s.dependentChildrenCount}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateHousingField("dependentChildrenCount", Math.round(num));
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="housing-zve">
                  <span>Avg. Household zvE (EUR)</span>
                  <input
                    id="housing-zve"
                    type="number"
                    min={0}
                    step={2000}
                    value={s.priorAverageHouseholdZvEEur}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0) {
                        updateHousingField("priorAverageHouseholdZvEEur", toEuroAmount(num));
                      }
                    }}
                  />
                </label>
              </div>

              <label className="domain-calc-checkbox" for="housing-newbuild">
                <input
                  id="housing-newbuild"
                  type="checkbox"
                  checked={s.isOwnerOccupiedNewBuildOrKfw300Standard}
                  onChange={(event) => updateHousingField("isOwnerOccupiedNewBuildOrKfw300Standard", event.currentTarget.checked)}
                />
                <span>Owner-occupied EH 40 new build (KfW 300 qualifying standard)</span>
              </label>

              <label className="domain-calc-checkbox" for="housing-qng">
                <input
                  id="housing-qng"
                  type="checkbox"
                  checked={s.isQngPlusCertified}
                  onChange={(event) => updateHousingField("isQngPlusCertified", event.currentTarget.checked)}
                />
                <span>QNG-Plus Sustainability Seal (+€50,000 subsidized loan boost)</span>
              </label>

              <label className="domain-calc-field" for="housing-craftsman">
                <span className="domain-calc-field__label-line">
                  <span>Annual Craftsmanship Labor Cost (EUR)</span>
                  <LawRefLink lawId={LawId.EStG_35a} label="§ 35a" variant="badge" />
                </span>
                <input
                  id="housing-craftsman"
                  type="number"
                  min={0}
                  step={250}
                  value={s.renovationLaborCostEur}
                  onInput={(event) => {
                    const num = Number(event.currentTarget.value);
                    if (Number.isFinite(num) && num >= 0) {
                      updateHousingField("renovationLaborCostEur", toEuroAmount(num));
                    }
                  }}
                />
              </label>

              <div className="domain-calc-field-row">
                <label className="domain-calc-field" for="housing-rate">
                  <span>Market Interest Rate (% p.a.)</span>
                  <input
                    id="housing-rate"
                    type="number"
                    min={0.5}
                    max={12}
                    step={0.1}
                    value={Number((s.marketMortgageAnnualInterestRate * 100).toFixed(2))}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num > 0 && num <= 15) {
                        updateHousingField("marketMortgageAnnualInterestRate", toPercentageRate(num / 100));
                      }
                    }}
                  />
                </label>

                <label className="domain-calc-field" for="housing-repay">
                  <span>Initial Repayment / Tilgung (% p.a.)</span>
                  <input
                    id="housing-repay"
                    type="number"
                    min={0.5}
                    max={15}
                    step={0.25}
                    value={Number((s.initialAnnualRepaymentRate * 100).toFixed(2))}
                    onInput={(event) => {
                      const num = Number(event.currentTarget.value);
                      if (Number.isFinite(num) && num >= 0.5 && num <= 20) {
                        updateHousingField("initialAnnualRepaymentRate", toPercentageRate(num / 100));
                      }
                    }}
                  />
                </label>
              </div>
            </div>
          </section>

          <div className="domain-calc-results">
            <div
              className={`domain-calc-banner domain-calc-banner--${evalResult.kfw300Eligible ? "gain" : "warn"}`}
              role="status"
            >
              <div>
                <strong>
                  {evalResult.kfw300Eligible ? <EligibilityConfirmedIcon size={18} /> : <StatutoryLimitationWarningIcon size={18} />}
                  <span>
                    {evalResult.kfw300Eligible
                      ? `Eligible for up to ${formatEur(evalResult.kfw300MaxSubsidizedLoanEur)} KfW 300 subsidized family loan`
                      : `Not eligible for KfW 300 (${s.dependentChildrenCount === 0 ? "requires 1+ minor children" : !s.isOwnerOccupiedNewBuildOrKfw300Standard ? "requires EH 40 new build" : `household zvE exceeds ${formatEur(evalResult.kfw300IncomeCeilingEur)} limit`})`}
                  </span>
                </strong>
                <p>
                  {evalResult.kfw300IncomeCeilingEur > 0
                    ? `Applicable KfW 300 household income limit with ${s.dependentChildrenCount} child(ren): ${formatEur(evalResult.kfw300IncomeCeilingEur)} zvE.`
                    : "KfW 300 Wohneigentum für Familien requires at least 1 minor child in the household."}
                </p>
              </div>
              <LawRefLink lawId={LawId.KfW_300} label="Read KfW 300 Program" />
            </div>

            <div className="domain-calc-kpis">
              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Total Closing Costs</span>
                  <LawRefLink lawId={LawId.GrEStG_11} label="§ 11" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--loss">
                  {formatEur(evalResult.totalClosingCostsEur)}
                </span>
                <span className="domain-calc-kpi__sub">
                  {(evalResult.totalClosingCostPercent * 100).toFixed(2)}% of purchase price
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>Remaining Bank Loan</span>
                </span>
                <span className="domain-calc-kpi__value">
                  {formatEur(evalResult.remainingBankLoanEur)}
                </span>
                <span className="domain-calc-kpi__sub">
                  Est. {formatEur(evalResult.estimatedMonthlyBankPaymentEur)}/mo bank annuity
                </span>
              </div>

              <div className="domain-calc-kpi">
                <span className="domain-calc-kpi__label">
                  <span>§ 35a Craftsmanship Credit</span>
                  <LawRefLink lawId={LawId.EStG_35a} label="§ 35a" variant="badge" />
                </span>
                <span className="domain-calc-kpi__value domain-calc-kpi__value--gain">
                  +{formatEur(evalResult.craftsmanTaxCreditEur)}
                </span>
                <span className="domain-calc-kpi__sub">
                  Direct annual EStG tax deduction (max €1,200/yr)
                </span>
              </div>
            </div>

            <section className="domain-calc-card" aria-labelledby="housing-breakdown-heading">
              <h2 id="housing-breakdown-heading">Acquisition Capital &amp; Closing Cost Breakdown</h2>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Cost / Financing Component</th>
                    <th className="num">Amount (EUR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Property Purchase Price</td>
                    <td className="num">{formatEur(s.purchasePriceEur)}</td>
                  </tr>
                  <tr>
                    <td>Real Estate Transfer Tax — Grunderwerbsteuer ({(evalResult.transferTaxRate * 100).toFixed(1)}%)</td>
                    <td className="num">{formatEur(evalResult.transferTaxEur)}</td>
                  </tr>
                  <tr>
                    <td>Notary &amp; Grundbuch Land Registry</td>
                    <td className="num">{formatEur(evalResult.notaryAndRegistryEur)}</td>
                  </tr>
                  <tr>
                    <td>Buyer Broker Commission (Maklercourtage)</td>
                    <td className="num">{formatEur(evalResult.buyerBrokerFeeEur)}</td>
                  </tr>
                  <tr>
                    <td>Total Acquisition Capital Needed</td>
                    <td className="num">{formatEur(evalResult.totalCapitalRequirementEur)}</td>
                  </tr>
                  <tr>
                    <td>Less: Available Household Equity</td>
                    <td className="num">-{formatEur(s.availableEquityEur)}</td>
                  </tr>
                  <tr>
                    <td>Less: Eligible KfW 300 Subsidized Loan</td>
                    <td className="num">-{formatEur(evalResult.kfw300MaxSubsidizedLoanEur)}</td>
                  </tr>
                  <tr className="is-total">
                    <th>Remaining Commercial Mortgage Financing Needed</th>
                    <td className="num">{formatEur(evalResult.remainingBankLoanEur)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Statutory Bases:</span>
                <LawRefLink lawId={LawId.GrEStG_11} label="GrEStG § 11" />
                <LawRefLink lawId={LawId.KfW_300} label="KfW 300" />
                <LawRefLink lawId={LawId.EStG_35a} label="EStG § 35a" />
              </div>
            </section>

            <ParameterObserverSection projectionProfile={FormProjectionProfileId.HousingFocus} />
          </div>
        </div>

        <footer className="domain-calc-footer">
          <span>Default notary/Grundbuch and buyer agent percentages can be adjusted in Statutory Assumptions below.</span>
          <SourceRevision />
        </footer>
      </main>
    </>
  );
}
