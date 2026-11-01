import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
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

  const money = (value: number | undefined): string => value === undefined ? "Unavailable" : new Intl.NumberFormat("de-DE", { style: "currency",
    currency: "EUR" }).format(value);
  return (
    <section id={id} className="annual-income glass-panel" aria-labelledby={`${id}-heading`}>
      <div className="annual-income__header">
        <div>
          <h2 id={`${id}-heading`}>Annual taxable income</h2>
        </div>
        <p>Tax year {annual.rules.calendarYear}{editable && <>{" · "}<a href="#payrollYear">Edit payroll rules</a></>}</p>
      </div>
      {data.partner && annual.assessment === TaxAssessment.Individual ? <>
        <div className="annual-income__result"><h3>Household taxable income</h3><p className="annual-income__amount">{money(annual.taxBase?.taxableIncome)}</p></div>
        {annual.individualBases.map((base, index) => <details key={people[index].label} className="annual-income__evidence">
          <summary>{people[index].label} · {money(base.taxableIncome)}</summary>
          <AnnualIncomeBreakdown people={[{ label: people[index].label,
            income: base.income }]} base={base} profile={annual.rules} />
        </details>)}
      </> : <AnnualIncomeBreakdown people={people} base={annual.taxBase} profile={annual.rules} />}
      {!annual.taxBase && <p className="annual-income__notice">Taxable income unavailable. See limitations below.</p>}
      {annual.reasons.length > 0 && <ul className="annual-income__reasons">{annual.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <details className="annual-income__evidence">
        <summary>Scope and sources</summary>
        <p>This calculation uses ordinary employment receipts and employee contributions for the configured payment schedule. It assumes no other income and uses the published standard deductions; additional personal deductions are outside this model. It does not calculate an annual refund or payment due.</p>
        {annual.assessment === TaxAssessment.Joint && <p>Joint assessment assumes eligible spouses or registered partners.</p>}
        {data.partner && annual.assessment === TaxAssessment.Individual && <p>Each person uses separate deduction limits.</p>}
        <p><a href={annual.rules.papPublication.source} target="_blank" rel="noreferrer">Published payroll profile · {annual.rules.sourceYear}</a>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__2.html" target="_blank" rel="noreferrer">Income and taxable income (§ 2 EStG)</a>{data.partner && <>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__26b.html" target="_blank" rel="noreferrer">Joint assessment (§ 26b EStG)</a></>}</p>
      </details>
    </section>
  );
}
