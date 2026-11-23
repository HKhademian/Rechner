import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";


import {
  resetSolarEnergyCalculator,
  solarEnergyEvaluation,
  solarEnergyState,
  syncSolarEnergyFromLifeProfile,
  updateSolarEnergyField,
} from "#/apps/solar-energy/solarEnergyStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";


import {
  CalculatorWorkspace,
  FieldGroup,
  FieldRow,
  LawReferenceBar,
} from "#components/ui/CalculatorWorkspace";
import {
  Card,
  CardHeader,
} from "#components/ui/Card";
import {
  type DataTableColumn,
  DataColumnAlign,
  DataTable,
} from "#components/ui/DataTable";
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
  BannerTone,
  StatusBanner,
} from "#components/ui/StatusBanner";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
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
  {
    value: SolarFeedInMode.PartialSelfConsumption,
    label: "Self-use + export",
  },
  {
    value: SolarFeedInMode.FullFeedIn,
    label: "Full grid export",
  },
] as const;

interface SolarRow {
  readonly id: string;
  readonly label: string;
  readonly figure: string;
  readonly total?: boolean;
}

const SOLAR_COLUMNS: readonly DataTableColumn<SolarRow>[] = [
  {
    key: "label",
    header: "Yield & Cash-Flow Item",
    render: (row) => row.label,
  },
  {
    key: "figure",
    header: "Annual Figure",
    align: DataColumnAlign.Right,
    render: (row) => row.figure,
  },
];

export default function SolarEnergyCalculator(): JSX.Element {
  const s = solarEnergyState.value;
  const evalResult = solarEnergyEvaluation.value.value;

  const breakdownRows: readonly SolarRow[] = [
    {
      id: "generated",
      label: "Solar electricity generated",
      figure: `${Math.round(evalResult.annualGenerationKwh).toLocaleString("de-DE")} kWh`,
    },
    {
      id: "self-consumed",
      label: `Self-consumed electricity (${Math.round(s.selfConsumptionShareRate * 100)}% capped at demand)`,
      figure: `${Math.round(evalResult.selfConsumedKwh).toLocaleString("de-DE")} kWh`,
    },
    {
      id: "fed-in",
      label: "Grid-fed surplus electricity",
      figure: `${Math.round(evalResult.fedInKwh).toLocaleString("de-DE")} kWh`,
    },
    {
      id: "savings",
      label: "Avoided grid purchase savings",
      figure: `+${formatEur(evalResult.annualSelfConsumptionSavings)}`,
    },
    {
      id: "feed-in-rev",
      label: "§ 48 EEG feed-in revenue",
      figure: `+${formatEur(evalResult.annualFeedInRevenue)}`,
    },
    {
      id: "maintenance",
      label: "Annual maintenance cost",
      figure: `-${formatEur(s.annualMaintenanceEur)}`,
    },
    {
      id: "net-benefit",
      label: "Annual Net Cash Benefit",
      figure: `+${formatEur(evalResult.annualNetCashBenefit)}`,
      total: true,
    },
  ];

  return (
    <>
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

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="solar-inputs-heading">
            <CardHeader
              headingId="solar-inputs-heading"
              title="System &amp; Consumption"
              subtitle="Panel size, upfront cost, and how much power you use at home."
            />
            <FieldGroup>
              <FieldRow>
                <NumberField
                  id="solar-kwp"
                  topicId="solar-yield"
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
                  topicId="solar-yield"
                  label="Specific Yield"
                  unit="kWh/kWp"
                  min={400}
                  max={1400}
                  step={25}
                  value={s.specificYieldKwhPerKwp}
                  onChange={(num) => updateSolarEnergyField("specificYieldKwhPerKwp", num)}
                />
              </FieldRow>

              <FieldRow>
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
              </FieldRow>

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Feed-in Setup</span>
                </div>
                <SegmentedControl
                  label="Solar feed-in setup"
                  topicId="solar"
                  value={s.feedInMode}
                  options={FEED_IN_MODE_OPTIONS}
                  fullWidth
                  onChange={(value) => updateSolarEnergyField("feedInMode", value)}
                />
              </div>

              <FieldRow>
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
                  topicId="solar-self-consumption"
                  label="Self-Consumption Share"
                  unit="%"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(s.selfConsumptionShareRate * 100)}
                  onChange={(num) => updateSolarEnergyField("selfConsumptionShareRate", toPercentageRate(num / 100))}
                />
              </FieldRow>

              <ToggleSwitch
                id="solar-vat-zero"
                topicId="solar-vat"
                label="0% VAT zero-rating (§ 12 Abs. 3 UStG)"
                hint="Applies to qualifying residential rooftop installations"
                checked={s.vatExemptEligible}
                onChange={(checked) => updateSolarEnergyField("vatExemptEligible", checked)}
              />
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={evalResult.isIncomeTaxExempt ? BannerTone.Success : BannerTone.Warning}
              title={
                evalResult.isIncomeTaxExempt
                  ? "Income-tax exempt (system ≤ 30 kWp on qualifying building)"
                  : "Above 30 kWp threshold — feed-in income may be subject to income tax"
              }
              actions={<LawRefLink lawId={LawId.EStG_3_72} label="Read § 3 Nr. 72 EStG" />}
            >
              {evalResult.isZeroVatEligible
                ? `0% VAT saves ${formatEur(evalResult.vatSavedAt19Percent)} upfront vs standard 19% VAT.`
                : "Standard 19% VAT regime selected."}
            </StatusBanner>

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

            <Card ariaLabelledBy="solar-breakdown-heading">
              <CardHeader
                headingId="solar-breakdown-heading"
                title="Annual Energy &amp; Cash-Flow Breakdown"
              />
              <DataTable
                columns={SOLAR_COLUMNS}
                rows={breakdownRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <LawReferenceBar>
                <LawRefLink lawId={LawId.EEG_48} label="EEG § 48" />
                <LawRefLink lawId={LawId.UStG_12_3} label="UStG § 12 Abs. 3" />
                <LawRefLink lawId={LawId.EStG_3_72} label="EStG § 3 Nr. 72" />
              </LawReferenceBar>
            </Card>

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.SolarEnergyFocus} />
          </>
        )}
      />
    </>
  );
}
