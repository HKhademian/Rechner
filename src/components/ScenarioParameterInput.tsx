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
  type CalculatorInputs,
  updateScenarioInput,
} from "#store/calculatorStore";
import {
  toGrossSalary,
  toChildrenCount,
  toMonthDuration,
} from "#engine/types";
import {
  toSalaryPaymentCount,
} from "#engine/tax/employmentPeriod";
import {
  LiveNumberInput,
  LiveChoiceInput,
  LiveToggleInput,
} from "#components/LiveCalculatorInputs";

/** Local edit signals keep unfinished text separate from the last valid saved draft. */
export default function ScenarioParameterInput({ id, label, scope, field, value, options }: {
  id: string;
  label: string;
  scope: string;
  field: keyof CalculatorInputs;
  value: CalculatorInputs[keyof CalculatorInputs] | undefined;
  options: readonly { value: string;
    label: string }[] | null;
}): JSX.Element {
  const numberValue = useSignal(typeof value === "number" ? value : 0);
  const choiceValue = useSignal(typeof value === "string" ? value : "");
  const toggleValue = useSignal(Boolean(value));
  useEffect(() => {
    numberValue.value = typeof value === "number" ? value : 0;
    choiceValue.value = typeof value === "string" ? value : "";
    toggleValue.value = Boolean(value);
  }, [value]);
  const update = (next: CalculatorInputs[keyof CalculatorInputs]): void => updateScenarioInput(field, next);
  const numeric = [
    { field: "grossIncome",
      construct: toGrossSalary,
      step: 0.01 },
    { field: "partnerGrossIncome",
      construct: toGrossSalary,
      step: 0.01 },
    { field: "children",
      construct: toChildrenCount,
      step: 1 },
    { field: "workingMonths",
      construct: toMonthDuration,
      step: 1 },
    { field: "partnerWorkingMonths",
      construct: toMonthDuration,
      step: 1 },
    { field: "salariesPerYear",
      construct: toSalaryPaymentCount,
      step: 0.5 },
    { field: "partnerSalariesPerYear",
      construct: toSalaryPaymentCount,
      step: 0.5 },
  ].find((entry) => entry.field === field);
  if (numeric) {
    return <LiveNumberInput id={id} label={label} scope={scope} value={numberValue} construct={numeric.construct} step={numeric.step} beforeChange={update} />;
  }
  if (options) {
    return <LiveChoiceInput label={label} scope={scope} value={choiceValue} options={options} beforeChange={update} />;
  }
  return <LiveToggleInput label={label} scope={scope} value={toggleValue} beforeChange={update} />;
}
