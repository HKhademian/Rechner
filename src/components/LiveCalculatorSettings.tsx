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
export default function LiveCalculatorSettings(): JSX.Element {
  return (
    <details className="live-payroll-settings">
      <summary>Payroll details and official sources</summary>
      <p>Monthly gross input is ordinary monthly pay; yearly gross input is the actual total for the year. Active employment starts in January. Extra payments are prorated and paid in the final working month.</p>
      <TaxSettings />
      <h4>Your payroll details</h4>
      <PayrollPersonalInputs id="primary" options={personalPayroll} />
      {hasPartner.value && <>
        <h4>Partner payroll details</h4>
        <PayrollPersonalInputs id="partner" options={partnerPersonalPayroll} />
      </>}
    </details>
  );
}
