import AnnualIncomeBreakdown from "#components/AnnualIncomeBreakdown";
import {
  type JSX,
} from "preact";
import {
  type HouseholdScenarioData,
} from "#store/calculatorStore";

/** Salary-calculator evidence uses its own payment schedule, independently of simulator inputs. */
export default function CalculatorTaxableIncome({ data, id = "annual-taxable-income", editable = true }: { data: HouseholdScenarioData;
  id?: string;
  editable?: boolean }): JSX.Element {
  const annual = data.annualTaxableIncome;
  const people = [
    { label: "You",
      income: annual.incomeByPerson[0] },
    ...(data.partner ? [{ label: "Partner",
      income: annual.incomeByPerson[1] }] : []),
  ];

  return (
    <section id={id} className="annual-income glass-panel" aria-labelledby={`${id}-heading`}>
      <div className="annual-income__header">
        <div>
          <h2 id={`${id}-heading`}>Annual taxable income</h2>
          <p>{data.partner ? "Your income, your partner's income, their sum and joint deductions." : "Your employment income and individual annual deductions."}</p>
        </div>
        <p>Tax year {annual.rules.calendarYear}{editable && <>{" · "}<a href="#payrollYear">Edit payroll rules</a></>}</p>
      </div>
      <p className="annual-income__caption">Based on the annual salary schedule you configured, including active working months and bonus payments. These are annual amounts, even when salary inputs are monthly.</p>
      <AnnualIncomeBreakdown people={people} base={annual.taxBase} profile={annual.rules} />
      {!annual.taxBase && <p className="annual-income__notice">Annual taxable income is unavailable for these inputs. The payroll estimate may still be visible; review the limitations below.</p>}
      {annual.reasons.length > 0 && <ul className="annual-income__reasons">{annual.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <details className="annual-income__evidence">
        <summary>Calculation scope and sources</summary>
        <p>This calculation uses ordinary employment receipts and employee contributions for the configured payment schedule. It assumes no other income and uses the published standard deductions; additional personal deductions are outside this model. It does not calculate an annual refund or payment due.</p>
        {data.partner && <p>The partner view models joint assessment and assumes eligible spouses or registered partners. Shared deductions are applied to the household.</p>}
        <p><a href={annual.rules.papPublication.source} target="_blank" rel="noreferrer">Published payroll profile · {annual.rules.sourceYear}</a>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__2.html" target="_blank" rel="noreferrer">Income and taxable income (§ 2 EStG)</a>{data.partner && <>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__26b.html" target="_blank" rel="noreferrer">Joint assessment (§ 26b EStG)</a></>}</p>
      </details>
    </section>
  );
}
