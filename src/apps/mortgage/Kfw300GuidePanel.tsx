import type {
  JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LawId,
} from "#engine/laws/types";

export interface Kfw300GuidePanelProps {
  /** Which calculator is rendering this guide, so we can link to the companion tool. */
  readonly context: "housing" | "mortgage";
}

/**
 * Concrete inline reference explaining KfW 300 eligibility, income ceilings,
 * loan caps, repayment structures, and the exact calculation formulas used.
 */
export function Kfw300GuidePanel({
  context,
}: Kfw300GuidePanelProps): JSX.Element {
  return (
    <section className="ui-card mortgage-results kfw-guide" aria-labelledby="kfw-guide-heading">
      <div className="mortgage-section-header">
        <div>
          <h2 id="kfw-guide-heading">How KfW 300 Works &amp; Calculation Reference</h2>
          <p className="mortgage-muted">
            KfW 300 (<em>Wohneigentum für Familien</em>) is a subsidized <strong>loan</strong> (not a grant) for families building or buying a new, owner-occupied climate-friendly home (EH 40).
          </p>
        </div>
        <LawRefLink lawId={LawId.KfW_300} label="Official KfW 300 reference" />
      </div>

      <div className="kfw-guide-grid">
        <div className="kfw-guide-block">
          <h3>1. Eligibility &amp; Income Ceiling (zvE)</h3>
          <p>
            You need at least <strong>1 minor child</strong> in the household, an owner-occupied <strong>EH 40 new build</strong> (or qualifying first purchase), and no existing residential property in Germany.
          </p>
          <p>
            <strong>Income limit formula:</strong>{" "}
            <code>€90,000 + (children − 1) × €10,000</code> based on the <strong>2-year average household taxable income (zvE)</strong> from the 2nd and 3rd calendar years before application (e.g. 2023 &amp; 2024 tax assessments for a 2026 application).
          </p>
          <table className="domain-calc-table kfw-guide-table">
            <thead>
              <tr>
                <th>Minor Children</th>
                <th className="num">Max Avg. zvE</th>
                <th className="num">EH 40 Max Loan</th>
                <th className="num">EH 40 + QNG Max</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1 child</td>
                <td className="num">€90,000</td>
                <td className="num">€170,000</td>
                <td className="num">€220,000</td>
              </tr>
              <tr>
                <td>2 children</td>
                <td className="num">€100,000</td>
                <td className="num">€170,000</td>
                <td className="num">€220,000</td>
              </tr>
              <tr>
                <td>3 children</td>
                <td className="num">€110,000</td>
                <td className="num">€200,000</td>
                <td className="num">€250,000</td>
              </tr>
              <tr>
                <td>4 children</td>
                <td className="num">€120,000</td>
                <td className="num">€200,000</td>
                <td className="num">€250,000</td>
              </tr>
              <tr>
                <td>5+ children</td>
                <td className="num">€130,000+</td>
                <td className="num">€220,000</td>
                <td className="num">€270,000</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="kfw-guide-block">
          <h3>2. Repayment Options &amp; Simulator Formulas</h3>
          <ul className="kfw-guide-list">
            <li>
              <strong>Annuity with interest-only startup (Tilgungsfreie Anlaufjahre):</strong>{" "}
              Typical terms are 10, 20, 25, or 35 years with 1–5 interest-only years. During grace years you pay only monthly interest (<code>Principal × Rate / 12</code>); afterwards, the full principal is amortized over the remaining <code>(Term − Grace) × 12</code> months.
            </li>
            <li>
              <strong>Lump-sum / Balloon (Endfälliges Darlehen):</strong>{" "}
              Usually up to 10 years. Monthly payments cover interest only, and 100% of the principal is due as a lump sum at maturity.
            </li>
            <li>
              <strong>10-year fixed-rate period (Zinsbindung):</strong>{" "}
              KfW typically fixes the interest rate for 10 years, after which a follow-up rate applies. This simulator keeps your entered rate constant over the selected horizon so you can compare scenarios cleanly.
            </li>
            <li>
              <strong>Illustrative defaults:</strong>{" "}
              Because KfW updates interest rates frequently, the simulator pre-fills editable illustrative defaults (e.g. 1.50% nominal, 35 yr term, 5 yr grace) so charts and ledgers work immediately. Replace the rate with your actual KfW offer from your financing bank.
            </li>
          </ul>
          <p className="mortgage-muted">
            {context === "mortgage" ? (
              <>
                Need to check your KfW 300 eligibility, state transfer tax, and remaining bank loan first?{" "}
                <a href={calculatorPath(AppId.Housing)}>Open the Home Purchase Planner</a>.
              </>
            ) : (
              <>
                Ready to inspect month-by-month Bank + KfW payments, grace-period step-ups, and charts?{" "}
                <a href={calculatorPath(AppId.Mortgage)}>Open the Mortgage Simulator</a>.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
