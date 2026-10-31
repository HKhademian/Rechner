import {
  plannerCalculationLabels,
} from "#utils/plannerCalculationLabels";
import AnnualIncomeBreakdown from "#components/AnnualIncomeBreakdown";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type FullCalendarYear,
  type SimulationResult,
  toFullCalendarYear,
} from "#engine/types";



/** Partner contributions reconcile to the joint record without allocating shared deductions. */
export default function AnnualTaxableIncome({ result }: { result: SimulationResult }): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<FullCalendarYear | null>(null);
  const records = result.annualTaxRecords ?? [];
  const record = records.find((item) => item.calendarYear === selectedYear) ?? records[0];
  const base = record?.incomeAvailable ? record.taxBase : undefined;
  const partners = base?.incomeByPartner;
  const profile = record?.assessment?.taxRules ?? result.configuration?.taxProfiles.find((item) => item.calendarYear === record?.calendarYear);

  return (
    <section id="annual-taxable-income" className="annual-income glass-panel" aria-labelledby="annual-income-heading">
      <div className="annual-income__header">
        <div>
          <h2 id="annual-income-heading">Annual taxable income</h2>
          <p>{plannerCalculationLabels[result.scenarioKey]} · Each partner's employment income, its sum and the joint deductions.</p>
        </div>
        <div className="annual-income__year">
          <label for="annual-income-year">Tax year</label>
          <select id="annual-income-year" disabled={records.length === 0} value={record?.calendarYear ?? ""}
            onChange={(event) => setSelectedYear(toFullCalendarYear(event.currentTarget.value))}>
            {records.length === 0 && <option value="">No annual records</option>}
            {records.map((item) => <option key={item.calendarYear} value={item.calendarYear}>{item.calendarYear}</option>)}
          </select>
        </div>
      </div>
      {profile?.projected && <p className="annual-income__notice">Published {profile.sourceYear} rules are projected to {profile.calendarYear}.</p>}
      <AnnualIncomeBreakdown people={[
        { label: "Husband",
          income: partners?.husband },
        { label: "Wife",
          income: partners?.wife },
      ]} base={base} profile={profile} />
      {base && !record?.available && <p className="annual-income__notice">Income is modeled, but the annual tax settlement is incomplete.</p>}
      {!base && <p className="annual-income__notice">Annual taxable income is unavailable for this year. A complete supported calendar year of gross payroll is required; supplied net salaries do not establish taxable income.</p>}
      {record && record.reasons.length > 0 && <ul className="annual-income__reasons">{record.reasons.map((reason) => <li key={reason}>{reason}</li>)}</ul>}
      <details className="annual-income__evidence">
        <summary>Calculation scope and sources</summary>
        <p>Amounts come from the annual payroll record for the selected year, including regular and bonus wages. The model uses ordinary employment, standard work expenses and recorded employee contributions. Other taxable income and additional deductions are outside this calculation.</p>
        {(record?.assumptions ?? []).map((assumption) => <p key={assumption}>{assumption}</p>)}
        <p><a href="https://www.gesetze-im-internet.de/estg/__2.html" target="_blank" rel="noreferrer">Income and taxable income (§ 2 EStG)</a>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__26b.html" target="_blank" rel="noreferrer">Joint assessment (§ 26b EStG)</a></p>
      </details>
    </section>
  );
}
