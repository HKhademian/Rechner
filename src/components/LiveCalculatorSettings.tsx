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
      <summary>Settings</summary>
      <details><summary>Pay schedule</summary><p>Employment starts in January. Extra pay is prorated and paid in the final working month.</p></details>
      <TaxSettings onValidityChange={(valid) => onValidityChange?.("factor", valid)} />
      <PayrollPersonalInputs id="primary" summaryLabel="Your payroll" options={personalPayroll} onValidityChange={onValidityChange} />
      {hasPartner.value && <PayrollPersonalInputs id="partner" summaryLabel="Partner payroll" options={partnerPersonalPayroll} onValidityChange={onValidityChange} />}
    </details>
  );
}
