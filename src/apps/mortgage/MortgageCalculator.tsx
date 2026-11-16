import "#/components/DomainCalculator.css";
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
  projectMortgage,
  toMortgageYears,
} from "#/apps/mortgage/mortgageCalculation.ts";
import {
  takeMortgageHandoff,
} from "#/apps/mortgage/mortgageHandoff.ts";
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
  toEuroAmount,
  toPercentageRate,
} from "#engine/types";
import {
  formatEur,
} from "#utils/currencyFormat";

export default function MortgageCalculator(): JSX.Element {
  const [principal, setPrincipal] = useState(200000);
  const [interest, setInterest] = useState(3.6);
  const [repayment, setRepayment] = useState(2);
  const [years, setYears] = useState(10);
  const [transferred, setTransferred] = useState(false);

  useEffect(() => {
    try {
      const input = takeMortgageHandoff(window.sessionStorage);
      if (input) {
        setPrincipal(input.principal);
        setInterest(input.annualInterest * 100);
        setRepayment(input.initialRepayment * 100);
        setTransferred(true);
      }
    }
    catch {
      // The calculator remains usable if tab storage is unavailable.
    }
  }, []);

  const result = projectMortgage(toEuroAmount(principal), toPercentageRate(interest / 100), toPercentageRate(repayment / 100), toMortgageYears(years));
  return <AppShell currentPath={calculatorPath(AppId.Mortgage)}>
    <PageHeader eyebrow="Home financing" title="Mortgage Calculator" subtitle="Explore the payment and balance of a single bank loan." />
    {transferred && <p role="status">Loan amount and rates loaded from the Home Purchase Planner. You can change them here.</p>}
    <div className="domain-calc-layout">
      <section className="ui-card" aria-labelledby="mortgage-inputs">
        <h2 id="mortgage-inputs">Your bank loan</h2>
        <div className="domain-calc-fields">
          <NumberField id="mortgage-principal" label="Amount borrowed" unit="€" min={0} max={10000000} step={5000} value={principal} onChange={setPrincipal} />
          <NumberField id="mortgage-interest" label="Annual interest rate" topicId="mortgage-repayment" unit="%" min={0} max={15} step={0.1} value={interest} onChange={setInterest} />
          <NumberField id="mortgage-repayment" label="Initial annual repayment rate" topicId="mortgage-repayment" unit="%" min={0} max={20} step={0.25} value={repayment} onChange={setRepayment} />
          <NumberField id="mortgage-years" label="Show balance after" unit="years" min={1} max={50} step={1} value={years} construct={toMortgageYears} onChange={setYears} />
        </div>
      </section>
      <div className="domain-calc-results">
        <div className="domain-calc-kpis">
          <MetricCard label="Estimated monthly payment" value={formatEur(result.monthlyPayment)} subtitle="Interest and principal together" tone={MetricTone.Primary} />
          <MetricCard label={result.paidOff ? "Loan paid off" : `Balance after ${years} years`} value={formatEur(result.balance)} subtitle={result.paidOff ? `After ${result.elapsedMonths} months; the final payment may be smaller` : "Amount still owed on this loan"} />
          <MetricCard label="Estimated interest paid" value={formatEur(result.interestPaid)} subtitle={result.paidOff ? "Until the loan is paid off" : `Over ${years} years`} />
        </div>
        <section className="ui-card">
          <h2>How this estimate works</h2>
          <p>The monthly payment starts at the loan amount multiplied by the combined annual interest and repayment rates, divided by 12. Interest is calculated monthly on the outstanding balance. The rate and regular payment stay fixed for the period shown.</p>
          <p>This covers the bank loan only. Any KfW loan needs its own terms and payments. Fees, special repayments, changes in rates and refinancing are not included.</p>
          {result.balanceIncreasing && <p role="status">The estimated payment does not cover the interest, so the balance grows.</p>}
          {!result.paidOff && !result.balanceIncreasing && repayment === 0 && <p role="status">With no principal repayment, the loan may not be paid off during this period.</p>}
          <a href={calculatorPath(AppId.Housing)}>Back to Home Purchase Planner</a>
        </section>
      </div>
    </div>
  </AppShell>;
}
