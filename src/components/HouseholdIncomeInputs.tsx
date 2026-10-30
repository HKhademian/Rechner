import {
  type JSX,
} from "preact";
import {
  type Signal,
} from "@preact/signals";
import {
  useState,
} from "preact/hooks";
import {
  type HouseholdTaxableIncomeInput,
  type FullCalendarYear,
} from "#engine/types";
import {
  parseHouseholdTaxableIncome,
} from "#engine/benefits/taxableIncomeInput";

/** Explicit annual evidence fills missing years without inferring income from salary repetitions. */
export default function HouseholdIncomeInputs({ values, suggestedYear }: {
  values: Signal<readonly HouseholdTaxableIncomeInput[]>;
  suggestedYear: FullCalendarYear;
}): JSX.Element {
  const [year, setYear] = useState(String(suggestedYear));
  const [income, setIncome] = useState("");
  const [error, setError] = useState("");
  const save = (): void => {
    try {
      values.value = parseHouseholdTaxableIncome([
        ...values.value.filter((entry) => entry.calendarYear !== Number(year)),
        { calendarYear: Number(year),
          taxableIncome: Number(income) },
      ]);
      setIncome("");
      setError("");
    }
    catch (problem) {
      setError(problem instanceof Error ? problem.message : "Invalid household income.");
    }
  };
  return (
    <details>
      <summary>Household taxable income for Elterngeld eligibility</summary>
      <p>Use the combined taxable income for the calendar year before birth, including the adjustments required by EStG section 2(5a). This differs from gross salary. Supplied figures take priority for eligibility; they do not replace the annual tax calculation.</p>
      <p>Without a supplied figure, the result uses supported complete-year employment records. Missing evidence remains unavailable.</p>
      <p><a href="https://www.gesetze-im-internet.de/beeg/__1.html" target="_blank" rel="noreferrer">Eligibility limit (§ 1(8) BEEG)</a>{" · "}<a href="https://www.gesetze-im-internet.de/estg/__2.html" target="_blank" rel="noreferrer">Taxable income and adjustments (§ 2 EStG)</a></p>
      <label for="household-income-year">Income calendar year</label>
      <input id="household-income-year" type="number" min="1900" max="2100" step="1" value={year}
        onInput={(event) => setYear(event.currentTarget.value)} />
      <label for="household-income-amount">Combined taxable income (€)</label>
      <input id="household-income-amount" type="number" step="0.01" value={income}
        onInput={(event) => setIncome(event.currentTarget.value)} />
      <button type="button" disabled={year === "" || income === ""} onClick={save}>Save supplied income for this year</button>
      <ul>{[...values.value].sort((a, b) => a.calendarYear - b.calendarYear).map((entry) => (
        <li key={entry.calendarYear}>
          {entry.calendarYear}: {new Intl.NumberFormat("de-DE", { style: "currency",
            currency: "EUR" }).format(entry.taxableIncome)}{" "}
          <button type="button" onClick={() => {
            values.value = values.value.filter((value) => value.calendarYear !== entry.calendarYear);
          }}>Remove {entry.calendarYear} income</button>
        </li>
      ))}</ul>
      {error && <p role="alert">{error}</p>}
    </details>
  );
}
