import {
  type JSX,
} from "preact";
import {
  calculatorViewPeriod,
  calculatorInvalidInputs,
} from "#store/calculatorStore";
import {
  SalaryPeriod,
} from "#engine/types";
import {
  useEffect,
  useState,
} from "preact/hooks";
import "./CalculatorPeriodControl.css";

/** One presentation preference for every net-pay column and breakdown. */
export default function CalculatorPeriodControl(): JSX.Element {
  // Match server markup before applying the locally saved presentation preference.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const currentPeriod = hydrated ? calculatorViewPeriod.value : SalaryPeriod.Yearly;
  const invalid = hydrated && Object.values(calculatorInvalidInputs.value).some(Boolean);
  return <div className="calculator-period">
    <div role="group" aria-label="Calculator amount period" aria-describedby="calculator-period-hint" title="Monthly results average the year over 12 months. Monthly gross inputs are your regular salary. Taxable income stays annual.">
      {Object.values(SalaryPeriod).map((period) => <button key={period} type="button"
        aria-pressed={currentPeriod === period} disabled={!hydrated || invalid}
        onClick={() => {
          calculatorViewPeriod.value = period;
        }}>
        {period === SalaryPeriod.Monthly ? "Monthly" : "Yearly"}
      </button>)}
    </div>
    <p id="calculator-period-hint" className={invalid ? "calculator-period__error" : "calculator-period__description"} role={invalid ? "status" : undefined}>{invalid ? "Finish the highlighted input before changing period." : "Applies to all columns and breakdowns. Monthly results average the year over 12 months; monthly gross inputs are your regular salary. Taxable income stays annual."}</p>
  </div>;
}
