import type {
  JSX,
} from "preact";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  KFW_300_RATES_AS_OF,
} from "#/apps/mortgage/mortgageSchedule.ts";
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
 * loan caps, Nov 2026 rate & term tiers, key contract rules, and Munich/Bavaria context.
 */
export function Kfw300GuidePanel({
  context,
}: Kfw300GuidePanelProps): JSX.Element {
  return (
    <section className="ui-card mortgage-results kfw-guide" aria-labelledby="kfw-guide-heading">
      <div className="mortgage-section-header">
        <div>
          <h2 id="kfw-guide-heading">KfW 300 Official Rules, Rate Tiers &amp; Munich Benchmark</h2>
          <p className="mortgage-muted">
            KfW 300 (<em>Wohneigentum für Familien – Neubau</em>) is a subsidized <strong>loan</strong> (not a grant) for families building or first-buying (within 12 months of <em>Bauabnahme</em>) an owner-occupied EH 40 climate-friendly home.
          </p>
        </div>
        <LawRefLink lawId={LawId.KfW_300} label="Official KfW 300 reference" />
      </div>

      <div className="kfw-guide-grid">
        <div className="kfw-guide-block">
          <h3>1. Income Ceiling (zvE) &amp; Maximum Loan Caps</h3>
          <p>
            <strong>Income limit formula:</strong>{" "}
            <code>€90,000 + (children − 1) × €10,000</code> using the <strong>2-year average household taxable income (zvE)</strong> from your official <em>Einkommensteuerbescheid</em> for the 2nd and 3rd calendar years before application (e.g. 2023 &amp; 2024 assessments for a 2026 application). Because <em>zvE</em> is after deductions, many Munich households with €110k–€130k gross still qualify.
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

          <h3>2. Official Term, Grace &amp; Rate Tiers (as of {KFW_300_RATES_AS_OF})</h3>
          <table className="domain-calc-table kfw-guide-table">
            <thead>
              <tr>
                <th>Loan Type &amp; Term</th>
                <th>Fixed Period</th>
                <th>Interest-Only</th>
                <th className="num">Ref. Rate p.a.</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Annuity · 4–10 yrs</td>
                <td>10 yrs</td>
                <td>1–2 yrs</td>
                <td className="num">0.01%</td>
              </tr>
              <tr>
                <td>Annuity · 11–25 yrs</td>
                <td>10 yrs</td>
                <td>1–3 yrs</td>
                <td className="num">0.51%</td>
              </tr>
              <tr>
                <td>Annuity · 26–35 yrs</td>
                <td>10 yrs</td>
                <td>1–5 yrs</td>
                <td className="num">0.78%</td>
              </tr>
              <tr>
                <td>Endfällig (Balloon) · 4–10 yrs</td>
                <td>4–10 yrs</td>
                <td>Full term</td>
                <td className="num">0.93%</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="kfw-guide-block">
          <h3>3. Key Eligibility, Contract &amp; Fee Rules</h3>
          <ul className="kfw-guide-list">
            <li>
              <strong>Strict first-time &amp; owner-occupancy rules:</strong>{" "}
              At least 1 child under 18 at application, ≥ 50% co-ownership, <strong>0% prior residential property</strong> in Germany (any inherited share disqualifies), and no prior <em>Baukindergeld</em> (KfW 424). No German citizenship required—only residence and tax assessments.
            </li>
            <li>
              <strong>Apply BEFORE signing contracts:</strong>{" "}
              Submit via your financing partner bank with the dena energy expert&apos;s <em>Bestätigung zum Antrag (BzA)</em> before signing purchase/construction contracts (unless a valid <em>aufschiebende Bedingung</em> clause is included upfront).
            </li>
            <li>
              <strong>No partial prepayments (Sondertilgung):</strong>{" "}
              Unscheduled partial repayments are not allowed on KfW 300; full early payoff incurs a prepayment penalty (<em>Vorfälligkeitsentschädigung</em>).
            </li>
            <li>
              <strong>Disbursement &amp; commitment fee (Bereitstellungsprovision):</strong>{" "}
              100% payout, 12 months free draw-down (extendable +24 months), then <strong>0.15%/month</strong> commitment fee from month 13 on undrawn funds.
            </li>
            <li>
              <strong>10-year fixed-rate period (Zinsbindung):</strong>{" "}
              Subsidized KfW rates apply for the first 10 years only; any remaining balance at year 10 is refinanced at prevailing market rates (flagged as a Year 10 milestone in the ledger).
            </li>
            <li>
              <strong>Heating &amp; sister programs:</strong>{" "}
              Requires EH 40 + lifecycle CO₂ limits and <strong>no oil, gas, or biomass heating</strong>. Combinable with <strong>KfW 124</strong> (up to €100k) and commercial bank loans. For <strong>existing (used) homes</strong>, use sister program <strong>KfW 308 (Jung kauft Alt)</strong> (€140k / €160k / €180k by children).
            </li>
            <li>
              <strong>Munich &amp; Umland impact:</strong>{" "}
              In Bavaria (3.5% <em>Grunderwerbsteuer</em>), pairing €170k–€220k KfW 300 at 0.01%–0.78% with a 3.60% bank mortgage cuts the blended rate by ~0.7–1.0 percentage points and can save €45k–€60k+ in interest over the 10-year fixed period.
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
                Ready to compare Munich City vs. Umland scenarios, monthly Bank + KfW payments, and charts?{" "}
                <a href={calculatorPath(AppId.Mortgage)}>Open the Mortgage Simulator</a>.
              </>
            )}
          </p>
        </div>
      </div>
    </section>
  );
}
