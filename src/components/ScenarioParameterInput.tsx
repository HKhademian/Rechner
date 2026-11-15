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
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  parseVerifiedTaxYear,
  verifiedTaxYears,
} from "#store/taxConfigStore";
import {
  LiveNumberInput,
  LiveChoiceInput,
  LiveToggleInput,
} from "#components/LiveCalculatorInputs";

/** Local edit signals keep unfinished text separate from the last valid saved draft. */
export default function ScenarioParameterInput({ id, label, scope, field, value, options, onValidityChange }: {
  id: string;
  label: string;
  scope: string;
  onValidityChange?: (valid: boolean) => void;
  field: keyof CalculatorInputs;
  value: CalculatorInputs[keyof CalculatorInputs] | undefined;
  options: readonly { value: string;
    label: string }[] | null;
}): JSX.Element {
  const resolveYear = (
    candidate: CalculatorInputs[keyof CalculatorInputs] | undefined,
  ): ReturnType<typeof parseVerifiedTaxYear> => (
    field === "taxYear" && typeof candidate === "number"
      ? parseVerifiedTaxYear(candidate)
      : DEFAULT_TAX_YEAR
  );
  const numberValue = useSignal(typeof value === "number" ? value : 0);
  const choiceValue = useSignal(typeof value === "string" ? value : "");
  const toggleValue = useSignal(Boolean(value));
  const yearValue = useSignal(resolveYear(value));
  useEffect(() => {
    numberValue.value = typeof value === "number" ? value : 0;
    choiceValue.value = typeof value === "string" ? value : "";
    toggleValue.value = Boolean(value);
    yearValue.value = resolveYear(value);
  }, [field, value]);
  const update = (next: CalculatorInputs[keyof CalculatorInputs]): void => updateScenarioInput(field, next);
  if (field === "taxYear") {
    const yearOptions = verifiedTaxYears.map((year) => ({
      value: parseVerifiedTaxYear(year),
      label: String(year),
    }));
    return (
      <LiveChoiceInput
        label={label}
        scope={scope}
        onValidityChange={onValidityChange}
        value={yearValue}
        options={yearOptions}
        beforeChange={(next) => updateScenarioInput("taxYear", next)}
      />
    );
  }
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
    return <LiveNumberInput id={id} descriptionId={field === "grossIncome" || field === "partnerGrossIncome" ? `${id}-preview` : undefined} label={label} scope={scope} onValidityChange={onValidityChange} value={numberValue} construct={numeric.construct} step={numeric.step} beforeChange={update} />;
  }
  if (options) {
    return <LiveChoiceInput label={label} scope={scope} onValidityChange={onValidityChange} value={choiceValue} options={options} beforeChange={update} />;
  }
  return <LiveToggleInput label={label} scope={scope} onValidityChange={onValidityChange} value={toggleValue} beforeChange={update} />;
}
