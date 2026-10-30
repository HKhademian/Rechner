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
  deductions,
} from "#store/calculatorStore";

/** Settings stay with the live column; saved scenarios retain their separate draft controls. */
export default function LiveCalculatorSettings(): JSX.Element {
  return (
    <details className="live-payroll-settings">
      <summary>Payroll details and official sources</summary>
      <p>Monthly gross input is ordinary monthly pay; yearly gross input is the actual total for the year. Active employment starts in January. Extra payments are prorated and paid in the final working month.</p>
      <TaxSettings />
      <PayrollPersonalInputs id="primary" summaryLabel="Your insurance and payroll details" options={personalPayroll} />
      {hasPartner.value && <PayrollPersonalInputs id="partner" summaryLabel="Partner insurance and payroll details" options={partnerPersonalPayroll} />}
      <details>
        <summary>Current payroll assumptions</summary>
        <h4>You</h4>
        <ul>{deductions.value.person1.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        {hasPartner.value && <>
          <h4>Partner</h4>
          <ul>{deductions.value.partner?.assumptions.map((assumption) => <li key={assumption}>{assumption}</li>)}</ul>
        </>}
        <p><a href={deductions.value.annualTaxableIncome.rules.papPublication.source} target="_blank" rel="noreferrer">Verified {deductions.value.annualTaxableIncome.rules.calendarYear} payroll profile</a></p>
      </details>
    </details>
  );
}
