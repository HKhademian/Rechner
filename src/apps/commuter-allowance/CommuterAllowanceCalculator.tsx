import "#/components/DomainCalculator.css";
import {
  type JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
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
import {
  EligibilityConfirmedIcon,
  InformationalNoticeIcon,
} from "#components/Icons";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  AppShell,
} from "#components/ui/AppShell";
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
  { value: CommuteTransportMode.PublicTransitOrBike,
    label: "Public Transit / Bike" },
  { value: CommuteTransportMode.MotorVehicle,
    label: "Car / Motor Vehicle" },
] as const;

const DISTANCE_PRESETS = [
  { value: 10,
    label: "10 km" },
  { value: 25,
    label: "25 km" },
  { value: 45,
    label: "45 km" },
] as const;

const TICKET_PRESETS = [
  { value: 49,
    label: "€49" },
  { value: 58,
    label: "€58" },
  { value: 63,
    label: "€63" },
] as const;

export default function CommuterAllowanceCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const s = hydrated ? commuterAllowanceState.value : DEFAULT_COMMUTER_ALLOWANCE_STATE;
  const evalResult = hydrated
    ? commuterAllowanceEvaluation.value
    : DEFAULT_COMMUTER_ALLOWANCE_EVALUATION;
  const rules = evalResult.rulesSnapshot;
  const isJobTicketWinning = evalResult.jobTicketNetAnnualAdvantageEur > 0;

  return (
    <AppShell
      currentPath={calculatorPath(AppId.CommuterAllowance)}
      footerNote="Demo tool: § 3 Nr. 15 JobTicket subsidies must be paid on top of contractual salary (zusätzlich zum ohnehin geschuldeten Arbeitslohn)."
    >
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

      <div className="domain-calc-layout">
        <section className="ui-card" aria-labelledby="commuter-inputs-heading">
          <div className="ui-card__header">
            <div>
              <h2 id="commuter-inputs-heading" className="ui-card__title">Commute &amp; JobTicket Setup</h2>
              <p className="ui-card__subtitle">Distance, annual office vs. home-office days, and ticket subsidy.</p>
            </div>
          </div>
          <div className="domain-calc-fields">
            <NumberField
              id="commuter-distance"
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
                value={s.transportMode}
                options={TRANSPORT_MODE_OPTIONS}
                fullWidth
                onChange={(value) =>
                  updateCommuterAllowanceField("transportMode", toCommuteTransportMode(String(value)))}
              />
            </div>

            <div className="domain-calc-field-row">
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
                label="Homeoffice Days / Year"
                unit="days"
                min={0}
                max={366}
                step={5}
                value={s.homeOfficeDaysPerYear}
                onChange={(num) => updateCommuterAllowanceField("homeOfficeDaysPerYear", Math.round(num))}
              />
            </div>

            <div className="domain-calc-field-row">
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
                label="Employer JobTicket (§ 3 Nr. 15)"
                unit="€/mo"
                min={0}
                max={500}
                step={1}
                value={s.monthlyEmployerJobTicketSubsidyEur}
                onChange={(num) =>
                  updateCommuterAllowanceField("monthlyEmployerJobTicketSubsidyEur", toEuroAmount(num))}
              />
            </div>

            <div className="domain-calc-field-row">
              <NumberField
                id="commuter-other-expenses"
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
                label="Annual Taxable Income (zvE)"
                unit="€"
                min={0}
                max={1000000}
                step={2000}
                value={s.taxableIncomeZvEEur}
                onChange={(num) => updateCommuterAllowanceField("taxableIncomeZvEEur", toEuroAmount(num))}
              />
            </div>

            <ToggleSwitch
              id="commuter-joint"
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
          </div>
        </section>

        <div className="domain-calc-results">
          <div
            className={`domain-calc-banner domain-calc-banner--${isJobTicketWinning || evalResult.selfPaidScenario.excessAboveWorkAllowanceEur > 0 ? "gain" : "warn"}`}
            role="status"
          >
            <div>
              <strong>
                {isJobTicketWinning || evalResult.selfPaidScenario.excessAboveWorkAllowanceEur > 0
                  ? <EligibilityConfirmedIcon size={18} />
                  : <InformationalNoticeIcon size={18} />}
                <span>
                  {isJobTicketWinning
                    ? `Employer § 3 Nr. 15 JobTicket yields +${formatEur(evalResult.jobTicketNetAnnualAdvantageEur)}/yr net advantage`
                    : evalResult.selfPaidScenario.excessAboveWorkAllowanceEur > 0
                      ? `Self-paid work expenses exceed the ${formatEur(rules.workExpenseAllowanceEur)} lump sum by ${formatEur(evalResult.selfPaidScenario.excessAboveWorkAllowanceEur)}/yr`
                      : `Total work expenses stay within the automatic ${formatEur(rules.workExpenseAllowanceEur)} Arbeitnehmer-Pauschbetrag`}
                </span>
              </strong>
              <p>
                {rules.calendarYear} distance rates: €{rules.first20KmRateEur.toFixed(2)}/km (1–20 km) &amp; €
                {rules.from21KmRateEur.toFixed(2)}/km (21+ km).
                {evalResult.annualEmployerSubsidyEur > 0
                  ? ` Tax-free subsidy offsets ${formatEur(evalResult.effectiveCommuteOffsetByJobTicketEur)}/yr of commuter deduction.`
                  : ""}
              </p>
            </div>
            <LawRefLink lawId={LawId.EStG_9_1_4} label="Read § 9 Abs. 1 Nr. 4" />
          </div>

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

          <section className="ui-card" aria-labelledby="commuter-breakdown-heading">
            <div className="ui-card__header">
              <h2 id="commuter-breakdown-heading" className="ui-card__title">Annual Side-by-Side Comparison ({rules.calendarYear})</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Annual Deduction &amp; Cash Item</th>
                  <th className="num">No JobTicket</th>
                  <th className="num">§ 3 Nr. 15 JobTicket</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Deductible commuter allowance</td>
                  <td className="num">{formatEur(evalResult.selfPaidScenario.commuteAllowanceEur)}</td>
                  <td className="num">{formatEur(evalResult.jobTicketScenario.commuteAllowanceEur)}</td>
                </tr>
                <tr>
                  <td>Homeoffice-Pauschale (€{rules.homeOfficeDailyEur}/day, max €{rules.homeOfficeAnnualMaxEur})</td>
                  <td className="num">{formatEur(evalResult.selfPaidScenario.homeOfficeDeductionEur)}</td>
                  <td className="num">{formatEur(evalResult.jobTicketScenario.homeOfficeDeductionEur)}</td>
                </tr>
                <tr>
                  <td>Other itemized Werbungskosten</td>
                  <td className="num">{formatEur(s.otherAnnualWorkExpensesEur)}</td>
                  <td className="num">{formatEur(s.otherAnnualWorkExpensesEur)}</td>
                </tr>
                <tr>
                  <td>Excess above {formatEur(rules.workExpenseAllowanceEur)} Pauschbetrag</td>
                  <td className="num">{formatEur(evalResult.selfPaidScenario.excessAboveWorkAllowanceEur)}</td>
                  <td className="num">{formatEur(evalResult.jobTicketScenario.excessAboveWorkAllowanceEur)}</td>
                </tr>
                <tr>
                  <td>Extra annual tax + SolZ + church refund</td>
                  <td className="num">+{formatEur(evalResult.selfPaidScenario.annualTaxSavingsEur)}</td>
                  <td className="num">+{formatEur(evalResult.jobTicketScenario.annualTaxSavingsEur)}</td>
                </tr>
                <tr>
                  <td>Employee transit ticket co-pay / cost</td>
                  <td className="num">-{formatEur(evalResult.selfPaidScenario.annualEmployeeTicketCostEur)}</td>
                  <td className="num">-{formatEur(evalResult.jobTicketScenario.annualEmployeeTicketCostEur)}</td>
                </tr>
                <tr className="is-total">
                  <th>Net Annual Tax &amp; Ticket Position</th>
                  <td className="num">{formatEur(evalResult.selfPaidScenario.netAnnualBenefitAfterTicketEur)}</td>
                  <td className="num">{formatEur(evalResult.jobTicketScenario.netAnnualBenefitAfterTicketEur)}</td>
                </tr>
              </tbody>
            </table>

            <div className="domain-calc-law-bar">
              <span>Legal basis:</span>
              <LawRefLink lawId={LawId.EStG_9_1_4} label="EStG § 9 Abs. 1 Nr. 4" />
              <LawRefLink lawId={LawId.EStG_3_15} label="EStG § 3 Nr. 15" />
              <LawRefLink lawId={LawId.EStG_9a} label="EStG § 9a" />
              <LawRefLink lawId={LawId.EStG_32a} label="EStG § 32a" />
            </div>
          </section>

          <ParameterObserverSection projectionProfile={FormProjectionProfileId.CommuterAllowanceFocus} />
        </div>
      </div>
    </AppShell>
  );
}
