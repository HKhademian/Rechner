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
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  SolarFeedInMode,
} from "#engine/formulas/pure/solarEnergyFormulas";
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

const FEED_IN_MODE_OPTIONS = [
  { value: SolarFeedInMode.PartialSelfConsumption,
    label: "Self-use + export" },
  { value: SolarFeedInMode.FullFeedIn,
    label: "Full grid export" },
] as const;

export default function SolarEnergyCalculator(): JSX.Element {
  const s = solarEnergyState.value;
  const evalResult = solarEnergyEvaluation.value.value;

  return (
    <AppShell
      currentPath={calculatorPath(AppId.SolarEnergy)}
      footerNote="Adjust your assumed grid electricity price in Statutory Assumptions below."
    >
      <PageHeader
        eyebrow="Rooftop Solar"
        title="Solar Savings Calculator"
        subtitle="Estimate electricity savings, feed-in income, tax relief, and payback time for rooftop solar."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncSolarEnergyFromLifeProfile}
            onResetDefaults={resetSolarEnergyCalculator}
            syncTooltip="Load planning year, system size, cost, electricity use, and feed-in mode from your Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.plansSolarPv
                ? undefined
                : "Solar system is currently off in your Life Profile"
            }
          />
        )}
      />

      <div className="domain-calc-layout">
        <section className="ui-card" aria-labelledby="solar-inputs-heading">
          <div className="ui-card__header">
            <div>
              <h2 id="solar-inputs-heading" className="ui-card__title">System &amp; Consumption</h2>
              <p className="ui-card__subtitle">Panel size, upfront cost, and how much power you use at home.</p>
            </div>
          </div>
          <div className="domain-calc-fields">
            <div className="domain-calc-field-row">
              <NumberField
                id="solar-kwp"
                label="System Size"
                unit="kWp"
                min={0.4}
                max={100}
                step={0.5}
                value={s.capacityKwp}
                onChange={(num) => updateSolarEnergyField("capacityKwp", num)}
              />

              <NumberField
                id="solar-yield"
                label="Specific Yield"
                unit="kWh/kWp"
                min={400}
                max={1400}
                step={25}
                value={s.specificYieldKwhPerKwp}
                onChange={(num) => updateSolarEnergyField("specificYieldKwhPerKwp", num)}
              />
            </div>

            <div className="domain-calc-field-row">
              <NumberField
                id="solar-cost"
                label="Net System Cost"
                unit="€"
                min={200}
                max={250000}
                step={250}
                value={s.systemCostNetEur}
                onChange={(num) => updateSolarEnergyField("systemCostNetEur", toEuroAmount(num))}
              />

              <NumberField
                id="solar-maint"
                label="Annual Maintenance"
                unit="€"
                min={0}
                max={10000}
                step={25}
                value={s.annualMaintenanceEur}
                onChange={(num) => updateSolarEnergyField("annualMaintenanceEur", toEuroAmount(num))}
              />
            </div>

            <div className="ui-field">
              <div className="ui-field__top">
                <span className="ui-field__label">Feed-in Setup</span>
              </div>
              <SegmentedControl
                label="Solar feed-in setup"
                value={s.feedInMode}
                options={FEED_IN_MODE_OPTIONS}
                fullWidth
                onChange={(value) => updateSolarEnergyField("feedInMode", value)}
              />
            </div>

            <div className="domain-calc-field-row">
              <NumberField
                id="solar-consumption"
                label="Household Demand"
                unit="kWh/yr"
                min={0}
                max={50000}
                step={250}
                value={s.annualHouseholdConsumptionKwh}
                onChange={(num) => updateSolarEnergyField("annualHouseholdConsumptionKwh", num)}
              />

              <NumberField
                id="solar-self-share"
                label="Self-Consumption Share"
                unit="%"
                min={0}
                max={100}
                step={5}
                value={Math.round(s.selfConsumptionShareRate * 100)}
                onChange={(num) => updateSolarEnergyField("selfConsumptionShareRate", toPercentageRate(num / 100))}
              />
            </div>

            <ToggleSwitch
              id="solar-vat-zero"
              label="0% VAT zero-rating (§ 12 Abs. 3 UStG)"
              hint="Applies to qualifying residential rooftop installations"
              checked={s.vatExemptEligible}
              onChange={(checked) => updateSolarEnergyField("vatExemptEligible", checked)}
            />
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
                    ? "Income-tax exempt (system ≤ 30 kWp on qualifying building)"
                    : "Above 30 kWp threshold — feed-in income may be subject to income tax"}
                </span>
              </strong>
              <p>
                {evalResult.isZeroVatEligible
                  ? `0% VAT saves ${formatEur(evalResult.vatSavedAt19Percent)} upfront vs standard 19% VAT.`
                  : "Standard 19% VAT regime selected."}
              </p>
            </div>
            <LawRefLink lawId={LawId.EStG_3_72} label="Read § 3 Nr. 72 EStG" />
          </div>

          <div className="domain-calc-kpis">
            <MetricCard
              label="Annual Net Cash Benefit"
              value={`+${formatEur(evalResult.annualNetCashBenefit)}`}
              subtitle={`Generates ${Math.round(evalResult.annualGenerationKwh).toLocaleString("de-DE")} kWh / year`}
              tone={MetricTone.Gain}
            />
            <MetricCard
              label="Simple Payback Period"
              value={evalResult.simplePaybackYears !== null ? `${evalResult.simplePaybackYears.toFixed(1)} yrs` : "N/A"}
              subtitle={`20-year EEG net gain ${formatEur(evalResult.twentyYearNetGain)}`}
              tone={MetricTone.Primary}
            />
            <MetricCard
              label="Blended Feed-In Tariff"
              value={`${(evalResult.blendedFeedInTariffEurPerKwh * 100).toFixed(2)} ct/kWh`}
              subtitle={`0% VAT savings: ${formatEur(evalResult.vatSavedAt19Percent)}`}
            />
          </div>

          <section className="ui-card" aria-labelledby="solar-breakdown-heading">
            <div className="ui-card__header">
              <h2 id="solar-breakdown-heading" className="ui-card__title">Annual Energy &amp; Cash-Flow Breakdown</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Yield &amp; Cash-Flow Item</th>
                  <th className="num">Annual Figure</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Solar electricity generated</td>
                  <td className="num">{Math.round(evalResult.annualGenerationKwh).toLocaleString("de-DE")} kWh</td>
                </tr>
                <tr>
                  <td>Self-consumed electricity ({Math.round(s.selfConsumptionShareRate * 100)}% capped at demand)</td>
                  <td className="num">{Math.round(evalResult.selfConsumedKwh).toLocaleString("de-DE")} kWh</td>
                </tr>
                <tr>
                  <td>Grid-fed surplus electricity</td>
                  <td className="num">{Math.round(evalResult.fedInKwh).toLocaleString("de-DE")} kWh</td>
                </tr>
                <tr>
                  <td>Avoided grid purchase savings</td>
                  <td className="num">+{formatEur(evalResult.annualSelfConsumptionSavings)}</td>
                </tr>
                <tr>
                  <td>§ 48 EEG feed-in revenue</td>
                  <td className="num">+{formatEur(evalResult.annualFeedInRevenue)}</td>
                </tr>
                <tr>
                  <td>Annual maintenance cost</td>
                  <td className="num">-{formatEur(s.annualMaintenanceEur)}</td>
                </tr>
                <tr className="is-total">
                  <th>Annual Net Cash Benefit</th>
                  <td className="num">+{formatEur(evalResult.annualNetCashBenefit)}</td>
                </tr>
              </tbody>
            </table>

            <div className="domain-calc-law-bar">
              <span>Legal basis:</span>
              <LawRefLink lawId={LawId.EEG_48} label="EEG § 48" />
              <LawRefLink lawId={LawId.UStG_12_3} label="UStG § 12 Abs. 3" />
              <LawRefLink lawId={LawId.EStG_3_72} label="EStG § 3 Nr. 72" />
            </div>
          </section>

          <ParameterObserverSection projectionProfile={FormProjectionProfileId.SolarEnergyFocus} />
        </div>
      </div>
    </AppShell>
  );
}
