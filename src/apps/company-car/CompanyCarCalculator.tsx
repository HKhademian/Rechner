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
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
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

const POWERTRAIN_OPTIONS = [
  { value: VehiclePowertrain.PureElectricEv,
    label: "Electric" },
  { value: VehiclePowertrain.PlugInHybrid,
    label: "Hybrid" },
  { value: VehiclePowertrain.CombustionIce,
    label: "Petrol / Diesel" },
] as const;

const COMMUTE_OPTIONS = [
  { value: CommuteValuationMethod.MonthlyFlat003,
    label: "Flat 0.03% / km" },
  { value: CommuteValuationMethod.PerTrip0002,
    label: "Per trip 0.002%" },
] as const;

const LIST_PRICE_PRESETS = [
  { value: 45000,
    label: "€45k" },
  { value: 65000,
    label: "€65k" },
  { value: 85000,
    label: "€85k" },
] as const;

export default function CompanyCarCalculator(): JSX.Element {
  const s = companyCarState.value;
  const evalResult = companyCarEvaluation.value.value;
  const evCapExceeded = s.powertrain === VehiclePowertrain.PureElectricEv && evalResult.exceedsEvQuarterRateCap;

  return (
    <>
      <Navigation currentPath={calculatorPath(AppId.CompanyCar)} />
      <main id="main-content" className="ui-page" tabIndex={-1}>
        <PageHeader
          eyebrow="Company Car"
          title="Company Car Calculator"
          subtitle="Estimate your monthly taxable benefit and net cost for electric, hybrid, or fuel cars."
          actions={(
            <DomainCalculatorHeaderActions
              onSyncLifeProfile={syncCompanyCarFromLifeProfile}
              onResetDefaults={resetCompanyCarCalculator}
              syncTooltip="Load planning year, car price, powertrain, commute, and tax rate from your Life Profile"
              inactiveInLifeProfileMessage={
                unifiedLifeProfile.value.hasCompanyCar
                  ? undefined
                  : "Company car is currently off in your Life Profile"
              }
            />
          )}
        />

        <div className="domain-calc-layout">
          <section className="ui-card" aria-labelledby="car-inputs-heading">
            <div className="ui-card__header">
              <div>
                <h2 id="car-inputs-heading" className="ui-card__title">Vehicle &amp; Commute</h2>
                <p className="ui-card__subtitle">Official list price and your typical office commute.</p>
              </div>
            </div>
            <div className="domain-calc-fields">
              <NumberField
                id="car-blp"
                label="Gross List Price (Bruttolistenpreis)"
                unit="€"
                min={5000}
                max={500000}
                step={500}
                value={s.grossListPriceEur}
                presets={LIST_PRICE_PRESETS}
                onChange={(num) => updateCompanyCarField("grossListPriceEur", toEuroAmount(num))}
              />

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Powertrain</span>
                </div>
                <SegmentedControl
                  label="Vehicle powertrain"
                  value={s.powertrain}
                  options={POWERTRAIN_OPTIONS}
                  fullWidth
                  onChange={(value) => updateCompanyCarField("powertrain", value)}
                />
              </div>

              <div className="domain-calc-field-row">
                <NumberField
                  id="car-commute-km"
                  label="One-Way Commute"
                  unit="km"
                  min={0}
                  max={500}
                  step={1}
                  value={s.commuteOneWayKm}
                  onChange={(num) => updateCompanyCarField("commuteOneWayKm", num)}
                />

                <NumberField
                  id="car-office-days"
                  label="Office Days / Month"
                  unit="days"
                  min={0}
                  max={31}
                  step={1}
                  value={s.commuteOfficeDaysPerMonth}
                  onChange={(num) => updateCompanyCarField("commuteOfficeDaysPerMonth", Math.min(31, Math.round(num)))}
                />
              </div>

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Commute Valuation</span>
                </div>
                <SegmentedControl
                  label="Commute tax method"
                  value={s.commuteValuationMethod}
                  options={COMMUTE_OPTIONS}
                  fullWidth
                  onChange={(value) => updateCompanyCarField("commuteValuationMethod", value)}
                />
              </div>

              <NumberField
                id="car-tax-rate"
                label="Your Marginal Tax + Social Rate"
                unit="%"
                min={0}
                max={60}
                step={1}
                value={Math.round(s.combinedMarginalTaxAndSocialRate * 100)}
                slider={{ min: 15,
                  max: 55,
                  step: 1 }}
                onChange={(num) => updateCompanyCarField("combinedMarginalTaxAndSocialRate", toPercentageRate(num / 100))}
              />
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
              <MetricCard
                label="Monthly Taxable Benefit"
                value={formatEur(evalResult.totalMonthlyImputedBenefit)}
                subtitle={`${formatEur(evalResult.totalAnnualImputedBenefit)} / year taxable gross`}
                tone={MetricTone.Primary}
              />
              <MetricCard
                label="Est. Monthly Net Cost"
                value={`-${formatEur(evalResult.estimatedMonthlyNetCost)}`}
                subtitle={`-${formatEur(evalResult.estimatedAnnualNetCost)} / year net impact`}
                tone={MetricTone.Loss}
              />
              <MetricCard
                label="Annual Savings vs Fuel Car"
                value={`+${formatEur(evalResult.annualTaxSavingsVsIce)}`}
                subtitle={`Equivalent fuel car cost: ${formatEur(evalResult.equivalentIceAnnualNetCost)}/yr`}
                tone={MetricTone.Gain}
              />
            </div>

            <section className="ui-card" aria-labelledby="car-breakdown-heading">
              <div className="ui-card__header">
                <h2 id="car-breakdown-heading" className="ui-card__title">Monthly Tax &amp; Commute Breakdown</h2>
              </div>
              <table className="domain-calc-table">
                <thead>
                  <tr>
                    <th>Component</th>
                    <th className="num">Monthly Taxable Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Rounded list price (nearest €100 down)</td>
                    <td className="num">{formatEur(evalResult.roundedListPrice)}</td>
                  </tr>
                  <tr>
                    <td>Private use (1% × {Math.round(evalResult.effectiveBasisMultiplier * 100)}% basis)</td>
                    <td className="num">{formatEur(evalResult.monthlyPrivateUseBenefit)}</td>
                  </tr>
                  <tr>
                    <td>Commute — selected method ({s.commuteOneWayKm} km)</td>
                    <td className="num">{formatEur(evalResult.monthlyCommuteBenefit)}</td>
                  </tr>
                  <tr>
                    <td>Commute comparison: flat 0.03%</td>
                    <td className="num">{formatEur(evalResult.monthlyCommuteFlat003Alternative)}</td>
                  </tr>
                  <tr>
                    <td>Commute comparison: 0.002% × {s.commuteOfficeDaysPerMonth} trips</td>
                    <td className="num">{formatEur(evalResult.monthlyCommutePerTripAlternative)}</td>
                  </tr>
                  <tr className="is-total">
                    <th>Total Monthly Taxable Benefit</th>
                    <td className="num">{formatEur(evalResult.totalMonthlyImputedBenefit)}</td>
                  </tr>
                </tbody>
              </table>

              <div className="domain-calc-law-bar">
                <span>Legal basis:</span>
                <LawRefLink lawId={LawId.EStG_6_1_4} label="EStG § 6 Abs. 1 Nr. 4" />
                <LawRefLink lawId={LawId.EStG_8_2} label="EStG § 8 Abs. 2" />
              </div>
            </section>

            <ParameterObserverSection projectionProfile={FormProjectionProfileId.CompanyCarFocus} />
          </div>
        </div>

        <footer className="domain-calc-footer">
          <span>EV list price cap adjusts automatically between 2024 (€70,000) and 2025/2026 (€100,000).</span>
          <SourceRevision />
        </footer>
      </main>
    </>
  );
}
