import "./ResultsDisplay.css";
import type {
  JSX,
} from "preact";
import {
  Disclosure,
} from "#components/ui/Disclosure";
import {
  SalaryPeriod,
} from "#engine/types";
import {
  formatEurCents,
} from "#utils/currencyFormat";
import {
  type HouseholdScenarioData,
  type PersonDeductions,
  deductions,
  calculatorViewPeriod,
} from "#store/calculatorStore";

/** Every breakdown follows the calculator-wide presentation period. */
export default function ResultsDisplay({ data = deductions.value }: { data?: HouseholdScenarioData }): JSX.Element {
  const format = (num: number): string => formatEurCents(num);
  const d = data;
  const isMonthly = calculatorViewPeriod.value === SalaryPeriod.Monthly;

  const pct = (val: number, gross: number): string =>
    gross > 0 ? `${((val / gross) * 100).toFixed(1)} %` : "0 %";

  const renderPerson = (
    title: string,
    personData: PersonDeductions | null,
  ): JSX.Element | null => {
    if (!personData || personData.grossYearly <= 0) {
      return null;
    }

    const divider = isMonthly ? 12 : 1;
    const gross = personData.grossYearly / divider;

    return (
      <div className="net-results__person">
        <h3 className="net-results__person-head">
          <span>{title}</span>
          <span className="net-results__period-label">
            {isMonthly ? "Calendar-month average" : "Yearly Total"}
          </span>
        </h3>

        <div className="deduction-item net-results__gross">
          <span>Gross pay</span>
          <span className="amount tabular-nums">{format(gross)}</span>
        </div>

        <div className="net-results__group-label net-results__group-label--first">
          Social insurance
        </div>
        <div className="deduction-item">
          <span>
            Health insurance{" "}
            <small>({pct(personData.healthCare, personData.grossYearly)})</small>
          </span>
          <span className="amount tabular-nums net-results__loss">
            - {format(personData.healthCare / divider)}
          </span>
        </div>
        <div className="deduction-item">
          <span>
            Pension insurance{" "}
            <small>({pct(personData.pension, personData.grossYearly)})</small>
          </span>
          <span className="amount tabular-nums net-results__loss">
            - {format(personData.pension / divider)}
          </span>
        </div>
        <div className="deduction-item">
          <span>
            Unemployment insurance{" "}
            <small>({pct(personData.unemployment, personData.grossYearly)})</small>
          </span>
          <span className="amount tabular-nums net-results__loss">
            - {format(personData.unemployment / divider)}
          </span>
        </div>
        <div className="deduction-item">
          <span>
            Care insurance{" "}
            <small>({pct(personData.care, personData.grossYearly)})</small>
          </span>
          <span className="amount tabular-nums net-results__loss">
            - {format(personData.care / divider)}
          </span>
        </div>

        <div className="net-results__group-label">Taxes</div>
        <div className="deduction-item">
          <span>
            Wage tax{" "}
            <small>({pct(personData.tax, personData.grossYearly)})</small>
          </span>
          <span className="amount tabular-nums net-results__loss">
            - {format(personData.tax / divider)}
          </span>
        </div>
        {personData.solidarity > 0 && (
          <div className="deduction-item">
            <span>Solidarity surcharge</span>
            <span className="amount tabular-nums net-results__loss">
              - {format(personData.solidarity / divider)}
            </span>
          </div>
        )}
        {personData.churchTax > 0 && (
          <div className="deduction-item">
            <span>
              Church tax{" "}
              <small>({pct(personData.churchTax, personData.grossYearly)})</small>
            </span>
            <span className="amount tabular-nums net-results__loss">
              - {format(personData.churchTax / divider)}
            </span>
          </div>
        )}

        <div className="net-results__person-net">
          <span>Net pay</span>
          <span className="tabular-nums net-results__gain">
            {format(personData.netIncome / divider)}
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="ui-card fade-in">
      <div className="net-results__stack">
        {renderPerson("Person 1", d.person1)}
        {Boolean(d.partner) && renderPerson("Partner", d.partner)}
      </div>

      <div className="total-net net-results__total fade-in">
        <span>
          {d.partner ? "Household Net Pay" : "Total Net Income"}
          <div className="net-results__total-sub">
            {isMonthly ? "Calendar-month average (annual / 12)" : "Yearly net total"}
          </div>
        </span>
        <span className="tabular-nums net-results__total-amount">
          {format(d.household.netIncome / (isMonthly ? 12 : 1))}
        </span>
      </div>

      <div className="net-results__ratio">
        Deductions / gross:{" "}
        <strong>{pct(d.household.totalDeductions, d.household.grossYearly)}</strong>
      </div>

      <Disclosure title="Assumptions" subtle>
        <p>Withholding estimate; final assessment may differ.</p>
        <ul>
          {[...new Set([...d.person1.assumptions, ...(d.partner?.assumptions ?? [])])].map((assumption) => (
            <li key={assumption}>{assumption}</li>
          ))}
        </ul>
      </Disclosure>
    </div>
  );
}
