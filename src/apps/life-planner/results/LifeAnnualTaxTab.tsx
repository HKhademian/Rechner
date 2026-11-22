import type {
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
} from "#/components/ui/index.ts";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  displayedActiveScenarioResult,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";

/** Year-by-year German Annual Tax Collector & Settlement Reconciliation tab. */
export function LifeAnnualTaxTab(): JSX.Element {
  const active = displayedActiveScenarioResult.value;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Annual Tax Collector ({active.annualTaxRecords.length} Years)</h2>
          <p className="lpw-hint">
            Aggregates all monthly wage withholding, § 32b progression benefits, §§ 9/10/10(1)5 deductions,
            § 35a credits, and § 32d capital tax into exact signed annual settlements posted in year + 1.
          </p>
        </div>
      </div>

      <div className="lpw-table-wrap">
        <table className="lpw-table">
          <thead>
            <tr>
              <th>Year</th>
              <th>Mode</th>
              <th className="lpw-num">Gross + Car</th>
              <th className="lpw-num">Deductions</th>
              <th className="lpw-num">zvE</th>
              <th className="lpw-num">§ 32b Prog.</th>
              <th className="lpw-num">§ 35a Credit</th>
              <th className="lpw-num">Final Tax</th>
              <th className="lpw-num">Withheld</th>
              <th className="lpw-num">Settlement</th>
              <th>Posted</th>
            </tr>
          </thead>
          <tbody>
            {active.annualTaxRecords.map((rec) => {
              const totalDeductions =
                rec.socialSecurityDeductible +
                rec.werbungskostenApplied +
                rec.sonderausgabenApplied +
                rec.childcareDeductibleApplied;
              return (
                <tr key={rec.calendarYear}>
                  <td><strong>{rec.calendarYear}</strong></td>
                  <td>
                    <Badge tone={BadgeTone.Neutral}>
                      {rec.isJointAssessment ? "Joint" : "Single"}
                    </Badge>
                  </td>
                  <td className="lpw-num">{formatEur(rec.grossTaxableWages + rec.benefitInKind)}</td>
                  <td className="lpw-num">{formatEur(totalDeductions)}</td>
                  <td className="lpw-num">{formatEur(rec.taxableIncomeZvE)}</td>
                  <td className="lpw-num">{formatEur(rec.progressionIncome32b)}</td>
                  <td className="lpw-num">{formatEur(rec.taxCredit35aApplied)}</td>
                  <td className="lpw-num">{formatEur(rec.finalTotalTaxLiability)}</td>
                  <td className="lpw-num">{formatEur(rec.creditedWithholding)}</td>
                  <td className={`lpw-num${rec.settlementEur > 0 ? " lpw-gain" : rec.settlementEur < 0 ? " lpw-loss" : ""}`}>
                    {rec.settlementEur >= 0 ? `+${formatEur(rec.settlementEur)}` : formatEur(rec.settlementEur)}
                  </td>
                  <td>{rec.postedInMonth ? `M${rec.postedInMonth}` : "Horizon end"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
