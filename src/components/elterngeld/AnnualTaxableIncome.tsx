import "./AnnualTaxableIncome.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type EuroAmount,
  type FullCalendarYear,
  type SimulationResult,
  ScenarioId,
  toEuroAmount,
  toFullCalendarYear,
} from "#engine/types";

const scenarioLabels: Record<ScenarioId, string> = {
  [ScenarioId.A]: "A",
  [ScenarioId.B]: "B",
  [ScenarioId.C]: "C",
};

function money(amount: EuroAmount | undefined): string {
  return amount === undefined ? "Unavailable" : new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Partner contributions reconcile to the joint record without allocating shared deductions. */
export default function AnnualTaxableIncome({ result }: { result: SimulationResult }): JSX.Element {
  const [selectedYear, setSelectedYear] = useState<FullCalendarYear | null>(null);
  const records = result.annualTaxRecords ?? [];
  const record = records.find((item) => item.calendarYear === selectedYear) ?? records[0];
  const base = record?.incomeAvailable ? record.taxBase : undefined;
  const partners = base?.incomeByPartner;
  const combined = partners ? toEuroAmount(partners.husband.employmentIncome + partners.wife.employmentIncome) : undefined;
  const profile = record?.assessment?.taxRules ?? result.configuration?.taxProfiles.find((item) => item.calendarYear === record?.calendarYear);

  return (
    <section id="annual-taxable-income" className="annual-income glass-panel" aria-labelledby="annual-income-heading">
      <div className="annual-income__header">
        <div>
          <h2 id="annual-income-heading">Annual taxable income</h2>
          <p>Scenario {scenarioLabels[result.scenarioKey]} · Each partner's employment income, its sum and the joint deductions.</p>
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
      <div className="annual-income__partners">
        {[
          { label: "Husband",
            income: partners?.husband },
          { label: "Wife",
            income: partners?.wife },
        ].map(({ label, income }) => (
          <div className="annual-income__card" key={label}>
            <h3>{label}</h3>
            <p className="annual-income__amount">{money(income?.employmentIncome)}</p>
            <p className="annual-income__caption">Employment income before shared deductions</p>
            {income && (
              <dl>
                <div><dt>Annual gross, including bonuses</dt><dd>{money(income.gross)}</dd></div>
                <div><dt>{profile ? <a href={profile.parameters.workExpenseAllowance.source} target="_blank" rel="noreferrer">Work expenses</a> : "Work expenses"}</dt><dd>− {money(income.workExpenses)}</dd></div>
              </dl>
            )}
          </div>
        ))}
        <div className="annual-income__card annual-income__combined">
          <h3>Combined employment income</h3>
          <p className="annual-income__amount">{money(combined)}</p>
          <p className="annual-income__caption">Husband + wife, before shared deductions</p>
        </div>
      </div>
      {base ? (
        <div className="annual-income__joint">
          <h3>Joint assessment</h3>
          <dl>
            <div><dt>Combined employment income</dt><dd>{money(combined)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.pensionDeductibleFraction.source} target="_blank" rel="noreferrer">Deductible pension contributions</a> : "Deductible pension contributions"}</dt><dd>− {money(base.pensionDeduction)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.healthDeductibleFraction.source} target="_blank" rel="noreferrer">Deductible health, care and other insurance</a> : "Deductible health, care and other insurance"}</dt><dd>− {money(base.insuranceDeduction)}</dd></div>
            <div><dt>{profile ? <a href={profile.parameters.specialExpenseAllowance.source} target="_blank" rel="noreferrer">Special-expense allowance</a> : "Special-expense allowance"}</dt><dd>− {money(base.specialExpenses)}</dd></div>
            <div className="annual-income__total"><dt>Joint taxable income before child allowances</dt><dd>{money(base.taxableIncome)}</dd></div>
          </dl>
          <p className="annual-income__caption">Shared deductions are applied to the household, without an invented split between partners. The model floors the joint amount at zero. Child allowances are evaluated separately in the annual tax assessment.</p>
          {!record.available && <p className="annual-income__notice">Income is modeled, but the annual tax settlement is incomplete.</p>}
        </div>
      ) : (
        <p className="annual-income__notice">Annual taxable income is unavailable for this year. A complete supported calendar year of gross payroll is required; supplied net salaries do not establish taxable income.</p>
      )}
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
