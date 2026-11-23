import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";


import {
  DEFAULT_COMMUTER_ALLOWANCE_EVALUATION,
  DEFAULT_COMMUTER_ALLOWANCE_STATE,
  commuterAllowanceEvaluation,
  commuterAllowanceState,
  resetCommuterAllowanceCalculator,
  syncCommuterAllowanceFromLifeProfile,
  updateCommuterAllowanceField,
} from "#/apps/commuter-allowance/commuterAllowanceStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
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
  Disclosure,
} from "#components/ui/Disclosure";
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
  CommuteTransportMode,
  toCommuteTransportMode,
} from "#engine/formulas/pure/commuterAllowanceEvaluator";
import {
  LawId,
} from "#engine/laws/types";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  toEuroAmount,
} from "#engine/types";
import {
  formatEur as formatSharedEur,
} from "#utils/currencyFormat";

function formatEur(value: number): string {
  return formatSharedEur(value);
}

const TRANSPORT_MODE_OPTIONS = [
  {
    value: CommuteTransportMode.PublicTransitOrBike,
    label: "Public Transit / Bike",
  },
  {
    value: CommuteTransportMode.MotorVehicle,
    label: "Car / Motor Vehicle",
  },
] as const;

const DISTANCE_PRESETS = [
  {
    value: 10,
    label: "10 km",
  },
  {
    value: 25,
    label: "25 km",
  },
  {
    value: 45,
    label: "45 km",
  },
] as const;

const TICKET_PRESETS = [
  {
    value: 49,
    label: "€49",
  },
  {
    value: 58,
    label: "€58",
  },
  {
    value: 63,
    label: "€63",
  },
] as const;

interface CommuterRow {
  readonly id: string;
  readonly label: string;
  readonly noJobTicket: string;
  readonly withJobTicket: string;
  readonly total?: boolean;
}

const COMMUTER_COLUMNS: readonly DataTableColumn<CommuterRow>[] = [
  {
    key: "label",
    header: "Annual Deduction & Cash Item",
    render: (row) => row.label,
  },
  {
    key: "noJobTicket",
    header: "No JobTicket",
    align: DataColumnAlign.Right,
    render: (row) => row.noJobTicket,
  },
  {
    key: "withJobTicket",
    header: "§ 3 Nr. 15 JobTicket",
    align: DataColumnAlign.Right,
    render: (row) => row.withJobTicket,
  },
];

export default function CommuterAllowanceCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const s = hydrated ? commuterAllowanceState.value : DEFAULT_COMMUTER_ALLOWANCE_STATE;
  const evalResult = hydrated
    ? commuterAllowanceEvaluation.value
    : DEFAULT_COMMUTER_ALLOWANCE_EVALUATION;
  const rules = evalResult.rulesSnapshot;
  const isJobTicketWinning = evalResult.jobTicketNetAnnualAdvantageEur > 0;
  const isPositiveBanner = isJobTicketWinning || evalResult.selfPaidScenario.excessAboveWorkAllowanceEur > 0;

  const comparisonRows: readonly CommuterRow[] = [
    {
      id: "commute",
      label: "Deductible commuter allowance",
      noJobTicket: formatEur(evalResult.selfPaidScenario.commuteAllowanceEur),
      withJobTicket: formatEur(evalResult.jobTicketScenario.commuteAllowanceEur),
    },
    {
      id: "homeoffice",
      label: `Homeoffice-Pauschale (€${rules.homeOfficeDailyEur}/day, max €${rules.homeOfficeAnnualMaxEur})`,
      noJobTicket: formatEur(evalResult.selfPaidScenario.homeOfficeDeductionEur),
      withJobTicket: formatEur(evalResult.jobTicketScenario.homeOfficeDeductionEur),
    },
    {
      id: "other",
      label: "Other itemized Werbungskosten",
      noJobTicket: formatEur(s.otherAnnualWorkExpensesEur),
      withJobTicket: formatEur(s.otherAnnualWorkExpensesEur),
    },
    {
      id: "excess",
      label: `Excess above ${formatEur(rules.workExpenseAllowanceEur)} Pauschbetrag`,
      noJobTicket: formatEur(evalResult.selfPaidScenario.excessAboveWorkAllowanceEur),
      withJobTicket: formatEur(evalResult.jobTicketScenario.excessAboveWorkAllowanceEur),
    },
    {
      id: "refund",
      label: "Extra annual tax + SolZ + church refund",
      noJobTicket: `+${formatEur(evalResult.selfPaidScenario.annualTaxSavingsEur)}`,
      withJobTicket: `+${formatEur(evalResult.jobTicketScenario.annualTaxSavingsEur)}`,
    },
    {
      id: "ticket-cost",
      label: "Employee transit ticket co-pay / cost",
      noJobTicket: `-${formatEur(evalResult.selfPaidScenario.annualEmployeeTicketCostEur)}`,
      withJobTicket: `-${formatEur(evalResult.jobTicketScenario.annualEmployeeTicketCostEur)}`,
    },
    {
      id: "net",
      label: "Net Annual Tax & Ticket Position",
      noJobTicket: formatEur(evalResult.selfPaidScenario.netAnnualBenefitAfterTicketEur),
      withJobTicket: formatEur(evalResult.jobTicketScenario.netAnnualBenefitAfterTicketEur),
      total: true,
    },
  ];

  return (
    <>
      <PageHeader
        eyebrow="Work Expenses"
        title="Commuter &amp; JobTicket Calculator"
        subtitle="Compare distance allowance (§ 9 EStG Pendlerpauschale), Homeoffice-Pauschale, and tax-free employer Deutschlandticket subsidies."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncCommuterAllowanceFromLifeProfile}
            onResetDefaults={resetCommuterAllowanceCalculator}
            syncTooltip="Load planning year, commute distance, office days, and household zvE from your Life Profile"
          />
        )}
      />

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="commuter-inputs-heading">
            <CardHeader
              headingId="commuter-inputs-heading"
              title="Commute &amp; JobTicket Setup"
              subtitle="Distance, annual office vs. home-office days, and ticket subsidy."
            />
            <FieldGroup>
              <NumberField
                id="commuter-distance"
                topicId="commuting"
                label="One-Way Commute Distance"
                unit="km"
                min={0}
                max={500}
                step={1}
                value={s.oneWayCommuteKm}
                presets={DISTANCE_PRESETS}
                onChange={(num) => updateCommuterAllowanceField("oneWayCommuteKm", Math.round(num))}
              />

              <div className="ui-field">
                <div className="ui-field__top">
                  <span className="ui-field__label">Primary Mode</span>
                </div>
                <SegmentedControl
                  label="Commute transport mode"
                  topicId="commuting"
                  value={s.transportMode}
                  options={TRANSPORT_MODE_OPTIONS}
                  fullWidth
                  onChange={(value) =>
                    updateCommuterAllowanceField("transportMode", toCommuteTransportMode(String(value)))}
                />
              </div>

              <FieldRow>
                <NumberField
                  id="commuter-office-days"
                  label="Office Days / Year"
                  unit="days"
                  min={0}
                  max={366}
                  step={5}
                  value={s.officeDaysPerYear}
                  onChange={(num) => updateCommuterAllowanceField("officeDaysPerYear", Math.round(num))}
                />

                <NumberField
                  id="commuter-homeoffice-days"
                  topicId="commuting"
                  label="Homeoffice Days / Year"
                  unit="days"
                  min={0}
                  max={366}
                  step={5}
                  value={s.homeOfficeDaysPerYear}
                  onChange={(num) => updateCommuterAllowanceField("homeOfficeDaysPerYear", Math.round(num))}
                />
              </FieldRow>

              <FieldRow>
                <NumberField
                  id="commuter-ticket-price"
                  label="Transit Ticket Fare"
                  unit="€/mo"
                  min={0}
                  max={500}
                  step={1}
                  value={s.monthlyTransitTicketCostEur}
                  presets={TICKET_PRESETS}
                  onChange={(num) => updateCommuterAllowanceField("monthlyTransitTicketCostEur", toEuroAmount(num))}
                />

                <NumberField
                  id="commuter-jobticket-subsidy"
                  topicId="commuting"
                  label="Employer JobTicket (§ 3 Nr. 15)"
                  unit="€/mo"
                  min={0}
                  max={500}
                  step={1}
                  value={s.monthlyEmployerJobTicketSubsidyEur}
                  onChange={(num) =>
                    updateCommuterAllowanceField("monthlyEmployerJobTicketSubsidyEur", toEuroAmount(num))}
                />
              </FieldRow>

              <Disclosure
                title="Tax Assessment &amp; Other Work Expenses"
                meta={s.isMarriedJointAssessment ? "Joint" : "Individual"}
                subtle
              >
                <FieldGroup>
                  <FieldRow>
                    <NumberField
                      id="commuter-other-expenses"
                      topicId="commuting"
                      label="Other Work Expenses"
                      unit="€/yr"
                      min={0}
                      max={50000}
                      step={50}
                      value={s.otherAnnualWorkExpensesEur}
                      onChange={(num) => updateCommuterAllowanceField("otherAnnualWorkExpensesEur", toEuroAmount(num))}
                    />

                    <NumberField
                      id="commuter-zve"
                      topicId="taxable-income"
                      label="Annual Taxable Income (zvE)"
                      unit="€"
                      min={0}
                      max={1000000}
                      step={2000}
                      value={s.taxableIncomeZvEEur}
                      onChange={(num) => updateCommuterAllowanceField("taxableIncomeZvEEur", toEuroAmount(num))}
                    />
                  </FieldRow>

                  <ToggleSwitch
                    id="commuter-joint"
                    topicId="joint-assessment"
                    label="Joint spousal splitting (§ 26b EStG)"
                    checked={s.isMarriedJointAssessment}
                    onChange={(checked) => updateCommuterAllowanceField("isMarriedJointAssessment", checked)}
                  />

                  <ToggleSwitch
                    id="commuter-church-tax"
                    label="Include church tax refund delta"
                    checked={s.hasChurchTax}
                    onChange={(checked) => updateCommuterAllowanceField("hasChurchTax", checked)}
                  />

                  {s.hasChurchTax && (
                    <ToggleSwitch
                      id="commuter-by-bw"
                      label="Bavaria / Baden-Württemberg (8% rate)"
                      checked={s.isBavariaOrBadenWuerttemberg}
                      onChange={(checked) => updateCommuterAllowanceField("isBavariaOrBadenWuerttemberg", checked)}
                    />
                  )}
                </FieldGroup>
              </Disclosure>
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={isPositiveBanner ? BannerTone.Success : BannerTone.Warning}
              title={
                isJobTicketWinning
                  ? `Employer § 3 Nr. 15 JobTicket yields +${formatEur(evalResult.jobTicketNetAnnualAdvantageEur)}/yr net advantage`
                  : evalResult.selfPaidScenario.excessAboveWorkAllowanceEur > 0
                    ? `Self-paid work expenses exceed the ${formatEur(rules.workExpenseAllowanceEur)} lump sum by ${formatEur(evalResult.selfPaidScenario.excessAboveWorkAllowanceEur)}/yr`
                    : `Total work expenses stay within the automatic ${formatEur(rules.workExpenseAllowanceEur)} Arbeitnehmer-Pauschbetrag`
              }
              actions={<LawRefLink lawId={LawId.EStG_9_1_4} label="Read § 9 Abs. 1 Nr. 4" />}
            >
              {rules.calendarYear} distance rates: €{rules.first20KmRateEur.toFixed(2)}/km (1–20 km) &amp; €
              {rules.from21KmRateEur.toFixed(2)}/km (21+ km).
              {evalResult.annualEmployerSubsidyEur > 0
                ? ` Tax-free subsidy offsets ${formatEur(evalResult.effectiveCommuteOffsetByJobTicketEur)}/yr of commuter deduction.`
                : ""}
            </StatusBanner>

            <div className="domain-calc-kpis">
              <MetricCard
                label="Total Expenses (No Subsidy)"
                value={formatEur(evalResult.selfPaidScenario.totalWorkExpensesEur)}
                subtitle={`${formatEur(evalResult.selfPaidScenario.excessAboveWorkAllowanceEur)} above ${formatEur(rules.workExpenseAllowanceEur)} Pauschbetrag`}
                tone={MetricTone.Primary}
              />
              <MetricCard
                label="Tax Refund (Self-Paid)"
                value={`+${formatEur(evalResult.selfPaidScenario.annualTaxSavingsEur)}`}
                subtitle={`Outflow ${formatEur(evalResult.selfPaidScenario.annualEmployeeTicketCostEur)} · Net ${formatEur(evalResult.selfPaidScenario.netAnnualBenefitAfterTicketEur)}`}
                tone={MetricTone.Gain}
              />
              <MetricCard
                label="JobTicket Net Advantage"
                value={`${evalResult.jobTicketNetAnnualAdvantageEur >= 0 ? "+" : ""}${formatEur(evalResult.jobTicketNetAnnualAdvantageEur)}`}
                subtitle={`${formatEur(evalResult.jobTicketNetMonthlyAdvantageEur)}/mo vs. self-paid baseline`}
                tone={evalResult.jobTicketNetAnnualAdvantageEur >= 0 ? MetricTone.Gain : MetricTone.Loss}
              />
            </div>

            <Card ariaLabelledBy="commuter-breakdown-heading">
              <CardHeader
                headingId="commuter-breakdown-heading"
                title={`Annual Side-by-Side Comparison (${rules.calendarYear})`}
              />
              <DataTable
                columns={COMMUTER_COLUMNS}
                rows={comparisonRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <LawReferenceBar>
                <LawRefLink lawId={LawId.EStG_9_1_4} label="EStG § 9 Abs. 1 Nr. 4" />
                <LawRefLink lawId={LawId.EStG_3_15} label="EStG § 3 Nr. 15" />
                <LawRefLink lawId={LawId.EStG_9a} label="EStG § 9a" />
                <LawRefLink lawId={LawId.EStG_32a} label="EStG § 32a" />
              </LawReferenceBar>
            </Card>

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.CommuterAllowanceFocus} />
          </>
        )}
      />
    </>
  );
}
