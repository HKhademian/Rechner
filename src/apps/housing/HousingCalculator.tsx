import "#/components/DomainCalculator.css";
import "#/apps/mortgage/MortgageCalculator.css";
import {
  useState,
} from "preact/hooks";
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
import {
  Kfw300GuidePanel,
} from "#/apps/mortgage/Kfw300GuidePanel.tsx";
import {
  writeMortgageHandoff,
} from "#/apps/mortgage/mortgageHandoff.ts";
import {
  DEFAULT_KFW_300_PRESET,
  estimateIllustrativeKfw300Monthly,
} from "#/apps/mortgage/mortgageSchedule.ts";
import {
  isPlainPrimaryClick,
} from "#store/lawReferenceStore";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  AppShell,
} from "#components/ui/AppShell";
import {
  ButtonSize,
  ButtonVariant,
  LinkButton,
} from "#components/ui/Button";
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
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
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
  BannerTone,
  StatusBanner,
} from "#components/ui/StatusBanner";
import {
  ToggleSwitch,
} from "#components/ui/ToggleSwitch";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import LawRefLink from "#components/laws/LawRefLink";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import {
  GERMAN_FEDERAL_STATE_LABELS,
  toGermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  getLawEntry,
} from "#engine/laws/registry";
import {
  ExternalSourceId,
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

const FEDERAL_STATE_OPTIONS = Object.entries(GERMAN_FEDERAL_STATE_LABELS).map(([code, label]) => ({
  value: code,
  label,
}));

interface BreakdownRow {
  readonly id: string;
  readonly label: string;
  readonly amount: string;
  readonly total?: boolean;
}

const BREAKDOWN_COLUMNS: readonly DataTableColumn<BreakdownRow>[] = [
  {
    key: "item",
    header: "Cost / Financing Item",
    render: (row) => row.label,
  },
  {
    key: "amount",
    header: "Amount (EUR)",
    align: DataColumnAlign.Right,
    render: (row) => row.amount,
  },
];

export default function HousingCalculator(): JSX.Element {
  const [transferNotice, setTransferNotice] = useState("");
  const s = housingState.value;
  const evalResult = housingEvaluation.value.value;
  const repairLawSource = getLawEntry(LawId.EStG_35a).externalSources[ExternalSourceId.GesetzeImInternet];
  const savingsUsed = Math.min(s.availableEquityEur, evalResult.totalCapitalRequirementEur);
  const kfwPreview = estimateIllustrativeKfw300Monthly(evalResult.kfw300MaxSubsidizedLoanEur);

  const breakdownRows: readonly BreakdownRow[] = [
    {
      id: "price",
      label: "Property purchase price",
      amount: formatEur(s.purchasePriceEur),
    },
    {
      id: "transfer",
      label: `Property transfer tax — Grunderwerbsteuer (${(evalResult.transferTaxRate * 100).toFixed(1)}%)`,
      amount: formatEur(evalResult.transferTaxEur),
    },
    {
      id: "notary",
      label: "Notary & land registry",
      amount: formatEur(evalResult.notaryAndRegistryEur),
    },
    {
      id: "broker",
      label: "Buyer agent commission",
      amount: formatEur(evalResult.buyerBrokerFeeEur),
    },
    {
      id: "capital",
      label: "Total capital required",
      amount: formatEur(evalResult.totalCapitalRequirementEur),
    },
    {
      id: "savings",
      label: "Your savings used toward the purchase",
      amount: `− ${formatEur(savingsUsed)}`,
    },
    {
      id: "kfw",
      label: "Estimated KfW 300 loan used toward the purchase",
      amount: `− ${formatEur(evalResult.kfw300MaxSubsidizedLoanEur)}`,
    },
    {
      id: "loan",
      label: "Bank loan still needed",
      amount: formatEur(evalResult.remainingBankLoanEur),
      total: true,
    },
  ];

  const handleMortgageHandoff = (event: JSX.TargetedMouseEvent<HTMLAnchorElement>): void => {
    if (!isPlainPrimaryClick(event)) {
      return;
    }
    try {
      if (writeMortgageHandoff(window.sessionStorage, {
        principal: evalResult.remainingBankLoanEur,
        kfwPrincipal: evalResult.kfw300MaxSubsidizedLoanEur,
        propertyPrice: s.purchasePriceEur,
        savings: s.availableEquityEur,
        closingCosts: evalResult.totalClosingCostsEur,
        annualInterest: s.marketMortgageAnnualInterestRate,
        initialRepayment: s.initialAnnualRepaymentRate,
      })) {
        return;
      }
    }
    catch {
      // Let the user open the calculator without transferring private inputs.
    }
    event.preventDefault();
    setTransferNotice("Could not transfer the amounts. Open the mortgage calculator and enter them there.");
  };

  return (
    <AppShell
      currentPath={calculatorPath(AppId.Housing)}
      footerNote="Default notary and agent percentages can be adjusted in Rates & Assumptions below."
    >
      <PageHeader
        eyebrow="Home Buying"
        title="Home Purchase Planner"
        subtitle="Estimate buying costs across all 16 federal states, KfW 300 family loans, and renovation tax credits."
        actions={(
          <DomainCalculatorHeaderActions
            onSyncLifeProfile={syncHousingFromLifeProfile}
            onResetDefaults={resetHousingCalculator}
            syncTooltip="Load planning year, federal state, price, equity, children, and household income from your Life Profile"
            inactiveInLifeProfileMessage={
              unifiedLifeProfile.value.plansHomePurchase
                ? undefined
                : "Home purchase is currently off in your Life Profile"
            }
          />
        )}
      />

      <CalculatorWorkspace
        inputs={(
          <Card ariaLabelledBy="housing-inputs-heading">
            <CardHeader
              headingId="housing-inputs-heading"
              title="Property & Financing"
              subtitle="Purchase price, equity, and state transfer tax rate."
            />
            <FieldGroup>
              <ChoiceSelect
                id="housing-state"
                label="Federal State"
                value={s.federalState}
                options={FEDERAL_STATE_OPTIONS}
                onChange={(value) => updateHousingField("federalState", toGermanFederalState(value))}
              />

              <FieldRow>
                <NumberField
                  id="housing-price"
                  label="Purchase Price"
                  unit="€"
                  min={10000}
                  step={10000}
                  value={s.purchasePriceEur}
                  onChange={(num) => updateHousingField("purchasePriceEur", toEuroAmount(num))}
                />
                <NumberField
                  id="housing-equity"
                  label="Your savings"
                  unit="€"
                  min={0}
                  step={5000}
                  value={s.availableEquityEur}
                  onChange={(num) => updateHousingField("availableEquityEur", toEuroAmount(num))}
                />
              </FieldRow>

              <ToggleSwitch
                id="housing-broker"
                label="Include buyer agent commission"
                hint="Typical statutory split when buying through a broker"
                checked={s.includesBrokerCommission}
                onChange={(checked) => updateHousingField("includesBrokerCommission", checked)}
              />

              <Disclosure
                title="KfW 300 & Renovation Relief"
                meta={evalResult.kfw300Eligible ? `Eligible · up to ${formatEur(evalResult.kfw300MaxSubsidizedLoanEur)}` : "Not eligible"}
                defaultOpen
                subtle
              >
                <FieldGroup>
                  <FieldRow>
                    <NumberField
                      id="housing-children"
                      label="Minor Children"
                      min={0}
                      max={15}
                      step={1}
                      value={s.dependentChildrenCount}
                      onChange={(num) => updateHousingField("dependentChildrenCount", Math.round(num))}
                    />
                    <NumberField
                      id="housing-zve"
                      topicId="taxable-income"
                      label="Avg. Household zvE"
                      unit="€"
                      min={0}
                      step={2000}
                      value={s.priorAverageHouseholdZvEEur}
                      onChange={(num) => updateHousingField("priorAverageHouseholdZvEEur", toEuroAmount(num))}
                    />
                  </FieldRow>

                  <ToggleSwitch
                    id="housing-newbuild"
                    topicId="eh40"
                    label="Owner-occupied EH 40 new build"
                    hint="Required for KfW 300 (€170k–€220k base loan cap by children)"
                    checked={s.isOwnerOccupiedNewBuildOrKfw300Standard}
                    onChange={(checked) => updateHousingField("isOwnerOccupiedNewBuildOrKfw300Standard", checked)}
                  />
                  <ToggleSwitch
                    id="housing-qng"
                    topicId="qng"
                    label="QNG sustainability certification"
                    hint="Adds +€50,000 to your maximum KfW 300 loan cap"
                    checked={s.isQngPlusCertified}
                    onChange={(checked) => updateHousingField("isQngPlusCertified", checked)}
                  />

                  <NumberField
                    id="housing-craftsman"
                    topicId="craftsman-credit"
                    label="Annual qualifying repair labor"
                    unit="€"
                    min={0}
                    step={250}
                    value={s.renovationLaborCostEur}
                    onChange={(num) => updateHousingField("renovationLaborCostEur", toEuroAmount(num))}
                  />
                </FieldGroup>
              </Disclosure>

              <Disclosure
                title="Mortgage Rate Estimate"
                meta={`${(s.marketMortgageAnnualInterestRate * 100).toFixed(1)}% / ${(s.initialAnnualRepaymentRate * 100).toFixed(1)}%`}
                subtle
              >
                <FieldRow>
                  <NumberField
                    id="housing-rate"
                    topicId="mortgage-repayment"
                    label="Interest Rate"
                    unit="%"
                    min={0.5}
                    max={15}
                    step={0.1}
                    value={Number((s.marketMortgageAnnualInterestRate * 100).toFixed(2))}
                    onChange={(num) => updateHousingField("marketMortgageAnnualInterestRate", toPercentageRate(num / 100))}
                  />
                  <NumberField
                    id="housing-repay"
                    topicId="mortgage-repayment"
                    label="Initial Repayment"
                    unit="%"
                    min={0.5}
                    max={20}
                    step={0.25}
                    value={Number((s.initialAnnualRepaymentRate * 100).toFixed(2))}
                    onChange={(num) => updateHousingField("initialAnnualRepaymentRate", toPercentageRate(num / 100))}
                  />
                </FieldRow>
              </Disclosure>
            </FieldGroup>
          </Card>
        )}
        results={(
          <>
            <StatusBanner
              tone={evalResult.kfw300Eligible ? BannerTone.Success : BannerTone.Warning}
              title={
                evalResult.kfw300Eligible
                  ? `Potentially eligible for up to ${formatEur(evalResult.kfw300MaxSubsidizedLoanEur)} KfW 300 family loan`
                  : `Not eligible for KfW 300 (${s.dependentChildrenCount === 0 ? "requires 1+ minor children" : !s.isOwnerOccupiedNewBuildOrKfw300Standard ? "requires EH 40 new build" : `household income exceeds ${formatEur(evalResult.kfw300IncomeCeilingEur)} limit`})`
              }
              actions={<LawRefLink lawId={LawId.KfW_300} label="KfW 300" />}
            >
              {evalResult.kfw300IncomeCeilingEur > 0
                ? `KfW 300 household income ceiling for ${s.dependentChildrenCount} child(ren): ${formatEur(evalResult.kfw300IncomeCeilingEur)} (2-year prior average zvE).${evalResult.kfw300Eligible ? ` Illustrative KfW payment (${DEFAULT_KFW_300_PRESET.illustrativeRatePercent.toFixed(2)}%, ${DEFAULT_KFW_300_PRESET.termYears}y / ${DEFAULT_KFW_300_PRESET.graceYears}y grace): ~${formatEur(kfwPreview.initialMonthly)}/mo initially, rising to ~${formatEur(kfwPreview.laterMonthly)}/mo after grace.` : ""}`
                : "KfW 300 family loans require at least 1 minor child in the household."}
            </StatusBanner>

            <div className="domain-calc-kpis">
              <MetricCard
                label="Total Buying Costs"
                value={formatEur(evalResult.totalClosingCostsEur)}
                subtitle={`${(evalResult.totalClosingCostPercent * 100).toFixed(2)}% of purchase price`}
                tone={MetricTone.Loss}
              />
              <MetricCard
                label="Bank loan still needed"
                value={formatEur(evalResult.remainingBankLoanEur)}
                subtitle={
                  evalResult.kfw300MaxSubsidizedLoanEur > 0
                    ? `Bank ~${formatEur(evalResult.estimatedMonthlyBankPaymentEur)}/mo + KfW ~${formatEur(kfwPreview.initialMonthly)}→${formatEur(kfwPreview.laterMonthly)}/mo`
                    : `Est. payment: ${formatEur(evalResult.estimatedMonthlyBankPaymentEur)}/mo`
                }
                footer={(
                  <>
                    <LinkButton
                      href={calculatorPath(AppId.Mortgage)}
                      variant={ButtonVariant.Primary}
                      size={ButtonSize.Sm}
                      onClick={handleMortgageHandoff}
                    >
                      Simulate Bank + KfW payments
                    </LinkButton>
                    {transferNotice && (
                      <p role="status">
                        {transferNotice} <a href={calculatorPath(AppId.Mortgage)}>Open calculator</a>
                      </p>
                    )}
                  </>
                )}
                tone={MetricTone.Primary}
              />
              <MetricCard
                label="Potential repair tax relief"
                value={`+${formatEur(evalResult.craftsmanTaxCreditEur)}`}
                subtitle="Estimated § 35a EStG income-tax reduction"
                footer={(
                  <>
                    <LawRefLink lawId={LawId.EStG_35a} label="§ 35a EStG" />{" "}
                    {repairLawSource && <a href={repairLawSource.url}>Official statute</a>}
                  </>
                )}
                tone={MetricTone.Gain}
              />
            </div>

            <Card ariaLabelledBy="housing-breakdown-heading">
              <CardHeader
                headingId="housing-breakdown-heading"
                title="Financing & Buying Costs Breakdown"
              />
              <DataTable
                columns={BREAKDOWN_COLUMNS}
                rows={breakdownRows}
                rowKey={(row) => row.id}
                isTotalRow={(row) => Boolean(row.total)}
              />
              <p>
                Your savings and the estimated KfW 300 loan reduce the amount you need to borrow from a commercial bank.
                {s.availableEquityEur > savingsUsed ? " Not all of your available savings are needed." : ""}
              </p>
              <LawReferenceBar>
                <LawRefLink lawId={LawId.GrEStG_11} label="GrEStG § 11" />
                <LawRefLink lawId={LawId.KfW_300} label="KfW 300" />
                <LawRefLink lawId={LawId.EStG_35a} label="EStG § 35a" />
              </LawReferenceBar>
            </Card>

            <Kfw300GuidePanel context="housing" />

            <ParameterObserverSection embedded projectionProfile={FormProjectionProfileId.HousingFocus} />
          </>
        )}
      />
    </AppShell>
  );
}
