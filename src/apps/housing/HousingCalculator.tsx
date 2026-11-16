import "#/components/DomainCalculator.css";
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
  writeMortgageHandoff, 
} from "#/apps/mortgage/mortgageHandoff.ts";
import {
  isPlainPrimaryClick, 
} from "#store/lawReferenceStore";
import DomainCalculatorHeaderActions from "#components/DomainCalculatorHeaderActions";
import {
  EligibilityConfirmedIcon,
  StatutoryLimitationWarningIcon,
} from "#components/Icons";
import {
  ChoiceSelect,
} from "#components/ui/ChoiceSelect";
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

export default function HousingCalculator(): JSX.Element {
  const [transferNotice, setTransferNotice] = useState("");
  const s = housingState.value;
  const evalResult = housingEvaluation.value.value;
  const repairLawSource = getLawEntry(LawId.EStG_35a).externalSources[ExternalSourceId.GesetzeImInternet];
  const savingsUsed = Math.min(s.availableEquityEur, evalResult.totalCapitalRequirementEur);

  return (
    <AppShell
      currentPath={calculatorPath(AppId.Housing)}
      footerNote="Default notary and agent percentages can be adjusted in Statutory Assumptions below."
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

      <div className="domain-calc-layout">
        <section className="ui-card" aria-labelledby="housing-inputs-heading">
          <div className="ui-card__header">
            <div>
              <h2 id="housing-inputs-heading" className="ui-card__title">Property &amp; Financing</h2>
              <p className="ui-card__subtitle">Purchase price, equity, and state transfer tax rate.</p>
            </div>
          </div>
          <div className="domain-calc-fields">
            <ChoiceSelect
              id="housing-state"
              label="Federal State"
              value={s.federalState}
              options={FEDERAL_STATE_OPTIONS}
              onChange={(value) => updateHousingField("federalState", toGermanFederalState(value))}
            />

            <div className="domain-calc-field-row">
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
                label="Your savings for this purchase"
                unit="€"
                min={0}
                step={5000}
                value={s.availableEquityEur}
                onChange={(num) => updateHousingField("availableEquityEur", toEuroAmount(num))}
              />
            </div>

            <ToggleSwitch
              id="housing-broker"
              label="Include buyer agent commission"
              hint="Typical statutory split when buying through a broker"
              checked={s.includesBrokerCommission}
              onChange={(checked) => updateHousingField("includesBrokerCommission", checked)}
            />

            <h3 className="domain-calc-group-title">KfW 300 &amp; Renovation Relief</h3>

            <div className="domain-calc-field-row">
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
                label="Avg. Household Taxable Income"
                unit="€"
                min={0}
                step={2000}
                value={s.priorAverageHouseholdZvEEur}
                onChange={(num) => updateHousingField("priorAverageHouseholdZvEEur", toEuroAmount(num))}
              />
            </div>

            <ToggleSwitch
              id="housing-newbuild"
              topicId="eh40"
              label="Owner-occupied EH 40 new build"
              checked={s.isOwnerOccupiedNewBuildOrKfw300Standard}
              onChange={(checked) => updateHousingField("isOwnerOccupiedNewBuildOrKfw300Standard", checked)}
            />
            <ToggleSwitch
              id="housing-qng"
              topicId="qng"
              label="QNG sustainability certification"
              checked={s.isQngPlusCertified}
              onChange={(checked) => updateHousingField("isQngPlusCertified", checked)}
            />

            <NumberField
              id="housing-craftsman"
              topicId="craftsman-credit"
              label="Annual labor cost for qualifying home repairs"
              unit="€"
              min={0}
              step={250}
              value={s.renovationLaborCostEur}
              onChange={(num) => updateHousingField("renovationLaborCostEur", toEuroAmount(num))}
            />

            <div className="domain-calc-field-row">
              <NumberField
                id="housing-rate"
                topicId="mortgage-repayment"
                label="Mortgage Interest Rate"
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
                label="Initial Repayment (Tilgung)"
                unit="%"
                min={0.5}
                max={20}
                step={0.25}
                value={Number((s.initialAnnualRepaymentRate * 100).toFixed(2))}
                onChange={(num) => updateHousingField("initialAnnualRepaymentRate", toPercentageRate(num / 100))}
              />
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
                    ? `Potentially eligible for up to ${formatEur(evalResult.kfw300MaxSubsidizedLoanEur)} KfW 300 family loan`
                    : `Not eligible for KfW 300 (${s.dependentChildrenCount === 0 ? "requires 1+ minor children" : !s.isOwnerOccupiedNewBuildOrKfw300Standard ? "requires EH 40 new build" : `household income exceeds ${formatEur(evalResult.kfw300IncomeCeilingEur)} limit`})`}
                </span>
              </strong>
              <p>
                {evalResult.kfw300IncomeCeilingEur > 0
                  ? `KfW 300 household income ceiling for ${s.dependentChildrenCount} child(ren): ${formatEur(evalResult.kfw300IncomeCeilingEur)}.`
                  : "KfW 300 family loans require at least 1 minor child in the household."}
              </p>
            </div>
            <LawRefLink lawId={LawId.KfW_300} label="Read KfW 300 Program" />
          </div>

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
              subtitle={`Estimated starting payment: ${formatEur(evalResult.estimatedMonthlyBankPaymentEur)}/month`}
              footer={<><a className="ui-btn ui-btn--sm ui-btn--primary" href={calculatorPath(AppId.Mortgage)} onClick={(event) => {
                if (!isPlainPrimaryClick(event)) {
                  return;
                }
                try {
                  if (writeMortgageHandoff(window.sessionStorage, {
                    principal: evalResult.remainingBankLoanEur,
                    kfwPrincipal: evalResult.kfw300MaxSubsidizedLoanEur,
                    propertyPrice: s.purchasePriceEur,
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
              }}>Simulate all loan payments</a>
              {transferNotice && <p role="status">{transferNotice} <a href={calculatorPath(AppId.Mortgage)}>Open calculator</a></p>}</>}
              tone={MetricTone.Primary}
            />
            <MetricCard
              label="Potential tax reduction for home repairs"
              value={`+${formatEur(evalResult.craftsmanTaxCreditEur)}`}
              subtitle="Estimated income-tax reduction, subject to eligibility and tax owed"
              footer={<><LawRefLink lawId={LawId.EStG_35a} label="How the tax reduction works" /> {repairLawSource && <a href={repairLawSource.url}>Official law: § 35a EStG</a>}</>}
              tone={MetricTone.Gain}
            />
          </div>

          <section className="ui-card" aria-labelledby="housing-breakdown-heading">
            <div className="ui-card__header">
              <h2 id="housing-breakdown-heading" className="ui-card__title">Financing &amp; Buying Costs Breakdown</h2>
            </div>
            <table className="domain-calc-table">
              <thead>
                <tr>
                  <th>Cost / Financing Item</th>
                  <th className="num">Amount (EUR)</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Property purchase price</td>
                  <td className="num">{formatEur(s.purchasePriceEur)}</td>
                </tr>
                <tr>
                  <td>Property transfer tax — Grunderwerbsteuer ({(evalResult.transferTaxRate * 100).toFixed(1)}%)</td>
                  <td className="num">{formatEur(evalResult.transferTaxEur)}</td>
                </tr>
                <tr>
                  <td>Notary &amp; land registry</td>
                  <td className="num">{formatEur(evalResult.notaryAndRegistryEur)}</td>
                </tr>
                <tr>
                  <td>Buyer agent commission</td>
                  <td className="num">{formatEur(evalResult.buyerBrokerFeeEur)}</td>
                </tr>
                <tr>
                  <td>Total capital required</td>
                  <td className="num">{formatEur(evalResult.totalCapitalRequirementEur)}</td>
                </tr>
                <tr>
                  <td>Your savings used toward the purchase</td>
                  <td className="num">− {formatEur(savingsUsed)}</td>
                </tr>
                <tr>
                  <td>Estimated KfW 300 loan used toward the purchase</td>
                  <td className="num">− {formatEur(evalResult.kfw300MaxSubsidizedLoanEur)}</td>
                </tr>
                <tr className="is-total">
                  <th>Bank loan still needed</th>
                  <td className="num">{formatEur(evalResult.remainingBankLoanEur)}</td>
                </tr>
              </tbody>
            </table>

            <p>Your savings and the estimated KfW loan reduce the amount you need to borrow from a bank. The KfW loan is borrowed money and has its own repayment terms.</p>
            {s.availableEquityEur > savingsUsed && <p>Not all of your available savings are needed for the purchase.</p>}
            <div className="domain-calc-law-bar">
              <span>Legal basis:</span>
              <LawRefLink lawId={LawId.GrEStG_11} label="GrEStG § 11" />
              <LawRefLink lawId={LawId.KfW_300} label="KfW 300" />
              <LawRefLink lawId={LawId.EStG_35a} label="EStG § 35a" />
            </div>
          </section>

          <ParameterObserverSection projectionProfile={FormProjectionProfileId.HousingFocus} />
        </div>
      </div>
    </AppShell>
  );
}
