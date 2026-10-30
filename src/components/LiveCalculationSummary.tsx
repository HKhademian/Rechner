import "./LiveCalculationSummary.css";
import {
  type JSX,
} from "preact";
import {
  useEffect,
} from "preact/hooks";
import {
  useSignal,
} from "@preact/signals";
import {
  type HouseholdScenarioData,
} from "#store/calculatorStore";

/** Keep the result in view while editing, below the actual wrapped navigation height. */
export default function LiveCalculationSummary({ data, hasInvalidInputs }: {
  data: HouseholdScenarioData;
  hasInvalidInputs: boolean;
}): JSX.Element {
  const navigationHeight = useSignal(0);
  useEffect(() => {
    const navigation = document.getElementById("main-navigation");
    if (!navigation) {
      return;
    }
    const measure = (): void => {
      navigationHeight.value = navigation.getBoundingClientRect().height;
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(navigation);
    return () => observer.disconnect();
  }, []);
  const money = (value: number): string => new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 2,
  }).format(value);
  const taxable = data.annualTaxableIncome.taxBase?.taxableIncome;
  return (
    <aside className="live-calculation-summary" aria-label="Live calculation summary" style={{ top: `${navigationHeight.value}px` }}>
      <div className="live-calculation-summary__context">
        <strong>Live results</strong>
        <span>Tax year {data.annualTaxableIncome.rules.calendarYear}</span>
        {hasInvalidInputs && <span role="status">Last valid inputs; correct highlighted fields.</span>}
      </div>
      <dl>
        <div><dt>Annual net pay</dt><dd>{money(data.household.netIncome)}</dd></div>
        <div><dt>Annual net / 12 months</dt><dd>{money(data.household.netIncome / 12)}</dd></div>
        <div><dt><a href="#annual-taxable-income">Annual income after modeled deductions</a></dt><dd>{taxable === undefined ? "Unavailable" : money(taxable)}</dd></div>
      </dl>
    </aside>
  );
}
