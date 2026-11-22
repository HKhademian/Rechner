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
  DismissIcon,
  ParameterSlidersIcon,
  ResetDefaultsIcon,
} from "#components/Icons";
import {
  AppShell,
  Badge,
  BadgeTone,
  BannerTone,
  Button,
  ButtonSize,
  ButtonVariant,
  LinkButton,
  MetricCard,
  MetricTone,
  NumberField,
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
  formatEur as formatEurWhole,
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

const DrawerSection = {
  All: "all",
  Bank: "bank",
  Kfw: "kfw",
  Budget: "budget",
} as const;
type DrawerSection = (typeof DrawerSection)[keyof typeof DrawerSection];

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerSection, setDrawerSection] = useState<DrawerSection>(DrawerSection.All);
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

  const openDrawer = (section: DrawerSection): void => {
    setDrawerSection(section);
    setDrawerOpen(true);
  };

  useEffect(() => {
    if (!drawerOpen || typeof document === "undefined") {
      return undefined;
    }
    const handleKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        setDrawerOpen(false);
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [drawerOpen]);

  const applyKfwPreset = (preset: Kfw300Preset): void => {
    if (kfwPrincipal === 0) {
      setKfwPrincipal(DEFAULT_KFW_PRINCIPAL);
    }
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
    setKfwInterest(DEFAULT_KFW_300_PRESET.illustrativeRatePercent);
    setKfwTerm(DEFAULT_KFW_300_PRESET.termYears);
    setKfwGrace(DEFAULT_KFW_300_PRESET.graceYears);
    setMethod(DEFAULT_KFW_300_PRESET.method);
    setKfwUsingIllustrativeRate(true);
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
          setKfwInterest(DEFAULT_KFW_300_PRESET.illustrativeRatePercent);
          setKfwTerm(DEFAULT_KFW_300_PRESET.termYears);
          setKfwGrace(DEFAULT_KFW_300_PRESET.graceYears);
          setMethod(DEFAULT_KFW_300_PRESET.method);
          setKfwUsingIllustrativeRate(true);
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
      <AppShell currentPath={calculatorPath(AppId.Mortgage)} wide>
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
  const combinedInterest = bank.interestPaid + (kfw?.interestPaid ?? 0);

  const activePresetId = kfwPrincipal > 0
    ? KFW_300_PRESETS.find((p) => p.termYears === kfwTerm && p.graceYears === (kfwGrace ?? 0) && p.method === method)?.id
    : undefined;

  return (
    <AppShell currentPath={calculatorPath(AppId.Mortgage)} wide>
      <div className="mw-layout">
        {/* Row 1: Quiet Command Header + Clickable Summary Strip Pills */}
        <header className="mw-command-header">
          <div className="mw-command-header__lead">
            <div className="mw-command-header__title-group">
              <h1 className="mw-command-header__title">Mortgage Simulator</h1>
              {kfwPrincipal > 0 && <Badge tone={BadgeTone.Brand}>KfW 300</Badge>}
            </div>

            <div className="mw-summary-strip" role="group" aria-label="Active financing parameters">
              <button type="button" className="mw-summary-pill" onClick={() => openDrawer(DrawerSection.Bank)}>
                <span>Bank</span>
                <strong>{formatEurWhole(principal)} · {interest.toFixed(2)}%</strong>
              </button>
              <button type="button" className="mw-summary-pill" onClick={() => openDrawer(DrawerSection.Kfw)}>
                <span>KfW 300</span>
                <strong>
                  {kfwPrincipal > 0
                    ? `${formatEurWhole(kfwPrincipal)} · ${kfwInterest?.toFixed(2) ?? "—"}% (${kfwTerm ?? "—"}y${method === LoanMethod.Balloon ? " balloon" : `/${kfwGrace ?? 0}y`})`
                    : "Off"}
                </strong>
              </button>
              <button type="button" className="mw-summary-pill" onClick={() => openDrawer(DrawerSection.Bank)}>
                <span>Horizon</span>
                <strong>{years} yrs</strong>
              </button>
              <button type="button" className="mw-summary-pill" onClick={() => openDrawer(DrawerSection.Budget)}>
                <span>Net Income</span>
                <strong>{income !== undefined ? `${formatEurWhole(income)}/mo` : "Not set"}</strong>
              </button>
            </div>
          </div>

          <div className="mw-command-header__actions">
            <Button
              size={ButtonSize.Sm}
              variant={ButtonVariant.Primary}
              onClick={() => openDrawer(DrawerSection.All)}
            >
              <ParameterSlidersIcon size={13} />
              <span>Edit Loans &amp; Budget</span>
            </Button>
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={resetDefaults}>
              <ResetDefaultsIcon size={13} />
              <span>Reset</span>
            </Button>
            <LinkButton
              href={calculatorPath(AppId.Housing)}
              size={ButtonSize.Sm}
              variant={ButtonVariant.Secondary}
            >
              Home Purchase Planner
            </LinkButton>
          </div>
        </header>

        {/* Row 2: Hairline Workspace Bar + One-Click KfW 300 Preset Switcher */}
        <div className="mw-workspace-bar">
          <div className="mw-workspace-tabs" role="tablist" aria-label="Mortgage simulator views">
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === MortgageResultsTab.Overview}
              className={`mw-workspace-tab${activeTab === MortgageResultsTab.Overview ? " mw-workspace-tab--active" : ""}`}
              onClick={() => setActiveTab(MortgageResultsTab.Overview)}
            >
              Overview &amp; Charts
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === MortgageResultsTab.Ledger}
              className={`mw-workspace-tab${activeTab === MortgageResultsTab.Ledger ? " mw-workspace-tab--active" : ""}`}
              onClick={() => setActiveTab(MortgageResultsTab.Ledger)}
            >
              Repayment Ledger ({years}y)
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === MortgageResultsTab.Affordability}
              className={`mw-workspace-tab${activeTab === MortgageResultsTab.Affordability ? " mw-workspace-tab--active" : ""}`}
              onClick={() => setActiveTab(MortgageResultsTab.Affordability)}
            >
              Affordability
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === MortgageResultsTab.KfwGuide}
              className={`mw-workspace-tab${activeTab === MortgageResultsTab.KfwGuide ? " mw-workspace-tab--active" : ""}`}
              onClick={() => setActiveTab(MortgageResultsTab.KfwGuide)}
            >
              KfW 300 Guide &amp; Formulas
            </button>
          </div>

          <div className="mw-quick-presets" role="group" aria-label="Quick KfW 300 presets">
            <span className="mw-quick-presets__label">KfW 300:</span>
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
            <button
              type="button"
              className={`mortgage-chip${kfwPrincipal === 0 ? " mortgage-chip--active" : ""}`}
              onClick={() => handleKfwPrincipalChange(0)}
            >
              No KfW
            </button>
          </div>
        </div>

        {/* Status Banners */}
        {hasInvalidFields && (
          <StatusBanner tone={BannerTone.Warning} title="Some inputs need attention">
            Open Edit Loans &amp; Budget to correct highlighted fields. Results below use the last valid values.
          </StatusBanner>
        )}

        {transferred && (
          <StatusBanner
            tone={BannerTone.Info}
            title="Loaded financing figures from the Home Purchase Planner"
            actions={(
              <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={() => openDrawer(DrawerSection.Kfw)}>
                Adjust KfW Offer Rate
              </Button>
            )}
          >
            {kfwPrincipal > 0
              ? `Bank loan (${formatEur(principal)}) and KfW 300 loan (${formatEur(kfwPrincipal)}) transferred with editable illustrative KfW 300 defaults.`
              : `Bank loan (${formatEur(principal)}) and purchase costs transferred from your Home Purchase Planner.`}
          </StatusBanner>
        )}

        {kfwPrincipal > 0 && kfwUsingIllustrativeRate && (
          <StatusBanner
            tone={BannerTone.Warning}
            title={`Using illustrative KfW 300 rate (${kfwInterest?.toFixed(2)}% nominal, ${kfwTerm}y term, ${method === LoanMethod.Balloon ? "balloon" : `${kfwGrace}y grace`})`}
            actions={(
              <>
                <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={() => openDrawer(DrawerSection.Kfw)}>
                  Enter Your KfW Rate
                </Button>
                <LawRefLink lawId={LawId.KfW_300} label="Official KfW 300" />
              </>
            )}
          >
            KfW 300 interest rates change periodically and are typically fixed for 10 years. Replace the nominal rate with your actual bank offer.
          </StatusBanner>
        )}

        {/* Full-Width 4-Card KPI Strip */}
        <div className="mw-kpi-grid">
          <MetricCard
            label="Total Borrowed"
            value={formatEurWhole(totalDebt)}
            subtitle={`Bank ${formatEurWhole(principal)} + KfW ${formatEurWhole(kfwPrincipal)}`}
            tone={MetricTone.Primary}
          />
          <MetricCard
            label="Starting Monthly Payment"
            value={monthly === null ? "Enter KfW terms" : `${formatEur(monthly)}/mo`}
            subtitle={monthly === null
              ? "Complete KfW rate, term & grace years"
              : `Bank ${formatEur(bank.monthlyPayment)} + KfW ${formatEur(kfw?.initialMonthlyPayment ?? 0)}`}
          />
          {afterGrace !== null ? (
            <MetricCard
              label={`After Year ${kfwGrace} (Post-Grace)`}
              value={`${formatEur(afterGrace)}/mo`}
              subtitle={`Bank ${formatEur(bankAtGraceEnd.paidOff ? 0 : bank.monthlyPayment)} + KfW ${formatEur(kfw?.laterMonthlyPayment ?? 0)}`}
              tone={laterAffordability && laterAffordability.remainingAfterLoans < 0 ? MetricTone.Loss : MetricTone.Neutral}
            />
          ) : (
            <MetricCard
              label="Loan-to-Value (LTV)"
              value={ltv === null ? "Set property price" : `${(ltv * 100).toFixed(1)}%`}
              subtitle="Both loans ÷ purchase price"
              footer={<TopicHelp id="loan-to-value" />}
            />
          )}
          <MetricCard
            label={`Total Interest (${years} yrs)`}
            value={formatEurWhole(combinedInterest)}
            subtitle={kfwInterestDifference !== null && kfwInterestDifference > 0
              ? `Saves ~${formatEurWhole(kfwInterestDifference)} vs. bank rate`
              : ltv !== null ? `LTV ${(ltv * 100).toFixed(1)}%` : "Over selected horizon"}
            tone={kfwInterestDifference !== null && kfwInterestDifference > 0 ? MetricTone.Gain : MetricTone.Neutral}
          />
        </div>

        {/* Tab 1: Overview & Charts */}
        {activeTab === MortgageResultsTab.Overview && (
          <>
            {schedule && (
              <MortgageChartsPanel
                schedule={schedule}
                termSensitivity={termSensitivity}
                hasKfw={kfwPrincipal > 0}
              />
            )}

            <div className="mw-two-col">
              <section className="ui-card mortgage-results">
                <h2>Repayment Summary ({years} Years)</h2>
                {kfwPrincipal > 0 && !complete && (
                  <p role="status">
                    Open <strong>Edit Loans &amp; Budget</strong> to enter the KfW interest rate, term, and grace period.
                  </p>
                )}
                {kfw && (
                  <>
                    <p>
                      KfW starts at <strong>{formatEur(kfw.initialMonthlyPayment)}/mo</strong>
                      {afterGrace !== null && (
                        <>
                          ; after {kfwGrace} interest-only {kfwGrace === 1 ? "year" : "years"}, its regular payment rises to{" "}
                          <strong>{formatEur(kfw.laterMonthlyPayment)}/mo</strong> (combined{" "}
                          <strong>{formatEur(afterGrace)}/mo</strong>)
                        </>
                      )}.
                    </p>
                    {method === LoanMethod.Balloon && (
                      <p role="status">
                        Monthly KfW payment covers interest only. The full <strong>{formatEur(kfwPrincipal)}</strong> principal is due at the end of year {kfwTerm}.
                      </p>
                    )}
                    <p>
                      Combined payments over {years} years:{" "}
                      <strong>{formatEur(principal - bank.balance + bank.interestPaid + kfw.totalPaid)}</strong> · Remaining debt:{" "}
                      <strong>{formatEur(bank.balance + kfw.balance)}</strong> (Bank {formatEur(bank.balance)} + KfW {formatEur(kfw.balance)}).
                    </p>
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
                    Bank base payment: <strong>{formatEur(bank.baseMonthlyPayment)}/mo</strong>
                    {extraPayment > 0 && <> plus <strong>{formatEur(extraPayment)}/mo</strong> extra principal</>}.{" "}
                    {bankFull.paidOff
                      ? `Estimated bank payoff in ${bankFull.elapsedMonths} months (${(bankFull.elapsedMonths / 12).toFixed(1)} years).`
                      : "Bank debt remains after 50 years."}
                  </p>
                )}
              </section>

              <section className="ui-card mortgage-results">
                <h2>KfW 300 &amp; Extra Payment Impact</h2>
                {kfwInterestDifference !== null ? (
                  <p>
                    Compared with borrowing the same {formatEurWhole(kfwPrincipal)} KfW amount at your commercial bank rate ({interest.toFixed(2)}%) with the same term and repayment structure, KfW 300 interest is{" "}
                    <strong>
                      {kfwInterestDifference >= 0
                        ? `${formatEur(kfwInterestDifference)} lower`
                        : `${formatEur(-kfwInterestDifference)} higher`}
                    </strong>{" "}
                    over {years} years.
                  </p>
                ) : (
                  <p>Enable a KfW 300 loan amount using the presets above or in Edit Loans &amp; Budget to compare subsidized interest savings.</p>
                )}
                {bankWithoutExtra?.paidOff && bankFull.paidOff && (
                  <p>
                    Your {formatEur(extraPayment)}/mo extra bank payment pays off the bank loan{" "}
                    <strong>{bankWithoutExtra.elapsedMonths - bankFull.elapsedMonths} months sooner</strong> and saves{" "}
                    <strong>{formatEur(bankWithoutExtra.interestPaid - bankFull.interestPaid)}</strong> in interest.
                  </p>
                )}
                {bank.balanceIncreasing && <p role="status">The bank payment does not cover interest, so its balance grows.</p>}
                <p className="mortgage-muted">
                  Figures assume full disbursement at start and fixed nominal rates across the projection. Post-Zinsbindung refinancing, fees, and unscheduled KfW prepayments are excluded.
                </p>
              </section>
            </div>
          </>
        )}

        {/* Tab 2: Full-Width Expandable Repayment Ledger */}
        {activeTab === MortgageResultsTab.Ledger && (
          schedule ? (
            <MortgageLedgerPanel schedule={schedule} hasKfw={kfwPrincipal > 0} />
          ) : (
            <section className="ui-card mortgage-results">
              <h2>Repayment Ledger</h2>
              <p role="status">Enter the KfW interest rate, term, and grace period in Edit Loans &amp; Budget to generate the ledger.</p>
            </section>
          )
        )}

        {/* Tab 3: Affordability */}
        {activeTab === MortgageResultsTab.Affordability && (
          <div className="mw-two-col">
            <section className="ui-card mortgage-results" aria-labelledby="affordability-results">
              <div className="mortgage-section-header">
                <h2 id="affordability-results">Monthly Cash-Flow Check</h2>
                <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={() => openDrawer(DrawerSection.Budget)}>
                  Edit Budget
                </Button>
              </div>
              {affordability ? (
                <>
                  <p>
                    Available before loans (after spending &amp; home running costs):{" "}
                    <strong>{formatEur(affordability.availableBeforeLoans)}/mo</strong>.
                  </p>
                  <p>
                    Left after starting loan payments ({formatEur(monthly ?? 0)}/mo):{" "}
                    <strong>{formatEur(affordability.remainingAfterLoans)}/mo</strong>
                    {affordability.loanPaymentShare !== null && (
                      <> · {(affordability.loanPaymentShare * 100).toFixed(1)}% of net income</>
                    )}.
                  </p>
                  {laterAffordability && afterGrace !== null && (
                    <p>
                      After KfW grace period (total {formatEur(afterGrace)}/mo):{" "}
                      <strong>{formatEur(laterAffordability.remainingAfterLoans)}/mo</strong> left
                      {laterAffordability.loanPaymentShare !== null && (
                        <> · {(laterAffordability.loanPaymentShare * 100).toFixed(1)}% of net income</>
                      )}.
                    </p>
                  )}
                  {affordability.remainingAfterLoans < 0 && (
                    <p role="status">The entered budget has a monthly shortfall at the starting payment.</p>
                  )}
                  {laterAffordability && laterAffordability.remainingAfterLoans < 0 && (
                    <p role="status">Warning: Once the KfW interest-only period ends, combined payments exceed your monthly budget.</p>
                  )}
                </>
              ) : (
                <p>Open Edit Budget to enter household net income, other spending, and home running costs.</p>
              )}
            </section>

            <section className="ui-card mortgage-results">
              <h2>Maximum Supported Purchase Budget</h2>
              {affordableBank !== null ? (
                <>
                  <p>
                    Maximum commercial bank loan supported by your remaining budget (after expenses, home costs, extra payment, and post-grace KfW payment):{" "}
                    <strong>{formatEur(affordableBank)}</strong>.
                  </p>
                  {affordablePrice !== null ? (
                    <p>
                      Combined with your savings ({formatEurWhole(savings ?? 0)}), closing costs ({formatEurWhole(closingCosts ?? 0)}), and KfW 300 loan ({formatEurWhole(kfwPrincipal)}), your estimated maximum property price is{" "}
                      <strong>{formatEur(affordablePrice)}</strong>.
                    </p>
                  ) : (
                    <p>Enter savings and closing costs in Edit Loans &amp; Budget to estimate a maximum property price.</p>
                  )}
                </>
              ) : (
                <p>
                  {availableForBank !== null && availableForBank < 0
                    ? "The KfW payment and extra bank payment exceed your available monthly budget."
                    : "Enter household budget and a positive bank rate to calculate your maximum supported loan."}
                </p>
              )}
              {method === LoanMethod.Balloon && kfwPrincipal > 0 && (
                <p>Note: Monthly budget does not include saving separately for the KfW balloon lump sum.</p>
              )}
              <p className="mortgage-muted">Cash-flow estimate only, not a formal bank lending decision.</p>
            </section>
          </div>
        )}

        {/* Tab 4: KfW 300 Guide & Formulas */}
        {activeTab === MortgageResultsTab.KfwGuide && (
          <Kfw300GuidePanel context="mortgage" />
        )}
      </div>

      {/* Slide-Over Inputs Drawer (Concept A — mirrors LifePlanInputsDrawer) */}
      {drawerOpen && (
        <div
          className="mw-drawer-backdrop"
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDrawerOpen(false);
            }
          }}
        >
          <aside className="mw-drawer" role="dialog" aria-modal="true" aria-label="Edit loans and budget">
            <div className="mw-drawer__header">
              <h2 className="mw-drawer__title">Edit Loans &amp; Budget</h2>
              <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={() => setDrawerOpen(false)}>
                <DismissIcon size={13} />
                <span>Done</span>
              </Button>
            </div>

            <div className="mw-drawer__tabs" role="tablist" aria-label="Input sections">
              {(
                [
                  { id: DrawerSection.All,
                    label: "All" },
                  { id: DrawerSection.Bank,
                    label: "Property & Bank" },
                  { id: DrawerSection.Kfw,
                    label: "KfW 300" },
                  { id: DrawerSection.Budget,
                    label: "Budget" },
                ] as const
              ).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={drawerSection === item.id}
                  className={`mortgage-chip${drawerSection === item.id ? " mortgage-chip--active" : ""}`}
                  onClick={() => setDrawerSection(item.id)}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mw-drawer__body">
              {(drawerSection === DrawerSection.All || drawerSection === DrawerSection.Bank) && (
                <section className="mw-drawer__section">
                  <div className="mw-drawer__section-head">
                    <h3>Property &amp; Commercial Bank Loan</h3>
                  </div>
                  <div className="mw-drawer__grid">
                    <OptionalNumberInput id="mortgage-value" topicId="loan-to-value" onValidityChange={trackValidity("mortgage-value")} label="Property price / value" unit="€" min={0} max={20000000} placeholder="Enter value" value={propertyPrice} onChange={setPropertyPrice} />
                    <OptionalNumberInput id="mortgage-savings" onValidityChange={trackValidity("mortgage-savings")} label="Available savings" unit="€" min={0} max={20000000} placeholder="Enter savings" value={savings} onChange={setSavings} />
                    <OptionalNumberInput id="mortgage-closing-costs" topicId="purchase-costs" onValidityChange={trackValidity("mortgage-closing-costs")} label="Closing costs" unit="€" min={0} max={20000000} placeholder="Enter costs" value={closingCosts} onChange={setClosingCosts} />
                    <NumberField id="mortgage-principal" topicId="bank-loan-amount" onValidityChange={trackValidity("mortgage-principal")} label="Bank loan (excl. KfW)" unit="€" min={0} max={20000000} step={5000} value={principal} onChange={setPrincipal} />
                    <NumberField id="mortgage-interest" onValidityChange={trackValidity("mortgage-interest")} label="Bank interest rate" topicId="mortgage-repayment" unit="%" min={0} max={15} step={0.1} value={interest} onChange={setInterest} />
                    {bankMode === BankPaymentMode.InitialRepayment
                      ? <NumberField id="mortgage-repayment" onValidityChange={trackValidity("mortgage-repayment")} label="Initial repayment" topicId="mortgage-repayment" unit="%" min={0} max={20} step={0.25} value={repayment} onChange={setRepayment} />
                      : <NumberField id="mortgage-bank-term" topicId="mortgage-payoff-term" onValidityChange={trackValidity("mortgage-bank-term")} label="Target payoff term" unit="years" min={1} max={50} step={1} value={bankTerm} construct={toMortgageYears} onChange={setBankTerm} />}
                    <NumberField id="mortgage-extra" topicId="extra-bank-payment" onValidityChange={trackValidity("mortgage-extra")} label="Extra principal / mo" unit="€" min={0} max={1000000} step={50} value={extraPayment} onChange={setExtraPayment} />
                    <NumberField id="mortgage-years" onValidityChange={trackValidity("mortgage-years")} label="Projection horizon" unit="years" min={1} max={50} step={1} value={years} construct={toMortgageYears} onChange={setYears} />
                  </div>
                  <div>
                    <p className="mortgage-preset-label">Bank repayment mode</p>
                    <SegmentedControl compact label="Bank repayment setup" value={bankMode} options={BANK_MODES} onChange={setBankMode} />
                  </div>
                </section>
              )}

              {(drawerSection === DrawerSection.All || drawerSection === DrawerSection.Kfw) && (
                <section className="mw-drawer__section">
                  <div className="mw-drawer__section-head">
                    <h3>KfW 300 Family Loan</h3>
                    {kfwPrincipal > 0 && kfwUsingIllustrativeRate && (
                      <Badge tone={BadgeTone.Warning}>Illustrative rate</Badge>
                    )}
                  </div>
                  <div className="mortgage-preset-group">
                    <span className="mortgage-preset-label">Quick KfW 300 loan cap</span>
                    <div className="mortgage-chip-row">
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

                  <div className="mw-drawer__grid">
                    <NumberField id="mortgage-kfw-amount" onValidityChange={trackValidity("mortgage-kfw-amount")} label="KfW loan amount" unit="€" min={0} max={20000000} step={5000} value={kfwPrincipal} onChange={handleKfwPrincipalChange} />
                    {kfwPrincipal > 0 && (
                      <OptionalNumberInput
                        id="mortgage-kfw-rate"
                        topicId="kfw-repayment-options"
                        onValidityChange={trackValidity("mortgage-kfw-rate")}
                        label="KfW nominal rate"
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
                    )}
                    {kfwPrincipal > 0 && (
                      <OptionalNumberInput
                        id="mortgage-kfw-term"
                        topicId="kfw-repayment-options"
                        onValidityChange={trackValidity("mortgage-kfw-term")}
                        label="KfW total term"
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
                    )}
                    {kfwPrincipal > 0 && method === LoanMethod.Annuity && (
                      <OptionalNumberInput
                        id="mortgage-kfw-grace"
                        topicId="kfw-repayment-options"
                        onValidityChange={trackValidity("mortgage-kfw-grace")}
                        label="Interest-only years"
                        unit="years"
                        min={0}
                        max={49}
                        step={1}
                        placeholder="1–5"
                        value={kfwGrace}
                        onChange={(value) => {
                          if (value !== undefined) {
                            toGraceYears(value);
                          }
                          setKfwGrace(value);
                        }}
                      />
                    )}
                  </div>

                  {kfwPrincipal > 0 && (
                    <>
                      <div className="mortgage-preset-group">
                        <span className="mortgage-preset-label">Standard KfW 300 presets</span>
                        <div className="mortgage-chip-row">
                          {KFW_300_PRESETS.map((preset) => (
                            <button
                              key={preset.id}
                              type="button"
                              className={`mortgage-chip${activePresetId === preset.id ? " mortgage-chip--active" : ""}`}
                              onClick={() => applyKfwPreset(preset)}
                            >
                              {preset.shortLabel}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="mortgage-preset-label">Repayment type</p>
                        <SegmentedControl compact topicId="kfw-repayment-options" label="KfW repayment type" value={method} options={METHODS} onChange={setMethod} />
                      </div>
                      {!validGrace && validTerm && kfwGrace !== undefined && (
                        <p role="alert">The interest-only period must be shorter than the KfW term.</p>
                      )}
                    </>
                  )}
                </section>
              )}

              {(drawerSection === DrawerSection.All || drawerSection === DrawerSection.Budget) && (
                <section className="mw-drawer__section">
                  <div className="mw-drawer__section-head">
                    <h3>Monthly Household Budget</h3>
                    <TopicHelp id="mortgage-affordability" />
                  </div>
                  <div className="mw-drawer__grid">
                    <OptionalNumberInput id="mortgage-income" onValidityChange={trackValidity("mortgage-income")} label="Net income / mo" unit="€" min={0} max={10000000} placeholder="Enter income" value={income} onChange={setIncome} />
                    <OptionalNumberInput id="mortgage-expenses" onValidityChange={trackValidity("mortgage-expenses")} label="Other spending / mo" unit="€" min={0} max={10000000} placeholder="Enter spending" value={expenses} onChange={setExpenses} />
                    <OptionalNumberInput id="mortgage-running-costs" onValidityChange={trackValidity("mortgage-running-costs")} label="Home running costs / mo" unit="€" min={0} max={10000000} placeholder="Enter costs" value={housingCosts} onChange={setHousingCosts} />
                  </div>
                </section>
              )}
            </div>

            <div className="mw-drawer__footer">
              <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={resetDefaults}>
                <ResetDefaultsIcon size={13} />
                <span>Reset defaults</span>
              </Button>
              <Button size={ButtonSize.Sm} variant={ButtonVariant.Primary} onClick={() => setDrawerOpen(false)}>
                Apply &amp; Close
              </Button>
            </div>
          </aside>
        </div>
      )}
    </AppShell>
  );
}
