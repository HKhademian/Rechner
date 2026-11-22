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
  ChevronDownIcon,
} from "#components/Icons";
import {
  type CombinedMortgageSchedule,
  KfwLoanPhase,
} from "#/apps/mortgage/mortgageSchedule.ts";
import {
  formatEurCents as formatEur,
} from "#utils/currencyFormat";

export interface MortgageLedgerPanelProps {
  readonly schedule: CombinedMortgageSchedule;
  readonly hasKfw: boolean;
}

function phaseBadge(phase: KfwLoanPhase): { readonly label: string;
  readonly tone: BadgeTone } | null {
  if (phase === KfwLoanPhase.InterestOnly) {
    return { label: "Interest-only",
      tone: BadgeTone.Warning };
  }
  if (phase === KfwLoanPhase.Repaying) {
    return { label: "Repaying",
      tone: BadgeTone.Brand };
  }
  if (phase === KfwLoanPhase.BalloonDue) {
    return { label: "Balloon due",
      tone: BadgeTone.Loss };
  }
  if (phase === KfwLoanPhase.PaidOff) {
    return { label: "Paid off",
      tone: BadgeTone.Gain };
  }
  return null;
}

/**
 * Year-by-year and expandable month-by-month repayment ledger showing separate
 * Bank and KfW monthly payments, annual principal/interest splits, milestones,
 * and end-of-period balances.
 */
export function MortgageLedgerPanel({
  schedule,
  hasKfw,
}: MortgageLedgerPanelProps): JSX.Element {
  const [expandedYears, setExpandedYears] = useState<Readonly<Record<number, boolean>>>({});
  const [milestonesOnly, setMilestonesOnly] = useState(false);

  const visibleYears = milestonesOnly
    ? schedule.years.filter((row) => row.milestones.length > 0 || row.year === 1 || row.year === schedule.years.length)
    : schedule.years;

  const allExpanded = visibleYears.length > 0 && visibleYears.every((row) => Boolean(expandedYears[row.year]));

  const toggleYear = (year: number): void => {
    setExpandedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }));
  };

  const toggleAllYears = (): void => {
    if (allExpanded) {
      setExpandedYears({});
      return;
    }
    const next: Record<number, boolean> = {};
    for (const row of visibleYears) {
      next[row.year] = true;
    }
    setExpandedYears(next);
  };

  const colCount = hasKfw ? 9 : 6;

  return (
    <section className="ui-card mortgage-results" aria-labelledby="mortgage-ledger-heading">
      <div className="mortgage-section-header">
        <div>
          <h2 id="mortgage-ledger-heading">
            Year-by-year &amp; Monthly Repayment Ledger ({visibleYears.length} / {schedule.years.length} Years)
          </h2>
          <p className="mortgage-muted">
            Monthly columns show the recurring Bank, KfW, and combined monthly payments for each year. Click any year row to expand all 12 months.
          </p>
        </div>
        <div className="mortgage-ledger-actions">
          <Button
            size={ButtonSize.Sm}
            variant={milestonesOnly ? ButtonVariant.Primary : ButtonVariant.Secondary}
            onClick={() => setMilestonesOnly((prev) => !prev)}
          >
            {milestonesOnly ? "Showing Key Years" : "Key Years Only"}
          </Button>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Secondary}
            onClick={toggleAllYears}
          >
            {allExpanded ? "Collapse All" : "Expand All Months"}
          </Button>
        </div>
      </div>

      <div className="mortgage-table-wrap">
        <table className="domain-calc-table mortgage-ledger-table">
          <thead>
            <tr>
              <th>Year</th>
              <th className="num">Bank / mo</th>
              {hasKfw && <th className="num">KfW / mo</th>}
              <th className="num">Total / mo</th>
              <th className="num">Bank Paid (yr)</th>
              {hasKfw && <th className="num">KfW Paid (yr)</th>}
              <th className="num">Bank Balance</th>
              {hasKfw && <th className="num">KfW Balance</th>}
              <th className="num">Total Debt</th>
            </tr>
          </thead>
          <tbody>
            {visibleYears.map((row) => {
              const isExpanded = Boolean(expandedYears[row.year]);
              const badge = hasKfw ? phaseBadge(row.kfwPhase) : null;
              return (
                <Fragment key={row.year}>
                  {row.milestones.length > 0 && (
                    <tr className="mortgage-milestone-row">
                      <td colSpan={colCount}>
                        <strong>Year {row.year} Milestone:</strong>{" "}
                        {row.milestones.join(" · ")}
                      </td>
                    </tr>
                  )}
                  <tr
                    className={`mortgage-year-row${isExpanded ? " mortgage-year-row--expanded" : ""}`}
                    onClick={() => toggleYear(row.year)}
                    aria-expanded={isExpanded}
                  >
                    <th scope="row">
                      <span className="mortgage-year-cell">
                        <ChevronDownIcon
                          size={14}
                          className={`mortgage-chevron${isExpanded ? " mortgage-chevron--open" : ""}`}
                        />
                        <span>Year {row.year}</span>
                        {badge && <Badge tone={badge.tone}>{badge.label}</Badge>}
                      </span>
                    </th>
                    <td className="num"><strong>{formatEur(row.bankMonthlyPayment)}</strong></td>
                    {hasKfw && <td className="num"><strong>{formatEur(row.kfwMonthlyPayment)}</strong></td>}
                    <td className="num"><strong>{formatEur(row.totalMonthlyPayment)}</strong></td>
                    <td className="num">
                      <div>{formatEur(row.bankAnnualPayment)}</div>
                      <div className="mortgage-cell-sub">
                        P {formatEur(row.bankAnnualPrincipal)} · I {formatEur(row.bankAnnualInterest)}
                      </div>
                    </td>
                    {hasKfw && (
                      <td className="num">
                        <div>{formatEur(row.kfwAnnualPayment)}</div>
                        <div className="mortgage-cell-sub">
                          P {formatEur(row.kfwAnnualPrincipal)} · I {formatEur(row.kfwAnnualInterest)}
                        </div>
                      </td>
                    )}
                    <td className="num">{formatEur(row.bankEndBalance)}</td>
                    {hasKfw && <td className="num">{formatEur(row.kfwEndBalance)}</td>}
                    <td className="num"><strong>{formatEur(row.totalEndBalance)}</strong></td>
                  </tr>
                  {isExpanded && (
                    <tr className="mortgage-months-detail-row">
                      <td colSpan={colCount}>
                        <div className="mortgage-months-wrap">
                          <table className="mortgage-months-table">
                            <thead>
                              <tr>
                                <th>Month</th>
                                <th className="num">Bank / mo</th>
                                <th className="num">Bank P / I</th>
                                {hasKfw && <th className="num">KfW / mo</th>}
                                {hasKfw && <th className="num">KfW P / I</th>}
                                <th className="num">Total / mo</th>
                                <th className="num">Bank Balance</th>
                                {hasKfw && <th className="num">KfW Balance</th>}
                                <th className="num">Total Debt</th>
                              </tr>
                            </thead>
                            <tbody>
                              {row.months.map((m) => (
                                <tr key={m.month}>
                                  <th scope="row">M{m.month} (Y{m.year}.{String(m.monthInYear).padStart(2, "0")})</th>
                                  <td className="num">{formatEur(m.bankPayment)}</td>
                                  <td className="num mortgage-cell-sub">
                                    {formatEur(m.bankPrincipal)} / {formatEur(m.bankInterest)}
                                  </td>
                                  {hasKfw && <td className="num">{formatEur(m.kfwPayment)}</td>}
                                  {hasKfw && (
                                    <td className="num mortgage-cell-sub">
                                      {formatEur(m.kfwPrincipal)} / {formatEur(m.kfwInterest)}
                                    </td>
                                  )}
                                  <td className="num"><strong>{formatEur(m.totalPayment)}</strong></td>
                                  <td className="num">{formatEur(m.bankBalance)}</td>
                                  {hasKfw && <td className="num">{formatEur(m.kfwBalance)}</td>}
                                  <td className="num">{formatEur(m.totalBalance)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
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
