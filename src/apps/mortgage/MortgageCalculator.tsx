import "#/components/DomainCalculator.css";
import "./MortgageCalculator.css";
import {
  useEffect,
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
  mortgagePaymentForTerm,
  projectMortgage,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  takeMortgageHandoff,
} from "#/apps/mortgage/mortgageHandoff.ts";
import OptionalNumberInput from "#components/OptionalNumberInput";
import LawRefLink from "#components/laws/LawRefLink";
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
  LawId,
} from "#engine/laws/types";
import {
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  formatEur,
} from "#utils/currencyFormat";

const BankPaymentMode = { InitialRepayment: "initial-repayment",
  PayoffTerm: "payoff-term" } as const;
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

export default function MortgageCalculator(): JSX.Element {
  const [principal, setPrincipal] = useState(200000);
  const [interest, setInterest] = useState(3.6);
  const [repayment, setRepayment] = useState(2);
  const [bankMode, setBankMode] = useState<BankPaymentMode>(BankPaymentMode.InitialRepayment);
  const [bankTerm, setBankTerm] = useState(30);
  const [extraPayment, setExtraPayment] = useState(0);
  const [propertyPrice, setPropertyPrice] = useState<number | undefined>();
  const [savings, setSavings] = useState<number | undefined>();
  const [closingCosts, setClosingCosts] = useState<number | undefined>();
  const [kfwPrincipal, setKfwPrincipal] = useState(0);
  const [kfwInterest, setKfwInterest] = useState<number | undefined>();
  const [kfwTerm, setKfwTerm] = useState<number | undefined>();
  const [kfwGrace, setKfwGrace] = useState<number | undefined>();
  const [method, setMethod] = useState<LoanRepaymentMethod>(LoanMethod.Annuity);
  const [years, setYears] = useState(10);
  const [income, setIncome] = useState<number | undefined>();
  const [expenses, setExpenses] = useState<number | undefined>();
  const [housingCosts, setHousingCosts] = useState<number | undefined>();
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

  useEffect(() => {
    try {
      const input = takeMortgageHandoff(window.sessionStorage);
      if (input) {
        setPrincipal(input.principal);
        setInterest(input.annualInterest * 100);
        setRepayment(input.initialRepayment * 100);
        setKfwPrincipal(input.kfwPrincipal);
        setPropertyPrice(input.propertyPrice);
        setSavings(input.savings);
        setClosingCosts(input.closingCosts);
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

  if (!ready) {
    return <AppShell currentPath={calculatorPath(AppId.Mortgage)}><PageHeader eyebrow="Home financing" title="Mortgage Simulator & Affordability" /><p role="status">Loading financing details…</p></AppShell>;
  }

  const horizon = toMortgageYears(years);
  const bankPrincipal = toEuroAmount(principal);
  const bankRate = toPercentageRate(interest / 100);
  const bankRepayment = toPercentageRate(repayment / 100);
  const basePayment = bankMode === BankPaymentMode.PayoffTerm ? mortgagePaymentForTerm(bankPrincipal, bankRate, toMortgageYears(bankTerm)) : undefined;
  const bankOptions = { extraMonthlyPayment: toEuroAmount(extraPayment),
    baseMonthlyPayment: basePayment };
  const bank = projectMortgage(bankPrincipal, bankRate, bankRepayment, horizon, bankOptions);
  const bankFull = projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(50), bankOptions);
  const bankWithoutExtra = extraPayment > 0 ? projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(50), { baseMonthlyPayment: basePayment }) : null;
  const totalDebt = toEuroAmount(principal + kfwPrincipal);
  const ltv = propertyPrice === undefined ? null : calculatePurchaseLtv(totalDebt, toEuroAmount(propertyPrice));
  const validTerm = kfwTerm !== undefined && Number.isInteger(kfwTerm) && kfwTerm >= 1 && kfwTerm <= 50;
  const validGrace = method === LoanMethod.Balloon || (validTerm && kfwGrace !== undefined && kfwGrace < kfwTerm);
  const kfwTerms = kfwPrincipal > 0 && kfwInterest !== undefined && validTerm && validGrace ? {
    principal: toEuroAmount(kfwPrincipal),
    annualInterest: toPercentageRate(kfwInterest / 100),
    term: toMortgageYears(kfwTerm),
    grace: toGraceYears(method === LoanMethod.Balloon ? 0 : (kfwGrace ?? 0)),
    method,
  } : null;
  const kfw = kfwTerms ? projectKfwLoan(kfwTerms, horizon) : null;
  const complete = kfwPrincipal === 0 || kfw !== null;
  const monthly = complete ? bank.monthlyPayment + (kfw?.initialMonthlyPayment ?? 0) : null;
  const affordability = monthly !== null && income !== undefined && expenses !== undefined && housingCosts !== undefined
    ? estimateAffordability(toEuroAmount(income), toEuroAmount(expenses), toEuroAmount(housingCosts), toEuroAmount(monthly)) : null;
  const alternative = kfwTerms ? projectKfwLoan({ ...kfwTerms,
    annualInterest: toPercentageRate(interest / 100) }, horizon) : null;
  const kfwInterestDifference = alternative && kfw ? alternative.interestPaid - kfw.interestPaid : null;
  const bankAtGraceEnd = kfwGrace !== undefined && kfwGrace > 0 ? projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(kfwGrace), bankOptions) : bank;
  const kfwBudgetPayment = kfw ? Math.max(kfw.initialMonthlyPayment, kfw.laterMonthlyPayment) : 0;
  const availableForBank = affordability ? affordability.availableBeforeLoans - kfwBudgetPayment - extraPayment : null;
  const affordableBank = availableForBank === null ? null : bankMode === BankPaymentMode.PayoffTerm
    ? estimateAffordableBankLoanForTerm(toEuroAmount(availableForBank), bankRate, toMortgageYears(bankTerm))
    : estimateAffordableBankLoan(toEuroAmount(availableForBank), bankRate, bankRepayment);
  const affordablePrice = affordableBank !== null && savings !== undefined && closingCosts !== undefined
    ? Math.max(0, affordableBank + kfwPrincipal + savings - closingCosts) : null;
  const afterGrace = kfw && method === LoanMethod.Annuity && kfwGrace !== undefined && kfwGrace > 0
    ? (bankAtGraceEnd.paidOff ? 0 : bank.monthlyPayment) + kfw.laterMonthlyPayment : null;
  const laterAffordability = afterGrace !== null && income !== undefined && expenses !== undefined && housingCosts !== undefined
    ? estimateAffordability(toEuroAmount(income), toEuroAmount(expenses), toEuroAmount(housingCosts), toEuroAmount(afterGrace)) : null;

  return <AppShell currentPath={calculatorPath(AppId.Mortgage)}>
    <PageHeader eyebrow="Home financing" title="Mortgage Simulator & Affordability" subtitle="Explore your bank loan and KfW loan together, then compare the payments with your budget." />
    {transferred && <p role="status">Purchase price and estimated loan amounts loaded from the Home Purchase Planner. KfW is a loan you must repay; enter its terms below.</p>}
    <div className="domain-calc-layout">
      <div className="mortgage-inputs">
        <section className="ui-card" aria-labelledby="mortgage-property">
          <h2 id="mortgage-property">Property &amp; bank loan</h2>
          <div className="domain-calc-fields">
            <OptionalNumberInput id="mortgage-value" onValidityChange={trackValidity("mortgage-value")} label="Property purchase price / value" unit="€" min={0} max={20000000} placeholder="Enter value" value={propertyPrice} onChange={setPropertyPrice} />
            <OptionalNumberInput id="mortgage-savings" onValidityChange={trackValidity("mortgage-savings")} label="Savings available for purchase" unit="€" min={0} max={20000000} placeholder="Enter savings" value={savings} onChange={setSavings} />
            <OptionalNumberInput id="mortgage-closing-costs" onValidityChange={trackValidity("mortgage-closing-costs")} label="Estimated purchase costs" unit="€" min={0} max={20000000} placeholder="Enter costs" value={closingCosts} onChange={setClosingCosts} />
            <NumberField id="mortgage-principal" onValidityChange={trackValidity("mortgage-principal")} label="Bank loan amount" unit="€" min={0} max={20000000} step={5000} value={principal} onChange={setPrincipal} />
            <NumberField id="mortgage-interest" onValidityChange={trackValidity("mortgage-interest")} label="Bank annual interest rate" topicId="mortgage-repayment" unit="%" min={0} max={15} step={0.1} value={interest} onChange={setInterest} />
            <div><p>Bank repayment setup</p><SegmentedControl label="Bank repayment setup" value={bankMode} options={BANK_MODES} onChange={setBankMode} /></div>
            {bankMode === BankPaymentMode.InitialRepayment ? <NumberField id="mortgage-repayment" onValidityChange={trackValidity("mortgage-repayment")} label="Bank initial annual repayment" topicId="mortgage-repayment" unit="%" min={0} max={20} step={0.25} value={repayment} onChange={setRepayment} /> : <NumberField id="mortgage-bank-term" onValidityChange={trackValidity("mortgage-bank-term")} label="Target bank payoff term" unit="years" min={1} max={50} step={1} value={bankTerm} construct={toMortgageYears} onChange={setBankTerm} />}
            <NumberField id="mortgage-extra" onValidityChange={trackValidity("mortgage-extra")} label="Extra bank principal payment" unit="€/month" min={0} max={1000000} step={50} value={extraPayment} onChange={setExtraPayment} />
            <NumberField id="mortgage-years" onValidityChange={trackValidity("mortgage-years")} label="Show projection for" unit="years" min={1} max={50} step={1} value={years} construct={toMortgageYears} onChange={setYears} />
          </div>
        </section>
        <section className="ui-card" aria-labelledby="mortgage-kfw">
          <h2 id="mortgage-kfw">KfW loan</h2>
          <p>KfW financing is borrowed money. Enter the nominal interest rate and term from your offer; no rate is assumed.</p>
          <LawRefLink lawId={LawId.KfW_300} label="KfW 300 program and official terms" />
          <div className="domain-calc-fields">
            <NumberField id="mortgage-kfw-amount" onValidityChange={trackValidity("mortgage-kfw-amount")} label="KfW loan amount" unit="€" min={0} max={20000000} step={5000} value={kfwPrincipal} onChange={setKfwPrincipal} />
            {kfwPrincipal > 0 && <>
              <OptionalNumberInput id="mortgage-kfw-rate" onValidityChange={trackValidity("mortgage-kfw-rate")} label="KfW nominal annual interest rate" unit="%" min={0} max={15} step={0.01} placeholder="Enter offer rate" value={kfwInterest} onChange={setKfwInterest} />
              <OptionalNumberInput id="mortgage-kfw-term" onValidityChange={trackValidity("mortgage-kfw-term")} label="KfW total loan term" unit="years" min={1} max={50} step={1} placeholder="Enter term" value={kfwTerm} onChange={(value) => {
                if (value !== undefined) {
                  toMortgageYears(value);
                }
                setKfwTerm(value);
              }} />
              <div><p>Repayment type</p><SegmentedControl label="KfW repayment type" value={method} options={METHODS} onChange={setMethod} /></div>
              {method === LoanMethod.Annuity && <OptionalNumberInput id="mortgage-kfw-grace" onValidityChange={trackValidity("mortgage-kfw-grace")} label="Interest-only period" unit="years" min={0} max={49} step={1} placeholder="Enter years" value={kfwGrace} onChange={(value) => {
                if (value !== undefined) {
                  toGraceYears(value);
                }
                setKfwGrace(value);
              }} />}
              {!validGrace && validTerm && kfwGrace !== undefined && <p role="alert">The interest-only period must be shorter than the KfW term.</p>}
            </>}
          </div>
        </section>
        <section className="ui-card" aria-labelledby="mortgage-budget">
          <h2 id="mortgage-budget">Monthly affordability</h2>
          <p>Enter your own monthly amounts. Exclude the loans modeled here from expenses to avoid counting them twice.</p>
          <div className="domain-calc-fields">
            <OptionalNumberInput id="mortgage-income" onValidityChange={trackValidity("mortgage-income")} label="Household income after tax" unit="€/month" min={0} max={10000000} placeholder="Enter income" value={income} onChange={setIncome} />
            <OptionalNumberInput id="mortgage-expenses" onValidityChange={trackValidity("mortgage-expenses")} label="Other spending and existing debts" unit="€/month" min={0} max={10000000} placeholder="Enter spending" value={expenses} onChange={setExpenses} />
            <OptionalNumberInput id="mortgage-running-costs" onValidityChange={trackValidity("mortgage-running-costs")} label="Home running costs and maintenance reserve" unit="€/month" min={0} max={10000000} placeholder="Enter costs" value={housingCosts} onChange={setHousingCosts} />
          </div>
        </section>
      </div>
      <div className="domain-calc-results">
        {hasInvalidFields && <p role="alert">Correct the highlighted inputs. Results below use the last valid values.</p>}
        <div className="domain-calc-kpis">
          <MetricCard label="Total borrowed" value={formatEur(totalDebt)} subtitle={`Bank ${formatEur(principal)} + KfW ${formatEur(kfwPrincipal)}`} tone={MetricTone.Primary} />
          <MetricCard label="Loan-to-value" value={ltv === null ? "Enter property value" : `${(ltv * 100).toFixed(1)}%`} subtitle="Both loans ÷ entered purchase price / value" />
          <MetricCard label="Starting monthly loan payments" value={monthly === null ? "Enter KfW terms" : formatEur(monthly)} subtitle={monthly === null ? "Bank and KfW together require your KfW repayment terms" : `Bank ${formatEur(bank.monthlyPayment)} (including extra) + KfW ${formatEur(kfw?.initialMonthlyPayment ?? 0)}`} />
        </div>
        <section className="ui-card mortgage-results">
          <h2>What you repay</h2>
          <p>Your total debt includes both loans. Loan-to-value uses the entered purchase price, not the bank's valuation; buying costs can make it exceed 100%.</p>
          {kfwPrincipal > 0 && !complete && <p role="status">Enter the KfW interest rate, term and, for monthly repayment, interest-only period to see combined payments, interest, balance and affordability.</p>}
          {kfw && <>
            <p>KfW starts at <strong>{formatEur(kfw.initialMonthlyPayment)}/month</strong>{afterGrace !== null && <>; after {kfwGrace} interest-only {kfwGrace === 1 ? "year" : "years"}, its regular payment becomes <strong>{formatEur(kfw.laterMonthlyPayment)}/month</strong> and both loans together are estimated at <strong>{formatEur(afterGrace)}/month</strong></>}.</p>
            {method === LoanMethod.Balloon && <p role="status">The KfW payment above covers interest only. The entire <strong>{formatEur(kfwPrincipal)}</strong> principal is due as a lump sum at the end of year {kfwTerm}.</p>}
            <p>Over the selected {years} years: estimated combined interest <strong>{formatEur(bank.interestPaid + kfw.interestPaid)}</strong>; combined payments <strong>{formatEur(principal - bank.balance + bank.interestPaid + kfw.totalPaid)}</strong>; remaining debt <strong>{formatEur(bank.balance + kfw.balance)}</strong>.</p>
            {kfwInterestDifference !== null && <p>Compared with borrowing the same KfW amount at your bank rate, with the <em>same term and repayment structure</em>, estimated KfW interest is {kfwInterestDifference >= 0 ? `${formatEur(kfwInterestDifference)} lower` : `${formatEur(-kfwInterestDifference)} higher`} over this period. This is an interest comparison, not a grant or a complete offer comparison.</p>}
          </>}
          {kfwPrincipal === 0 && <p>Over {years} years: estimated bank interest <strong>{formatEur(bank.interestPaid)}</strong>; remaining bank debt <strong>{formatEur(bank.balance)}</strong>.</p>}
          {principal > 0 && <p>Bank base payment: <strong>{formatEur(bank.baseMonthlyPayment)}/month</strong>{extraPayment > 0 && <> plus <strong>{formatEur(extraPayment)}/month</strong> extra principal</>}. {bankFull.paidOff ? `Estimated bank payoff after ${bankFull.elapsedMonths} months` : "Bank debt remains after 50 years"}, assuming the entered rates and payments stay unchanged. The final payment can be smaller.</p>}
          {bankWithoutExtra?.paidOff && bankFull.paidOff && <p>Compared with no extra bank payment, this scenario repays the bank loan {bankWithoutExtra.elapsedMonths - bankFull.elapsedMonths} months sooner and pays approximately {formatEur(bankWithoutExtra.interestPaid - bankFull.interestPaid)} less bank interest over the full payoff period.</p>}
          {bankWithoutExtra && !bankWithoutExtra.paidOff && bankFull.paidOff && <p>Without extra payments, the bank loan still has an estimated balance of {formatEur(bankWithoutExtra.balance)} after 50 years.</p>}
          {bank.balanceIncreasing && <p role="status">The bank payment does not cover interest, so its balance grows.</p>}
          {!bank.paidOff && !bank.balanceIncreasing && principal > 0 && bankMode === BankPaymentMode.InitialRepayment && repayment === 0 && extraPayment === 0 && <p role="status">The bank loan has no initial principal repayment, so the balance may remain outstanding.</p>}
          <p>This scenario does not verify which term, grace period or repayment type KfW currently offers. Figures assume both loans are fully paid out at the start and use fixed nominal rates for the entire projection. Bank extra payments are a scenario assumption; check whether your contract permits them. KfW extra payments, fees, disbursement timing, rate changes and refinancing are excluded. KfW terms vary by offer; the last payment may differ due to rounding. A fixed-rate period may end before the loan does.</p>
        </section>
        <section className="ui-card mortgage-results" aria-labelledby="affordability-results">
          <h2 id="affordability-results">Affordability estimate</h2>
          {affordability ? <>
            <p>Available after your spending and home costs, before these loans: <strong>{formatEur(affordability.availableBeforeLoans)}/month</strong>.</p>
            <p>Left after starting loan payments: <strong>{formatEur(affordability.remainingAfterLoans)}/month</strong>{affordability.loanPaymentShare !== null && <> · loan payments are {(affordability.loanPaymentShare * 100).toFixed(1)}% of your net income</>}.</p>
            {laterAffordability && <p>After the KfW interest-only period, estimated amount left: <strong>{formatEur(laterAffordability.remainingAfterLoans)}/month</strong>.</p>}
            {affordability.remainingAfterLoans < 0 && <p role="status">The entered budget has a monthly shortfall at the starting payment.</p>}
            {affordableBank !== null && <p>Using all income remaining after your entered expenses, home costs, your extra bank payment and the larger regular KfW payment, the estimated bank loan supported by that payment budget is <strong>{formatEur(affordableBank)}</strong>. {affordablePrice !== null ? <>With the entered savings, fixed purchase costs and KfW loan, that gives an estimated purchase budget of <strong>{formatEur(affordablePrice)}</strong>.</> : "Enter savings and purchase costs to estimate a purchase budget."}</p>}
            {affordableBank === null && availableForBank !== null && <p>{availableForBank < 0 ? "The KfW payment and extra bank payment exceed the available monthly budget." : "Enter a positive bank interest or repayment rate to estimate a maximum loan."}</p>}
            <p>The purchase budget assumes the entered KfW loan stays available and purchase costs stay fixed. It uses all remaining monthly cash unless you include a buffer in your expenses; it does not check program eligibility, lender approval or future rate changes.</p>
            {method === LoanMethod.Balloon && kfwPrincipal > 0 && <p>The monthly budget and maximum loan do not include saving for the KfW lump sum.</p>}
            <p>This is your cash-flow estimate, not a bank affordability or lending decision. Include all recurring costs and reserves that matter to your household.</p>
          </> : <p>Enter net income, other spending and home running costs{!complete ? ", plus the KfW terms," : ""} to calculate the amount left each month.</p>}
        </section>
        {complete && <section className="ui-card mortgage-results">
          <h2>Year-by-year repayment</h2>
          <p>Principal, interest and payments are amounts paid during each year. Balances are shown at year end.</p>
          <div className="mortgage-table-wrap"><table className="domain-calc-table">
            <thead><tr><th>Year</th><th className="num">Bank balance</th><th className="num">KfW balance</th><th className="num">Total debt</th><th className="num">Principal repaid</th><th className="num">Interest paid</th><th className="num">Payments</th></tr></thead>
            <tbody>{Array.from({ length: years }, (_, index) => {
              const year = index + 1;
              const bankYear = projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(year), bankOptions);
              const previousBank = index > 0 ? projectMortgage(bankPrincipal, bankRate, bankRepayment, toMortgageYears(index), bankOptions) : null;
              const kfwYear = kfw?.yearly[index];
              const previousKfw = index > 0 ? kfw?.yearly[index - 1] : undefined;
              const principalPaid = (previousBank?.balance ?? principal) - bankYear.balance + (previousKfw?.balance ?? kfwPrincipal) - (kfwYear?.balance ?? 0);
              const interestPaid = bankYear.interestPaid - (previousBank?.interestPaid ?? 0) + (kfwYear?.interestPaid ?? 0) - (previousKfw?.interestPaid ?? 0);
              return <tr key={year}><th scope="row">{year}</th><td className="num">{formatEur(bankYear.balance)}</td><td className="num">{formatEur(kfwYear?.balance ?? 0)}</td><td className="num">{formatEur(bankYear.balance + (kfwYear?.balance ?? 0))}</td><td className="num">{formatEur(principalPaid)}</td><td className="num">{formatEur(interestPaid)}</td><td className="num">{formatEur(principalPaid + interestPaid)}</td></tr>;
            })}</tbody>
          </table></div>
        </section>}
        <a href={calculatorPath(AppId.Housing)}>Back to Home Purchase Planner</a>
      </div>
    </div>
  </AppShell>;
}
