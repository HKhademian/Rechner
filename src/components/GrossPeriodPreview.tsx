import {
  formatEur,
} from "#utils/currencyFormat";
import "./GrossPeriodPreview.css";
import {
  type JSX,
} from "preact";
import {
  type CalculatorInputs,
} from "#store/calculatorStore";

/** Reuse annual payroll gross so partial years and extra payments retain their actual schedule. */
export default function GrossPeriodPreview({ id, inputMode, annualGross, lastValid = false }: {
  id: string;
  inputMode: CalculatorInputs["inputMode"];
  annualGross: number | undefined;
  lastValid?: boolean;
}): JSX.Element {
  const monthlyInput = inputMode === "monthly";
  const amount = annualGross === undefined ? undefined : monthlyInput ? annualGross : annualGross / 12;
  const formatted = amount === undefined ? undefined : formatEur(amount, 2);
  return (
    <small id={id} className="gross-period-preview" title={monthlyInput
      ? "Annual gross for the configured working months and salary payments."
      : "Annual gross averaged over 12 calendar months."}>
      <span>{formatted === undefined ? "Not included" : monthlyInput ? "Yearly total" : "Monthly avg."}</span>
      {formatted !== undefined && <strong>{formatted}</strong>}
      {lastValid && formatted !== undefined && <span className="gross-period-preview__validity">From last valid inputs</span>}
    </small>
  );
}
