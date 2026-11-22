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
 * Full-width Monthly Ledger with Rule 13 action milestone rows above effective months
 * and expandable double-entry TaxBucket transaction audit rows.
 */
export function LifeLedgerTab(): JSX.Element {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const active = displayedActiveScenarioResult.value;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Monthly Ledger ({active.months.length} Months)</h2>
          <p className="lpw-hint">
            Click any month row to inspect double-entry payroll, tax buckets, benefits, and asset transactions.
          </p>
        </div>
        <Badge tone={BadgeTone.Brand}>{active.scenarioKey}</Badge>
      </div>

      <div className="lpw-table-wrap">
        <table className="lpw-table">
          <thead>
            <tr>
              <th>Month</th>
              <th>Tax</th>
              <th className="lpw-num">Net Salaries</th>
              <th className="lpw-num">Benefits</th>
              <th className="lpw-num">Housing &amp; Assets</th>
              <th className="lpw-num">Living &amp; Kita</th>
              <th className="lpw-num">Tax Settlement</th>
              <th className="lpw-num">Monthly Net</th>
              <th className="lpw-num">Liquid Cash</th>
              <th className="lpw-num">Net Worth</th>
            </tr>
          </thead>
          <tbody>
            {active.months.map((row) => {
              const isExpanded = expandedMonth === row.month;
              const salaries = row.primaryNetSalary + row.partnerNetSalary;
              return (
                <Fragment key={row.monthId}>
                  {row.actionMilestones.length > 0 && (
                    <tr className="lpw-milestone-row">
                      <td colSpan={10}>
                        Action M{row.month} ({row.monthId}):
                        {" "}
                        {row.actionMilestones.map((a) => a.title).join(" · ")}
                      </td>
                    </tr>
                  )}
                  <tr
                    onClick={() => setExpandedMonth(isExpanded ? null : row.month)}
                    aria-expanded={isExpanded}
                  >
                    <td>
                      <strong>{row.monthId}</strong>
                      {" "}
                      <span className="lpw-hint">M{row.month}</span>
                    </td>
                    <td>{row.activeTaxClassLabel}</td>
                    <td className="lpw-num">{formatEur(salaries)}</td>
                    <td className="lpw-num">{formatEur(row.statutoryBenefits)}</td>
                    <td className="lpw-num">{formatEur(row.housingAndAssetsNet)}</td>
                    <td className="lpw-num">{formatEur(-row.livingAndChildcareOutflow)}</td>
                    <td className={`lpw-num${row.taxRefundOrRepayment > 0 ? " lpw-gain" : row.taxRefundOrRepayment < 0 ? " lpw-loss" : ""}`}>
                      {row.taxRefundOrRepayment === 0 ? "—" : formatEur(row.taxRefundOrRepayment)}
                    </td>
                    <td className={`lpw-num${row.monthlyNetCashflow >= 0 ? " lpw-gain" : " lpw-loss"}`}>
                      {formatEur(row.monthlyNetCashflow)}
                    </td>
                    <td className={`lpw-num${row.liquidCashBalance < 0 ? " lpw-loss" : ""}`}>
                      {formatEur(row.liquidCashBalance)}
                    </td>
                    <td className="lpw-num"><strong>{formatEur(row.netWorth)}</strong></td>
                  </tr>
                  {isExpanded && (
                    <tr>
                      <td colSpan={10}>
                        <div className="lpw-event-list">
                          {row.transactions.map((tx) => (
                            <div key={tx.transactionId} className="lpw-event-row">
                              <span>
                                <strong>{tx.label}</strong>
                                {" · "}
                                <Badge tone={BadgeTone.Neutral}>{tx.bucket}</Badge>
                                {tx.statutoryCitation ? ` · ${tx.statutoryCitation}` : ""}
                              </span>
                              <span>
                                Cash: {formatEur(tx.signedCashAmount)}
                                {tx.taxBasisAmount > 0 ? ` · Tax Basis: ${formatEur(tx.taxBasisAmount)}` : ""}
                              </span>
                            </div>
                          ))}
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
