import "#/components/DomainCalculator.css";
import "./MortgageCalculator.css";
import {
  useEffect,
  useMemo,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  type LoanRepaymentMethod,
  calculatePurchaseLtv,
  estimateAffordability,
  estimateAffordableBankLoan,
  estimateAffordableBankLoanForTerm,
  LoanRepaymentMethod as LoanMethod,
  projectKfwLoan,
  toGraceYears,
} from "#/apps/mortgage/financingProjection.ts";
import {
  Kfw300GuidePanel,
} from "#/apps/mortgage/Kfw300GuidePanel.tsx";
import {
  mortgagePaymentForTerm,
  projectMortgage,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  MortgageChartsPanel,
} from "#/apps/mortgage/MortgageChartsPanel.tsx";
import {
  takeMortgageHandoff,
} from "#/apps/mortgage/mortgageHandoff.ts";
import {
  MortgageLedgerPanel,
} from "#/apps/mortgage/MortgageLedgerPanel.tsx";
import {
  type Kfw300Preset,
  DEFAULT_KFW_300_PRESET,
  KFW_300_PRESETS,
  buildCombinedMortgageSchedule,
  buildTermSensitivityPoints,
} from "#/apps/mortgage/mortgageSchedule.ts";
import OptionalNumberInput from "#components/OptionalNumberInput";
import {
  TopicHelp,
} from "#components/topics/TopicHelp";
import LawRefLink from "#components/laws/LawRefLink";
import {
  AppShell,
  Badge,
  BadgeTone,
  BannerTone,
  Button,
  ButtonSize,
  ButtonVariant,
  MetricCard,
  MetricTone,
  NumberField,
  PageHeader,
  SegmentedControl,
  StatusBanner,
} from "#/components/ui/index.ts";
import {
  LawId,
} from "#engine/laws/types";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  formatEurCents as formatEur,
} from "#utils/currencyFormat";

const BankPaymentMode = {
  InitialRepayment: "initial-repayment",
  PayoffTerm: "payoff-term",
} as const;
type BankPaymentMode = (typeof BankPaymentMode)[keyof typeof BankPaymentMode];

const BANK_MODES = [
  { value: BankPaymentMode.InitialRepayment,
    label: "Initial repayment %" },
  { value: BankPaymentMode.PayoffTerm,
    label: "Payoff term" },
] as const;

const METHODS = [
  { value: LoanMethod.Annuity,
    label: "Monthly repayment" },
  { value: LoanMethod.Balloon,
    label: "Lump sum at end" },
] as const;

const MortgageResultsTab = {
  Overview: "overview",
  Ledger: "ledger",
  Affordability: "affordability",
  KfwGuide: "kfw-guide",
} as const;
type MortgageResultsTab = (typeof MortgageResultsTab)[keyof typeof MortgageResultsTab];

const RESULTS_TAB_OPTIONS = [
  { value: MortgageResultsTab.Overview,
    label: "Overview & Charts" },
  { value: MortgageResultsTab.Ledger,
    label: "Repayment Ledger" },
  { value: MortgageResultsTab.Affordability,
    label: "Affordability" },
  { value: MortgageResultsTab.KfwGuide,
    label: "KfW 300 Guide" },
] as const;

const KFW_QUICK_AMOUNTS = [
  { amount: 0,
    label: "€0 (No KfW)" },
  { amount: 170000,
    label: "€170k (1–2 kids)" },
  { amount: 200000,
    label: "€200k (3–4 kids)" },
  { amount: 220000,
    label: "€220k (5+ / QNG)" },
] as const;

const DEFAULT_PROPERTY_PRICE = 480000;
const DEFAULT_SAVINGS = 100000;
const DEFAULT_CLOSING_COSTS = 57936;
const DEFAULT_BANK_PRINCIPAL = 267936;
const DEFAULT_KFW_PRINCIPAL = 170000;
const DEFAULT_BANK_INTEREST = 3.6;
const DEFAULT_BANK_REPAYMENT = 2;
const DEFAULT_HORIZON_YEARS = 15;
const DEFAULT_INCOME = 5500;
const DEFAULT_EXPENSES = 2200;
const DEFAULT_HOUSING_COSTS = 450;

export default function MortgageCalculator(): JSX.Element {
  const [principal, setPrincipal] = useState(DEFAULT_BANK_PRINCIPAL);
  const [interest, setInterest] = useState(DEFAULT_BANK_INTEREST);
  const [repayment, setRepayment] = useState(DEFAULT_BANK_REPAYMENT);
  const [bankMode, setBankMode] = useState<BankPaymentMode>(BankPaymentMode.InitialRepayment);
  const [bankTerm, setBankTerm] = useState(30);
  const [extraPayment, setExtraPayment] = useState(0);
  const [propertyPrice, setPropertyPrice] = useState<number | undefined>(DEFAULT_PROPERTY_PRICE);
  const [savings, setSavings] = useState<number | undefined>(DEFAULT_SAVINGS);
  const [closingCosts, setClosingCosts] = useState<number | undefined>(DEFAULT_CLOSING_COSTS);
  const [kfwPrincipal, setKfwPrincipal] = useState(DEFAULT_KFW_PRINCIPAL);
  const [kfwInterest, setKfwInterest] = useState<number | undefined>(DEFAULT_KFW_300_PRESET.illustrativeRatePercent);
  const [kfwTerm, setKfwTerm] = useState<number | undefined>(DEFAULT_KFW_300_PRESET.termYears);
  const [kfwGrace, setKfwGrace] = useState<number | undefined>(DEFAULT_KFW_300_PRESET.graceYears);
  const [method, setMethod] = useState<LoanRepaymentMethod>(DEFAULT_KFW_300_PRESET.method);
  const [kfwUsingIllustrativeRate, setKfwUsingIllustrativeRate] = useState(true);
  const [years, setYears] = useState(DEFAULT_HORIZON_YEARS);
  const [income, setIncome] = useState<number | undefined>(DEFAULT_INCOME);
  const [expenses, setExpenses] = useState<number | undefined>(DEFAULT_EXPENSES);
  const [housingCosts, setHousingCosts] = useState<number | undefined>(DEFAULT_HOUSING_COSTS);
  const [activeTab, setActiveTab] = useState<MortgageResultsTab>(MortgageResultsTab.Overview);
  const [transferred, setTransferred] = useState(false);
  const [ready, setReady] = useState(false);
  const [invalidFields, setInvalidFields] = useState<Readonly<Record<string, boolean>>>({});

  const trackValidity = (key: string) => (valid: boolean): void => {
    setInvalidFields((previous) => {
      if (Boolean(previous[key]) === !valid) {
        return previous;
      }
      return { ...previous,
        [key]: !valid };
    });
  };
  const hasInvalidFields = Object.values(invalidFields).some(Boolean);

  const applyKfwPreset = (preset: Kfw300Preset): void => {
    setKfwInterest(preset.illustrativeRatePercent);
    setKfwTerm(preset.termYears);
    setKfwGrace(preset.graceYears);
    setMethod(preset.method);
    setKfwUsingIllustrativeRate(true);
  };

  const handleKfwPrincipalChange = (nextPrincipal: number): void => {
    setKfwPrincipal(nextPrincipal);
    if (nextPrincipal > 0) {
      if (kfwInterest === undefined) {
        setKfwInterest(DEFAULT_KFW_300_PRESET.illustrativeRatePercent);
        setKfwUsingIllustrativeRate(true);
      }
      if (kfwTerm === undefined) {
        setKfwTerm(DEFAULT_KFW_300_PRESET.termYears);
      }
      if (kfwGrace === undefined) {
        setKfwGrace(DEFAULT_KFW_300_PRESET.graceYears);
      }
    }
  };

  const resetDefaults = (): void => {
    setPrincipal(DEFAULT_BANK_PRINCIPAL);
    setInterest(DEFAULT_BANK_INTEREST);
    setRepayment(DEFAULT_BANK_REPAYMENT);
    setBankMode(BankPaymentMode.InitialRepayment);
    setBankTerm(30);
    setExtraPayment(0);
    setPropertyPrice(DEFAULT_PROPERTY_PRICE);
    setSavings(DEFAULT_SAVINGS);
    setClosingCosts(DEFAULT_CLOSING_COSTS);
    setKfwPrincipal(DEFAULT_KFW_PRINCIPAL);
    applyKfwPreset(DEFAULT_KFW_300_PRESET);
    setYears(DEFAULT_HORIZON_YEARS);
    setIncome(DEFAULT_INCOME);
    setExpenses(DEFAULT_EXPENSES);
    setHousingCosts(DEFAULT_HOUSING_COSTS);
    setTransferred(false);
  };

  useEffect(() => {
    try {
      const input = takeMortgageHandoff(window.sessionStorage);
      if (input) {
        setPrincipal(input.principal);
        setInterest(Number((input.annualInterest * 100).toFixed(2)));
        setRepayment(Number((input.initialRepayment * 100).toFixed(2)));
        setKfwPrincipal(input.kfwPrincipal);
        setPropertyPrice(input.propertyPrice);
        setSavings(input.savings);
        setClosingCosts(input.closingCosts);
        if (input.kfwPrincipal > 0) {
          applyKfwPreset(DEFAULT_KFW_300_PRESET);
        }
        setTransferred(true);
      }
    }
    catch {
      // Inputs remain editable if tab storage is unavailable.
    }
    finally {
      setReady(true);
    }
  }, []);

  const horizon = toMortgageYears(years);
  const bankPrincipal = toEuroAmount(principal);
  const bankRate = toPercentageRate(interest / 100);
  const bankRepayment = toPercentageRate(repayment / 100);
  const basePayment = bankMode === BankPaymentMode.PayoffTerm
    ? mortgagePaymentForTerm(bankPrincipal, bankRate, toMortgageYears(bankTerm))
    : undefined;
  const bankOptions = useMemo(
    () => ({
      extraMonthlyPayment: toEuroAmount(extraPayment),
      baseMonthlyPayment: basePayment,
    }),
    [extraPayment, basePayment],
  );

  const bank = useMemo(
    () => projectMortgage(bankPrincipal, bankRate, bankRepayment, horizon, bankOptions),
    [bankPrincipal, bankRate, bankRepayment, horizon, bankOptions],
  );
  const bankFull = useMemo(
    () => projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(50), bankOptions),
    [bankPrincipal, bankRate, bankRepayment, bankOptions],
  );
  const bankWithoutExtra = useMemo(
    () => extraPayment > 0
      ? projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(50), { baseMonthlyPayment: basePayment })
      : null,
    [extraPayment, bankPrincipal, bankRate, bankRepayment, basePayment],
  );

  const totalDebt = toEuroAmount(principal + kfwPrincipal);
  const ltv = propertyPrice === undefined ? null : calculatePurchaseLtv(totalDebt, toEuroAmount(propertyPrice));
  const validTerm = kfwTerm !== undefined && Number.isInteger(kfwTerm) && kfwTerm >= 1 && kfwTerm <= 50;
  const validGrace = method === LoanMethod.Balloon || (validTerm && kfwGrace !== undefined && kfwGrace < kfwTerm);
  const kfwTerms = useMemo(
    () => kfwPrincipal > 0 && kfwInterest !== undefined && validTerm && validGrace
      ? {
        principal: toEuroAmount(kfwPrincipal),
        annualInterest: toPercentageRate(kfwInterest / 100),
        term: toMortgageYears(kfwTerm),
        grace: toGraceYears(method === LoanMethod.Balloon ? 0 : (kfwGrace ?? 0)),
        method,
      }
      : null,
    [kfwPrincipal, kfwInterest, validTerm, validGrace, kfwTerm, kfwGrace, method],
  );

  const kfw = useMemo(() => (kfwTerms ? projectKfwLoan(kfwTerms, horizon) : null), [kfwTerms, horizon]);
  const complete = kfwPrincipal === 0 || kfw !== null;

  const schedule = useMemo(
    () => complete
      ? buildCombinedMortgageSchedule(
        {
          principal: bankPrincipal,
          annualInterest: bankRate,
          initialRepayment: bankRepayment,
          options: bankOptions,
        },
        kfwTerms,
        horizon,
      )
      : null,
    [complete, bankPrincipal, bankRate, bankRepayment, bankOptions, kfwTerms, horizon],
  );

  const termSensitivity = useMemo(
    () => buildTermSensitivityPoints(bankPrincipal, bankRate, 5, 35, 5),
    [bankPrincipal, bankRate],
  );

  if (!ready) {
    return (
      <AppShell currentPath={calculatorPath(AppId.Mortgage)}>
        <PageHeader eyebrow="Home financing" title="Mortgage Simulator & Affordability" />
        <p role="status">Loading financing details…</p>
      </AppShell>
    );
  }

  const monthly = complete ? bank.monthlyPayment + (kfw?.initialMonthlyPayment ?? 0) : null;
  const affordability = monthly !== null && income !== undefined && expenses !== undefined && housingCosts !== undefined
    ? estimateAffordability(toEuroAmount(income), toEuroAmount(expenses), toEuroAmount(housingCosts), toEuroAmount(monthly))
    : null;
  const alternative = kfwTerms
    ? projectKfwLoan({ ...kfwTerms,
      annualInterest: toPercentageRate(interest / 100) }, horizon)
    : null;
  const kfwInterestDifference = alternative && kfw ? alternative.interestPaid - kfw.interestPaid : null;
  const bankAtGraceEnd = kfwGrace !== undefined && kfwGrace > 0
    ? projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(kfwGrace), bankOptions)
    : bank;
  const kfwBudgetPayment = kfw ? Math.max(kfw.initialMonthlyPayment, kfw.laterMonthlyPayment) : 0;
  const availableForBank = affordability ? affordability.availableBeforeLoans - kfwBudgetPayment - extraPayment : null;
  const affordableBank = availableForBank === null
    ? null
    : bankMode === BankPaymentMode.PayoffTerm
      ? estimateAffordableBankLoanForTerm(toEuroAmount(availableForBank), bankRate, toMortgageYears(bankTerm))
      : estimateAffordableBankLoan(toEuroAmount(availableForBank), bankRate, bankRepayment);
  const affordablePrice = affordableBank !== null && savings !== undefined && closingCosts !== undefined
    ? Math.max(0, affordableBank + kfwPrincipal + savings - closingCosts)
    : null;
  const afterGrace = kfw && method === LoanMethod.Annuity && kfwGrace !== undefined && kfwGrace > 0
    ? (bankAtGraceEnd.paidOff ? 0 : bank.monthlyPayment) + kfw.laterMonthlyPayment
    : null;
  const laterAffordability = afterGrace !== null && income !== undefined && expenses !== undefined && housingCosts !== undefined
    ? estimateAffordability(toEuroAmount(income), toEuroAmount(expenses), toEuroAmount(housingCosts), toEuroAmount(afterGrace))
    : null;

  const activePresetId = KFW_300_PRESETS.find(
    (p) => p.termYears === kfwTerm && p.graceYears === (kfwGrace ?? 0) && p.method === method,
  )?.id;

  return (
    <AppShell currentPath={calculatorPath(AppId.Mortgage)}>
      <PageHeader
        eyebrow="Home financing"
        title="Mortgage Simulator & Affordability"
        subtitle="Simulate your commercial bank loan and KfW 300 family loan side-by-side with interactive charts, monthly/annual ledger, and household affordability."
        actions={(
          <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={resetDefaults}>
            Reset defaults
          </Button>
        )}
      />

      {transferred && (
        <StatusBanner
          tone={BannerTone.Info}
          title="Loaded financing figures from the Home Purchase Planner"
          actions={<a href={calculatorPath(AppId.Housing)}>Edit in Home Purchase Planner</a>}
        >
          {kfwPrincipal > 0
            ? `Bank loan (${formatEur(principal)}) and KfW 300 loan (${formatEur(kfwPrincipal)}) transferred. Editable illustrative KfW 300 terms are pre-filled below—replace the rate with your actual KfW offer.`
            : `Bank loan (${formatEur(principal)}) and purchase costs transferred from your Home Purchase Planner.`}
        </StatusBanner>
      )}

      <div className="domain-calc-layout">
        <div className="mortgage-inputs">
          <section className="ui-card" aria-labelledby="mortgage-property">
            <h2 id="mortgage-property">Property &amp; bank loan</h2>
            <div className="domain-calc-fields">
              <OptionalNumberInput id="mortgage-value" topicId="loan-to-value" onValidityChange={trackValidity("mortgage-value")} label="Property purchase price / value" unit="€" min={0} max={20000000} placeholder="Enter value" value={propertyPrice} onChange={setPropertyPrice} />
              <OptionalNumberInput id="mortgage-savings" onValidityChange={trackValidity("mortgage-savings")} label="Savings available for purchase" unit="€" min={0} max={20000000} placeholder="Enter savings" value={savings} onChange={setSavings} />
              <OptionalNumberInput id="mortgage-closing-costs" topicId="purchase-costs" onValidityChange={trackValidity("mortgage-closing-costs")} label="Purchase costs beyond the property price" unit="€" min={0} max={20000000} placeholder="Enter costs" value={closingCosts} onChange={setClosingCosts} />
              <NumberField id="mortgage-principal" topicId="bank-loan-amount" onValidityChange={trackValidity("mortgage-principal")} label="Bank loan amount (excluding KfW)" unit="€" min={0} max={20000000} step={5000} value={principal} onChange={setPrincipal} />
              <NumberField id="mortgage-interest" onValidityChange={trackValidity("mortgage-interest")} label="Bank annual interest rate" topicId="mortgage-repayment" unit="%" min={0} max={15} step={0.1} value={interest} onChange={setInterest} />
              <div>
                <p className="mortgage-preset-label">Bank repayment setup</p>
                <SegmentedControl label="Bank repayment setup" value={bankMode} options={BANK_MODES} onChange={setBankMode} />
              </div>
              {bankMode === BankPaymentMode.InitialRepayment
                ? <NumberField id="mortgage-repayment" onValidityChange={trackValidity("mortgage-repayment")} label="Bank initial annual repayment" topicId="mortgage-repayment" unit="%" min={0} max={20} step={0.25} value={repayment} onChange={setRepayment} />
                : <NumberField id="mortgage-bank-term" topicId="mortgage-payoff-term" onValidityChange={trackValidity("mortgage-bank-term")} label="Target bank payoff term" unit="years" min={1} max={50} step={1} value={bankTerm} construct={toMortgageYears} onChange={setBankTerm} />}
              <NumberField id="mortgage-extra" topicId="extra-bank-payment" onValidityChange={trackValidity("mortgage-extra")} label="Extra bank principal payment" unit="€/month" min={0} max={1000000} step={50} value={extraPayment} onChange={setExtraPayment} />
              <NumberField id="mortgage-years" onValidityChange={trackValidity("mortgage-years")} label="Show projection for" unit="years" min={1} max={50} step={1} value={years} construct={toMortgageYears} onChange={setYears} />
            </div>
          </section>

          <section className="ui-card" aria-labelledby="mortgage-kfw">
            <div className="mortgage-heading">
              <h2 id="mortgage-kfw">KfW 300 loan</h2>
              {kfwPrincipal > 0 && kfwUsingIllustrativeRate && (
                <Badge tone={BadgeTone.Warning}>Illustrative default</Badge>
              )}
            </div>
            <p className="mortgage-muted">
              KfW 300 is a subsidized loan (not a grant). Pick a typical KfW 300 structure below, then enter the nominal rate from your bank offer.
            </p>
            <LawRefLink lawId={LawId.KfW_300} label="KfW 300 program & official terms" />

            <div className="domain-calc-fields">
              <div className="mortgage-preset-group">
                <span className="mortgage-preset-label">Quick KfW 300 loan cap</span>
                <div className="mortgage-chip-row" role="group" aria-label="Quick KfW 300 loan amounts">
                  {KFW_QUICK_AMOUNTS.map((item) => (
                    <button
                      key={item.amount}
                      type="button"
                      className={`mortgage-chip${kfwPrincipal === item.amount ? " mortgage-chip--active" : ""}`}
                      onClick={() => handleKfwPrincipalChange(item.amount)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <NumberField id="mortgage-kfw-amount" onValidityChange={trackValidity("mortgage-kfw-amount")} label="KfW loan amount" unit="€" min={0} max={20000000} step={5000} value={kfwPrincipal} onChange={handleKfwPrincipalChange} />

              {kfwPrincipal > 0 && (
                <>
                  <div className="mortgage-preset-group">
                    <span className="mortgage-preset-label">Standard KfW 300 repayment presets</span>
                    <div className="mortgage-chip-row" role="group" aria-label="KfW 300 repayment presets">
                      {KFW_300_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          title={preset.description}
                          className={`mortgage-chip${activePresetId === preset.id ? " mortgage-chip--active" : ""}`}
                          onClick={() => applyKfwPreset(preset)}
                        >
                          {preset.shortLabel}
                        </button>
                      ))}
                    </div>
                  </div>

                  <OptionalNumberInput
                    id="mortgage-kfw-rate"
                    topicId="kfw-repayment-options"
                    onValidityChange={trackValidity("mortgage-kfw-rate")}
                    label="KfW nominal annual interest rate"
                    unit="%"
                    min={0}
                    max={15}
                    step={0.01}
                    placeholder="e.g. 1.50"
                    value={kfwInterest}
                    onChange={(value) => {
                      setKfwInterest(value);
                      setKfwUsingIllustrativeRate(false);
                    }}
                  />
                  <OptionalNumberInput
                    id="mortgage-kfw-term"
                    topicId="kfw-repayment-options"
                    onValidityChange={trackValidity("mortgage-kfw-term")}
                    label="KfW total loan term"
                    unit="years"
                    min={1}
                    max={50}
                    step={1}
                    placeholder="e.g. 35"
                    value={kfwTerm}
                    onChange={(value) => {
                      if (value !== undefined) {
                        toMortgageYears(value);
                      }
                      setKfwTerm(value);
                    }}
                  />
                  <div>
                    <p className="mortgage-preset-label">Repayment type</p>
                    <SegmentedControl topicId="kfw-repayment-options" label="KfW repayment type" value={method} options={METHODS} onChange={setMethod} />
                  </div>
                  {method === LoanMethod.Annuity && (
                    <OptionalNumberInput
                      id="mortgage-kfw-grace"
                      topicId="kfw-repayment-options"
                      onValidityChange={trackValidity("mortgage-kfw-grace")}
                      label="Interest-only period (Tilgungsfreie Anlaufjahre)"
                      unit="years"
                      min={0}
                      max={49}
                      step={1}
                      placeholder="1–5 years"
                      value={kfwGrace}
                      onChange={(value) => {
                        if (value !== undefined) {
                          toGraceYears(value);
                        }
                        setKfwGrace(value);
                      }}
                    />
                  )}
                  {!validGrace && validTerm && kfwGrace !== undefined && (
                    <p role="alert">The interest-only period must be shorter than the KfW term.</p>
                  )}
                </>
              )}
            </div>
          </section>

          <section className="ui-card" aria-labelledby="mortgage-budget">
            <div className="mortgage-heading">
              <h2 id="mortgage-budget">Monthly affordability</h2>
              <TopicHelp id="mortgage-affordability" />
            </div>
            <p className="mortgage-muted">
              Enter your household monthly cash flow. Exclude the loans modeled here from other spending to avoid double counting.
            </p>
            <div className="domain-calc-fields">
              <OptionalNumberInput id="mortgage-income" onValidityChange={trackValidity("mortgage-income")} label="Household income after tax" unit="€/month" min={0} max={10000000} placeholder="Enter income" value={income} onChange={setIncome} />
              <OptionalNumberInput id="mortgage-expenses" onValidityChange={trackValidity("mortgage-expenses")} label="Other spending and existing debts" unit="€/month" min={0} max={10000000} placeholder="Enter spending" value={expenses} onChange={setExpenses} />
              <OptionalNumberInput id="mortgage-running-costs" onValidityChange={trackValidity("mortgage-running-costs")} label="Home running costs and maintenance reserve" unit="€/month" min={0} max={10000000} placeholder="Enter costs" value={housingCosts} onChange={setHousingCosts} />
            </div>
          </section>
        </div>

        <div className="domain-calc-results">
          {hasInvalidFields && <p role="alert">Correct the highlighted inputs. Results below use the last valid values.</p>}

          <div className="mortgage-results-nav">
            <SegmentedControl
              label="Mortgage simulator sections"
              value={activeTab}
              options={RESULTS_TAB_OPTIONS}
              onChange={setActiveTab}
            />
            <a href={calculatorPath(AppId.Housing)}>Back to Home Purchase Planner</a>
          </div>

          <div className="domain-calc-kpis">
            <MetricCard
              label="Total borrowed"
              value={formatEur(totalDebt)}
              subtitle={`Bank ${formatEur(principal)} + KfW ${formatEur(kfwPrincipal)}`}
              tone={MetricTone.Primary}
            />
            <MetricCard
              label="Starting monthly payments"
              value={monthly === null ? "Enter KfW terms" : `${formatEur(monthly)}/mo`}
              subtitle={monthly === null
                ? "Complete KfW rate, term & grace years"
                : `Bank ${formatEur(bank.monthlyPayment)} + KfW ${formatEur(kfw?.initialMonthlyPayment ?? 0)}`}
            />
            {afterGrace !== null ? (
              <MetricCard
                label={`After year ${kfwGrace} (post-grace)`}
                value={`${formatEur(afterGrace)}/mo`}
                subtitle={`Bank ${formatEur(bankAtGraceEnd.paidOff ? 0 : bank.monthlyPayment)} + KfW ${formatEur(kfw?.laterMonthlyPayment ?? 0)}`}
                tone={laterAffordability && laterAffordability.remainingAfterLoans < 0 ? MetricTone.Loss : MetricTone.Neutral}
              />
            ) : (
              <MetricCard
                label="Loan-to-value (LTV)"
                value={ltv === null ? "Enter property value" : `${(ltv * 100).toFixed(1)}%`}
                subtitle="Both loans ÷ purchase price"
                footer={<TopicHelp id="loan-to-value" />}
              />
            )}
          </div>

          {kfwPrincipal > 0 && kfwUsingIllustrativeRate && (
            <StatusBanner
              tone={BannerTone.Warning}
              title={`Using illustrative KfW 300 rate (${kfwInterest?.toFixed(2)}% nominal, ${kfwTerm}y term, ${method === LoanMethod.Balloon ? "balloon" : `${kfwGrace}y grace`})`}
              actions={<LawRefLink lawId={LawId.KfW_300} label="Check official KfW 300 rates" />}
            >
              KfW 300 interest rates change periodically and are typically fixed for 10 years. Replace the nominal rate in the KfW 300 card with your actual bank offer.
            </StatusBanner>
          )}

          {activeTab === MortgageResultsTab.Overview && (
            <>
              {schedule && (
                <MortgageChartsPanel
                  schedule={schedule}
                  termSensitivity={termSensitivity}
                  hasKfw={kfwPrincipal > 0}
                />
              )}

              <section className="ui-card mortgage-results">
                <h2>What you repay over {years} years</h2>
                <p>
                  Your total debt includes both loans. Loan-to-value ({ltv === null ? "enter property price" : `${(ltv * 100).toFixed(1)}%`}) uses the entered purchase price, not the bank's valuation; closing costs can push it above 100%.
                </p>
                {kfwPrincipal > 0 && !complete && (
                  <p role="status">
                    Enter the KfW interest rate, term and, for monthly repayment, interest-only period to see combined payments, interest, balance, charts and ledger.
                  </p>
                )}
                {kfw && (
                  <>
                    <p>
                      KfW starts at <strong>{formatEur(kfw.initialMonthlyPayment)}/month</strong>
                      {afterGrace !== null && (
                        <>
                          ; after {kfwGrace} interest-only {kfwGrace === 1 ? "year" : "years"}, its regular payment rises to{" "}
                          <strong>{formatEur(kfw.laterMonthlyPayment)}/month</strong> and both loans together are estimated at{" "}
                          <strong>{formatEur(afterGrace)}/month</strong>
                        </>
                      )}.
                    </p>
                    {method === LoanMethod.Balloon && (
                      <p role="status">
                        The KfW payment above covers interest only. The entire <strong>{formatEur(kfwPrincipal)}</strong> principal is due as a lump sum at the end of year {kfwTerm}.
                      </p>
                    )}
                    <p>
                      Over the selected {years} years: estimated combined interest{" "}
                      <strong>{formatEur(bank.interestPaid + kfw.interestPaid)}</strong>; combined payments{" "}
                      <strong>{formatEur(principal - bank.balance + bank.interestPaid + kfw.totalPaid)}</strong>; remaining debt{" "}
                      <strong>{formatEur(bank.balance + kfw.balance)}</strong> (Bank {formatEur(bank.balance)} + KfW {formatEur(kfw.balance)}).
                    </p>
                    {kfwInterestDifference !== null && (
                      <p>
                        Compared with borrowing the same KfW amount at your bank rate ({interest.toFixed(2)}%), with the{" "}
                        <em>same term and repayment structure</em>, estimated KfW interest is{" "}
                        <strong>
                          {kfwInterestDifference >= 0
                            ? `${formatEur(kfwInterestDifference)} lower`
                            : `${formatEur(-kfwInterestDifference)} higher`}
                        </strong>{" "}
                        over this period.
                      </p>
                    )}
                  </>
                )}
                {kfwPrincipal === 0 && (
                  <p>
                    Over {years} years: estimated bank interest <strong>{formatEur(bank.interestPaid)}</strong>; remaining bank debt{" "}
                    <strong>{formatEur(bank.balance)}</strong>.
                  </p>
                )}
                {principal > 0 && (
                  <p>
                    Bank base payment: <strong>{formatEur(bank.baseMonthlyPayment)}/month</strong>
                    {extraPayment > 0 && (
                      <> plus <strong>{formatEur(extraPayment)}/month</strong> extra principal</>
                    )}. {bankFull.paidOff ? `Estimated bank payoff after ${bankFull.elapsedMonths} months (${(bankFull.elapsedMonths / 12).toFixed(1)} years)` : "Bank debt remains after 50 years"}, assuming rates and payments stay unchanged.
                  </p>
                )}
                {bankWithoutExtra?.paidOff && bankFull.paidOff && (
                  <p>
                    Compared with no extra bank payment, this scenario repays the bank loan{" "}
                    <strong>{bankWithoutExtra.elapsedMonths - bankFull.elapsedMonths} months sooner</strong> and saves approximately{" "}
                    <strong>{formatEur(bankWithoutExtra.interestPaid - bankFull.interestPaid)}</strong> in bank interest.
                  </p>
                )}
                {bankWithoutExtra && !bankWithoutExtra.paidOff && bankFull.paidOff && (
                  <p>
                    Without extra payments, the bank loan still has an estimated balance of {formatEur(bankWithoutExtra.balance)} after 50 years.
                  </p>
                )}
                {bank.balanceIncreasing && <p role="status">The bank payment does not cover interest, so its balance grows.</p>}
                {!bank.paidOff && !bank.balanceIncreasing && principal > 0 && bankMode === BankPaymentMode.InitialRepayment && repayment === 0 && extraPayment === 0 && (
                  <p role="status">The bank loan has no initial principal repayment, so the balance may remain outstanding.</p>
                )}
                <p className="mortgage-muted">
                  Figures assume both loans are fully disbursed at the start and use fixed nominal rates across the projection. KfW extra payments, fees, disbursement timing, and post-Zinsbindung refinancing are excluded.
                </p>
              </section>
            </>
          )}

          {activeTab === MortgageResultsTab.Ledger && (
            schedule ? (
              <MortgageLedgerPanel schedule={schedule} hasKfw={kfwPrincipal > 0} />
            ) : (
              <section className="ui-card mortgage-results">
                <h2>Repayment Ledger</h2>
                <p role="status">Enter the KfW interest rate, term and grace period to generate the monthly and annual repayment ledger.</p>
              </section>
            )
          )}

          {activeTab === MortgageResultsTab.Affordability && (
            <section className="ui-card mortgage-results" aria-labelledby="affordability-results">
              <h2 id="affordability-results">Monthly Household Affordability</h2>
              {affordability ? (
                <>
                  <p>
                    Available after your spending and home running costs, before these loans:{" "}
                    <strong>{formatEur(affordability.availableBeforeLoans)}/month</strong>.
                  </p>
                  <p>
                    Left after starting loan payments ({formatEur(monthly ?? 0)}/mo):{" "}
                    <strong>{formatEur(affordability.remainingAfterLoans)}/month</strong>
                    {affordability.loanPaymentShare !== null && (
                      <> · loan payments are {(affordability.loanPaymentShare * 100).toFixed(1)}% of net income</>
                    )}.
                  </p>
                  {laterAffordability && afterGrace !== null && (
                    <p>
                      After the KfW interest-only period (total {formatEur(afterGrace)}/mo), estimated amount left:{" "}
                      <strong>{formatEur(laterAffordability.remainingAfterLoans)}/month</strong>
                      {laterAffordability.loanPaymentShare !== null && (
                        <> · {(laterAffordability.loanPaymentShare * 100).toFixed(1)}% of net income</>
                      )}.
                    </p>
                  )}
                  {affordability.remainingAfterLoans < 0 && (
                    <p role="status">The entered budget has a monthly shortfall at the starting payment.</p>
                  )}
                  {laterAffordability && laterAffordability.remainingAfterLoans < 0 && (
                    <p role="status">Warning: Once the KfW interest-only period ends, the combined payment exceeds your remaining monthly budget.</p>
                  )}
                  {affordableBank !== null && (
                    <p>
                      Using all income remaining after your entered expenses, home costs, extra bank payment, and the larger regular KfW payment, the estimated bank loan supported is{" "}
                      <strong>{formatEur(affordableBank)}</strong>.{" "}
                      {affordablePrice !== null ? (
                        <>
                          With the entered savings, fixed purchase costs, and KfW loan, that gives an estimated purchase budget of{" "}
                          <strong>{formatEur(affordablePrice)}</strong>.
                        </>
                      ) : "Enter savings and purchase costs to estimate a purchase budget."}
                    </p>
                  )}
                  {affordableBank === null && availableForBank !== null && (
                    <p>
                      {availableForBank < 0
                        ? "The KfW payment and extra bank payment exceed the available monthly budget."
                        : "Enter a positive bank interest or repayment rate to estimate a maximum loan."}
                    </p>
                  )}
                  {method === LoanMethod.Balloon && kfwPrincipal > 0 && (
                    <p>The monthly budget and maximum loan do not include saving for the KfW lump sum.</p>
                  )}
                  <p className="mortgage-muted">
                    This is a cash-flow estimate, not a bank lending decision. Include all recurring costs and buffers that matter to your household.
                  </p>
                </>
              ) : (
                <p>
                  Enter net income, other spending, and home running costs{!complete ? ", plus the KfW terms," : ""} to calculate the amount left each month.
                </p>
              )}
            </section>
          )}

          {activeTab === MortgageResultsTab.KfwGuide && (
            <Kfw300GuidePanel context="mortgage" />
          )}
        </div>
      </div>
    </AppShell>
  );
}
