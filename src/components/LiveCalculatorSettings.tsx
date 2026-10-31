import "./LiveCalculatorSettings.css";
import {
  type JSX,
} from "preact";
import TaxSettings from "#components/TaxSettings";
import PayrollPersonalInputs from "#components/PayrollPersonalInputs";
import {
  hasPartner,
  personalPayroll,
  partnerPersonalPayroll,
} from "#store/calculatorStore";

/** Settings stay with the live column; saved scenarios retain their separate draft controls. */
export default function LiveCalculatorSettings({ onValidityChange }: { onValidityChange?: (id: string, valid: boolean) => void }): JSX.Element {
  return (
    <details className="live-payroll-settings">
      <summary>Edit payroll settings</summary>
      <p>Monthly gross input is ordinary monthly pay; yearly gross input is the actual total for the year. Active employment starts in January. Extra payments are prorated and paid in the final working month.</p>
      <TaxSettings onValidityChange={(valid) => onValidityChange?.("factor", valid)} />
      <PayrollPersonalInputs id="primary" summaryLabel="Your insurance and payroll details" options={personalPayroll} onValidityChange={onValidityChange} />
      {hasPartner.value && <PayrollPersonalInputs id="partner" summaryLabel="Partner insurance and payroll details" options={partnerPersonalPayroll} onValidityChange={onValidityChange} />}
    </details>
  );
}
