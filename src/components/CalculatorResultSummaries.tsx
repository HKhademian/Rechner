import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  type JSX,
} from "preact";
import {
  type HouseholdScenarioData,
  calculatorViewPeriod,
} from "#store/calculatorStore";
import {
  SalaryPeriod,
} from "#engine/types";
import CalculatorResultDetails from "#components/CalculatorResultDetails";
import CalculatorTaxableIncome from "#components/CalculatorTaxableIncome";
import ResultsDisplay from "#components/ResultsDisplay";

interface ResultSummaryProps {
  data: HouseholdScenarioData;
  id: string;
  context: string;
}

const money = (value: number | undefined): string => value === undefined ? "Unavailable" : new Intl.NumberFormat("de-DE", { style: "currency",
  currency: "EUR" }).format(value);

/** Keep annual values explicit even when the comparison's main result rows use monthly averages. */
export function TaxableIncomeSummary({ data, id, context }: ResultSummaryProps): JSX.Element {
  const annual = data.annualTaxableIncome;
  return <CalculatorResultDetails id={`${id}-income-dialog`} title="Annual taxable income" context={context} summary={
    <dl>
      <div><dt>Taxable income</dt><dd>{money(annual.taxBase?.taxableIncome)}</dd></div>
      <div><dt>Tax year</dt><dd>{annual.rules.calendarYear}</dd></div>
      <div><dt>Assessment</dt><dd>{annual.assessment === TaxAssessment.Unspecified ? "Choose…" : annual.assessment === TaxAssessment.Joint ? "Joint" : "Individual"}</dd></div>
    </dl>
  }>
    <CalculatorTaxableIncome data={data} id={`${id}-annual-income-detail`} editable={false} />
  </CalculatorResultDetails>;
}

export function CalculationSummary({ data, id, context }: ResultSummaryProps): JSX.Element {
  const household = data.household;
  const monthly = calculatorViewPeriod.value === SalaryPeriod.Monthly;
  const divider = monthly ? 12 : 1;
  return <CalculatorResultDetails id={`${id}-breakdown-dialog`} title="Payroll breakdown" context={context} summary={
    <dl>
      <div><dt>{monthly ? "Monthly avg. net pay" : "Annual net pay"}</dt><dd>{money(household.netIncome / divider)}</dd></div>
      <div><dt>{monthly ? "Monthly avg. deductions" : "Annual deductions"}</dt><dd>{money(household.totalDeductions / divider)}</dd></div>
      <div><dt>Deductions / gross</dt><dd>{household.grossYearly > 0 ? `${(household.totalDeductions / household.grossYearly * 100).toFixed(1)}%` : "—"}</dd></div>
    </dl>
  }><ResultsDisplay data={data} /></CalculatorResultDetails>;
}

export function PayrollEvidenceSummary({ data, id, context }: ResultSummaryProps): JSX.Element {
  const rules = data.annualTaxableIncome.rules;
  const count = new Set([...data.person1.assumptions, ...(data.partner?.assumptions ?? [])]).size;
  return <CalculatorResultDetails id={`${id}-payroll-dialog`} title="Payroll sources" context={context} summary={
    <dl>
      <div><dt>Tax year</dt><dd>{rules.calendarYear}</dd></div>
      <div><dt>Profile</dt><dd>{rules.sourceYear}</dd></div>
      <div><dt>Assumptions</dt><dd>{count}</dd></div>
    </dl>
  }>
    <h3>You</h3>
    <ul>{data.person1.assumptions.map((note) => <li key={note}>{note}</li>)}</ul>
    {data.partner && <><h3>Partner</h3><ul>{data.partner.assumptions.map((note) => <li key={note}>{note}</li>)}</ul></>}
    <a href={rules.papPublication.source} target="_blank" rel="noreferrer">Official {rules.calendarYear} payroll profile</a>
  </CalculatorResultDetails>;
}
