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
  Button,
  ButtonSize,
  ButtonVariant,
} from "#/components/ui/index.ts";
import {
  ExportDataIcon,
} from "#components/Icons";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  displayedActiveScenarioResult,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  openLifeExportImport,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

/**
 * Full-width Monthly Ledger with year filter, milestone-only toggle, Rule 13 action rows,
 * and expandable double-entry TaxBucket transaction audit rows.
 */
export function LifeLedgerTab(): JSX.Element {
  const [expandedMonth, setExpandedMonth] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [milestonesOnly, setMilestonesOnly] = useState(false);

  const active = displayedActiveScenarioResult.value;
  const years = [...new Set(active.months.map((m) => m.calendarYear))];

  const visibleMonths = active.months.filter((row) => {
    if (selectedYear !== null && row.calendarYear !== selectedYear) {
      return false;
    }
    if (milestonesOnly && row.actionMilestones.length === 0 && row.taxRefundOrRepayment === 0) {
      return false;
    }
    return true;
  });

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Monthly Ledger ({visibleMonths.length} / {active.months.length} Months)</h2>
          <p className="lpw-hint">
            Click any month row to inspect double-entry payroll, tax buckets, benefits, and asset transactions.
          </p>
        </div>
        <div className="lpw-actions-row">
          <div className="lpw-disaster-chips" role="group" aria-label="Filter ledger by year">
            <button
              type="button"
              className={`lpw-chip${selectedYear === null ? " lpw-chip--active" : ""}`}
              onClick={() => setSelectedYear(null)}
            >
              All Years
            </button>
            {years.map((yr) => (
              <button
                key={yr}
                type="button"
                className={`lpw-chip${selectedYear === yr ? " lpw-chip--active" : ""}`}
                onClick={() => setSelectedYear(yr)}
              >
                {yr}
              </button>
            ))}
          </div>

          <button
            type="button"
            className={`lpw-chip${milestonesOnly ? " lpw-chip--active" : ""}`}
            onClick={() => setMilestonesOnly(!milestonesOnly)}
          >
            Events &amp; Tax Only
          </button>

          <Button size={ButtonSize.Sm} variant={ButtonVariant.Secondary} onClick={openLifeExportImport}>
            <ExportDataIcon size={12} />
            <span>CSV / JSON</span>
          </Button>
        </div>
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
            {visibleMonths.map((row) => {
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
