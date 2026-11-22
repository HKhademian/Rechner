import {
  type JSX,
  Fragment,
} from "preact";
import {
  useState,
} from "preact/hooks";
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

/**
 * Year-by-year German Annual Tax Collector & Settlement Reconciliation tab
 * with expandable per-year statutory waterfall breakdown.
 */
export function LifeAnnualTaxTab(): JSX.Element {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const active = displayedActiveScenarioResult.value;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Annual Tax Collector ({active.annualTaxRecords.length} Years)</h2>
          <p className="lpw-hint">
            Click any tax year to expand its statutory German assessment waterfall (§§ 9, 10, 10(1)5, 26b, 31, 32a, 32b, 32d, 35a, 36 EStG).
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
              const isExpanded = expandedYear === rec.calendarYear;
              const totalDeductions =
                rec.socialSecurityDeductible +
                rec.werbungskostenApplied +
                rec.sonderausgabenApplied +
                rec.childcareDeductibleApplied;
              return (
                <Fragment key={rec.calendarYear}>
                  <tr
                    onClick={() => setExpandedYear(isExpanded ? null : rec.calendarYear)}
                    aria-expanded={isExpanded}
                  >
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
                  {isExpanded && (
                    <tr>
                      <td colSpan={11}>
                        <div className="lpw-event-list">
                          <div className="lpw-event-row">
                            <span>1. Taxable Wages + Benefit-in-Kind</span>
                            <strong>{formatEur(rec.grossTaxableWages)} + {formatEur(rec.benefitInKind)}</strong>
                          </div>
                          <div className="lpw-event-row">
                            <span>2. Less: Vorsorgeaufwendungen (Social Security) · § 9 Werbungskosten · § 10 Sonderausgaben · § 10(1)5 Kita</span>
                            <strong>
                              −{formatEur(rec.socialSecurityDeductible)} · −{formatEur(rec.werbungskostenApplied)} · −{formatEur(rec.sonderausgabenApplied)} · −{formatEur(rec.childcareDeductibleApplied)}
                            </strong>
                          </div>
                          <div className="lpw-event-row">
                            <span>3. Assessed Taxable Income (zvE) &amp; § 32b Progression Income</span>
                            <strong>zvE {formatEur(rec.taxableIncomeZvE)} · § 32b {formatEur(rec.progressionIncome32b)}</strong>
                          </div>
                          <div className="lpw-event-row">
                            <span>4. Income Tax (after § 35a credit) + Soli + Church Tax + § 32d Capital Tax</span>
                            <strong>
                              {formatEur(rec.incomeTaxLiability)} + {formatEur(rec.solidarityLiability)} + {formatEur(rec.churchTaxLiability)} + {formatEur(rec.capitalGainsTax)} = {formatEur(rec.finalTotalTaxLiability)}
                            </strong>
                          </div>
                          <div className="lpw-event-row">
                            <span>5. Günstigerprüfung (§ 31 EStG) &amp; Kindergeld Received</span>
                            <strong>
                              Kindergeld {formatEur(rec.kindergeldReceived)} · {rec.isKinderfreibetragFavorable ? "Kinderfreibetrag favorable" : "Kindergeld favorable"}
                            </strong>
                          </div>
                          <div className="lpw-event-row">
                            <span>6. Credited Withholding (§ 36(3) EStG) − Final Liability = Signed Settlement</span>
                            <strong>
                              {formatEur(rec.creditedWithholding)} − {formatEur(rec.finalTotalTaxLiability)} = {rec.settlementEur >= 0 ? `+${formatEur(rec.settlementEur)}` : formatEur(rec.settlementEur)}
                            </strong>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
