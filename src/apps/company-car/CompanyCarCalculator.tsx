import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";


import {
  companyCarEvaluation,
  companyCarState,
  resetCompanyCarCalculator,
  syncCompanyCarFromLifeProfile,
  updateCompanyCarField,
} from "#/apps/company-car/companyCarStore.ts";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";


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
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
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
  {
    value: VehiclePowertrain.PureElectricEv,
    label: "Electric",
  },
  {
    value: VehiclePowertrain.PlugInHybrid,
    label: "Hybrid",
  },
  {
    value: VehiclePowertrain.CombustionIce,
    label: "Petrol / Diesel",
  },
] as const;

const COMMUTE_OPTIONS = [
  {
    value: CommuteValuationMethod.MonthlyFlat003,
    label: "Flat 0.03% / km",
  },
  {
    value: CommuteValuationMethod.PerTrip0002,
    label: "Per trip 0.002%",
  },
] as const;

const LIST_PRICE_PRESETS = [
  {
    value: 45000,
    label: "€45k",
  },
  {
    value: 65000,
    label: "€65k",
  },
  {
    value: 85000,
    label: "€85k",
  },
] as const;

interface CarBreakdownRow {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly total?: boolean;
}

const CAR_BREAKDOWN_COLUMNS: readonly DataTableColumn<CarBreakdownRow>[] = [
  {
    key: "component",
    header: "Component",
    render: (row) => row.label,
  },
  {
    key: "value",
    header: "Monthly Taxable Value",
    align: DataColumnAlign.Right,
    render: (row) => row.value,
  },
];

export default function CompanyCarCalculator(): JSX.Element {
  const s = companyCarState.value;
  const evalResult = companyCarEvaluation.value.value;
  const evCapExceeded = s.powertrain === VehiclePowertrain.PureElectricEv && evalResult.exceedsEvQuarterRateCap;

  const breakdownRows: readonly CarBreakdownRow[] = [
    {
      id: "rounded",
      label: "Rounded list price (nearest €100 down)",
      value: formatEur(evalResult.roundedListPrice),
    },
    {
      id: "private",
      label: `Private use (1% × ${Math.round(evalResult.effectiveBasisMultiplier * 100)}% basis)`,
      value: formatEur(evalResult.monthlyPrivateUseBenefit),
    },
    {
      id: "commute-selected",
      label: `Commute — selected method (${s.commuteOneWayKm} km)`,
      value: formatEur(evalResult.monthlyCommuteBenefit),
    },
    {
      id: "commute-flat",
      label: "Commute comparison: flat 0.03%",
      value: formatEur(evalResult.monthlyCommuteFlat003Alternative),
    },
    {
      id: "commute-trip",
      label: `Commute comparison: 0.002% × ${s.commuteOfficeDaysPerMonth} trips`,
      value: formatEur(evalResult.monthlyCommutePerTripAlternative),
    },
    {
      id: "total",
      label: "Total Monthly Taxable Benefit",
      value: formatEur(evalResult.totalMonthlyImputedBenefit),
      total: true,
    },
  ];

  return (
    <>
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

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="car-inputs-heading">
            <CardHeader
              headingId="car-inputs-heading"
              title="Vehicle & Commute"
              subtitle="Official list price and your typical office commute."
            />
            <FieldGroup>
              <NumberField
                id="car-blp"
                topicId="car-list-price"
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
                  topicId="company-car"
                  value={s.powertrain}
                  options={POWERTRAIN_OPTIONS}
                  fullWidth
                  onChange={(value) => updateCompanyCarField("powertrain", value)}
                />
              </div>

              <FieldRow>
                <NumberField
                  id="car-commute-km"
                  topicId="car-commute"
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
                  topicId="car-commute"
                  label="Office Days / Month"
                  unit="days"
                  min={0}
                  max={31}
                  step={1}
                  value={s.commuteOfficeDaysPerMonth}
                  onChange={(num) => updateCompanyCarField("commuteOfficeDaysPerMonth", Math.min(31, Math.round(num)))}
                />
              </FieldRow>

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Commute Valuation</span>
                </div>
                <SegmentedControl
                  label="Commute tax method"
                  topicId="car-commute"
                  value={s.commuteValuationMethod}
                  options={COMMUTE_OPTIONS}
                  fullWidth
                  onChange={(value) => updateCompanyCarField("commuteValuationMethod", value)}
                />
              </div>

              <NumberField
                id="car-tax-rate"
                topicId="company-car"
                label="Your Marginal Tax + Social Rate"
                unit="%"
                min={0}
                max={60}
                step={1}
                value={Math.round(s.combinedMarginalTaxAndSocialRate * 100)}
                slider={{
                  min: 15,
                  max: 55,
                  step: 1,
                }}
                onChange={(num) => updateCompanyCarField("combinedMarginalTaxAndSocialRate", toPercentageRate(num / 100))}
              />
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={evCapExceeded ? BannerTone.Warning : BannerTone.Success}
              title={
                evCapExceeded
                  ? "List price exceeds EV cap — taxed at 0.50% instead of 0.25%"
                  : `Taxable basis: ${Math.round(evalResult.effectiveBasisMultiplier * 100)}% of list price (${formatEur(evalResult.effectiveAssessmentBasis)})`
              }
              actions={<LawRefLink lawId={LawId.EStG_6_1_4} label="§ 6 Abs. 1 Nr. 4" />}
            >
              {evalResult.perTripCommuteSavesMoney
                ? `With ${s.commuteOfficeDaysPerMonth} office days/mo (< 15), per-trip tracking saves ${formatEur(evalResult.monthlyCommuteFlat003Alternative - evalResult.monthlyCommutePerTripAlternative)}/mo taxable benefit.`
                : "The monthly flat commute rate is equal or lower at this office attendance."}
            </StatusBanner>

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

            <Card ariaLabelledBy="car-breakdown-heading">
              <CardHeader
                headingId="car-breakdown-heading"
                title="Monthly Tax & Commute Breakdown"
              />
              <DataTable
                columns={CAR_BREAKDOWN_COLUMNS}
                rows={breakdownRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <LawReferenceBar>
                <LawRefLink lawId={LawId.EStG_6_1_4} label="EStG § 6 Abs. 1 Nr. 4" />
                <LawRefLink lawId={LawId.EStG_8_2} label="EStG § 8 Abs. 2" />
              </LawReferenceBar>
            </Card>

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.CompanyCarFocus} />
          </>
        )}
      />
    </>
  );
}
