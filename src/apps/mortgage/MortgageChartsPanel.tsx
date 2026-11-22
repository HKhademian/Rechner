import {
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import {
  type ChartSeriesDefinition,
  type TimeSeriesChartPoint,
  SegmentedControl,
  TimeSeriesChart,
  TimeSeriesChartMode,
} from "#/components/ui/index.ts";
import {
  type CombinedMortgageSchedule,
  type TermSensitivityPoint,
} from "#/apps/mortgage/mortgageSchedule.ts";
import {
  formatEur,
} from "#utils/currencyFormat";

const MortgageChartView = {
  DebtTrajectory: "debt-trajectory",
  MonthlyPayments: "monthly-payments",
  AnnualSplit: "annual-split",
  TermSensitivity: "term-sensitivity",
} as const;
type MortgageChartView = (typeof MortgageChartView)[keyof typeof MortgageChartView];

const CHART_VIEW_OPTIONS = [
  { value: MortgageChartView.DebtTrajectory,
    label: "Debt & Cumulative" },
  { value: MortgageChartView.MonthlyPayments,
    label: "Monthly Payments" },
  { value: MortgageChartView.AnnualSplit,
    label: "Principal vs. Interest" },
  { value: MortgageChartView.TermSensitivity,
    label: "Bank Term Comparison" },
] as const;

const DebtSeriesKey = {
  BankBalance: "bankBalance",
  KfwBalance: "kfwBalance",
  CumulativePrincipal: "cumulativePrincipal",
  CumulativeInterest: "cumulativeInterest",
} as const;
type DebtSeriesKey = (typeof DebtSeriesKey)[keyof typeof DebtSeriesKey];

const MonthlySeriesKey = {
  BankMonthly: "bankMonthly",
  KfwMonthly: "kfwMonthly",
} as const;
type MonthlySeriesKey = (typeof MonthlySeriesKey)[keyof typeof MonthlySeriesKey];

const AnnualSplitSeriesKey = {
  BankPrincipal: "bankPrincipal",
  KfwPrincipal: "kfwPrincipal",
  BankInterest: "bankInterest",
  KfwInterest: "kfwInterest",
} as const;
type AnnualSplitSeriesKey = (typeof AnnualSplitSeriesKey)[keyof typeof AnnualSplitSeriesKey];

const TermSeriesKey = {
  MonthlyPayment: "monthlyPayment",
} as const;
type TermSeriesKey = (typeof TermSeriesKey)[keyof typeof TermSeriesKey];

const TermInterestSeriesKey = {
  TotalInterest: "totalInterest",
} as const;
type TermInterestSeriesKey = (typeof TermInterestSeriesKey)[keyof typeof TermInterestSeriesKey];

const DEBT_SERIES: readonly ChartSeriesDefinition<DebtSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: DebtSeriesKey.BankBalance,
    label: "Remaining Bank Debt",
    tooltipLabel: "Bank Balance:",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: DebtSeriesKey.KfwBalance,
    label: "Remaining KfW Debt",
    tooltipLabel: "KfW Balance:",
    color: "var(--color-warning)",
  }),
  Object.freeze({
    key: DebtSeriesKey.CumulativePrincipal,
    label: "Cumulative Principal Repaid",
    tooltipLabel: "Principal Repaid:",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: DebtSeriesKey.CumulativeInterest,
    label: "Cumulative Interest Paid",
    tooltipLabel: "Interest Paid:",
    color: "var(--color-loss)",
  }),
]);

const MONTHLY_SERIES: readonly ChartSeriesDefinition<MonthlySeriesKey>[] = Object.freeze([
  Object.freeze({
    key: MonthlySeriesKey.BankMonthly,
    label: "Bank Monthly Payment",
    tooltipLabel: "Bank / mo:",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: MonthlySeriesKey.KfwMonthly,
    label: "KfW Monthly Payment",
    tooltipLabel: "KfW / mo:",
    color: "var(--color-warning)",
  }),
]);

const ANNUAL_SPLIT_SERIES: readonly ChartSeriesDefinition<AnnualSplitSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: AnnualSplitSeriesKey.BankPrincipal,
    label: "Bank Principal",
    tooltipLabel: "Bank Principal:",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: AnnualSplitSeriesKey.KfwPrincipal,
    label: "KfW Principal",
    tooltipLabel: "KfW Principal:",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: AnnualSplitSeriesKey.BankInterest,
    label: "Bank Interest",
    tooltipLabel: "Bank Interest:",
    color: "var(--color-loss)",
  }),
  Object.freeze({
    key: AnnualSplitSeriesKey.KfwInterest,
    label: "KfW Interest",
    tooltipLabel: "KfW Interest:",
    color: "var(--color-warning)",
  }),
]);

const TERM_PAYMENT_SERIES: readonly ChartSeriesDefinition<TermSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: TermSeriesKey.MonthlyPayment,
    label: "Monthly Bank Payment",
    tooltipLabel: "Monthly Payment:",
    color: "var(--color-primary)",
  }),
]);

const TERM_INTEREST_SERIES: readonly ChartSeriesDefinition<TermInterestSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: TermInterestSeriesKey.TotalInterest,
    label: "Total Bank Interest",
    tooltipLabel: "Total Interest:",
    color: "var(--color-loss)",
  }),
]);

export interface MortgageChartsPanelProps {
  readonly schedule: CombinedMortgageSchedule;
  readonly termSensitivity: readonly TermSensitivityPoint[];
  readonly hasKfw: boolean;
}

/**
 * Interactive multi-view simulation chart suite for Bank + KfW mortgage trajectories,
 * monthly payment step-ups, annual principal/interest splits, and term sensitivity.
 */
export function MortgageChartsPanel({
  schedule,
  termSensitivity,
  hasKfw,
}: MortgageChartsPanelProps): JSX.Element {
  const [view, setView] = useState<MortgageChartView>(MortgageChartView.DebtTrajectory);

  const renderChart = (): JSX.Element => {
    if (view === MortgageChartView.MonthlyPayments) {
      const points: TimeSeriesChartPoint<MonthlySeriesKey>[] = schedule.years.map((row) => ({
        id: `y-${row.year}`,
        order: row.year,
        xLabel: `Y${row.year}`,
        values: {
          [MonthlySeriesKey.BankMonthly]: row.bankMonthlyPayment,
          [MonthlySeriesKey.KfwMonthly]: row.kfwMonthlyPayment,
        },
      }));
      return (
        <TimeSeriesChart
          key={view}
          title="Monthly Loan Payments by Year (Bank + KfW)"
          points={points}
          series={MONTHLY_SERIES}
          mode={TimeSeriesChartMode.StackedBar}
          formatValue={formatEur}
        />
      );
    }

    if (view === MortgageChartView.AnnualSplit) {
      const points: TimeSeriesChartPoint<AnnualSplitSeriesKey>[] = schedule.years.map((row) => ({
        id: `y-${row.year}`,
        order: row.year,
        xLabel: `Y${row.year}`,
        values: {
          [AnnualSplitSeriesKey.BankPrincipal]: row.bankAnnualPrincipal,
          [AnnualSplitSeriesKey.KfwPrincipal]: row.kfwAnnualPrincipal,
          [AnnualSplitSeriesKey.BankInterest]: row.bankAnnualInterest,
          [AnnualSplitSeriesKey.KfwInterest]: row.kfwAnnualInterest,
        },
      }));
      return (
        <TimeSeriesChart
          key={view}
          title="Annual Principal Repaid vs. Interest Paid"
          points={points}
          series={ANNUAL_SPLIT_SERIES}
          mode={TimeSeriesChartMode.StackedBar}
          formatValue={formatEur}
        />
      );
    }

    if (view === MortgageChartView.TermSensitivity) {
      if (termSensitivity.length === 0) {
        return <p className="mortgage-muted">Enter a positive bank loan amount to compare payoff terms from 5 to 35 years.</p>;
      }
      const paymentPoints: TimeSeriesChartPoint<TermSeriesKey>[] = termSensitivity.map((pt) => ({
        id: `term-${pt.termYears}`,
        order: pt.termYears,
        xLabel: `${pt.termYears}y`,
        values: {
          [TermSeriesKey.MonthlyPayment]: pt.monthlyPayment,
        },
      }));
      const interestPoints: TimeSeriesChartPoint<TermInterestSeriesKey>[] = termSensitivity.map((pt) => ({
        id: `term-int-${pt.termYears}`,
        order: pt.termYears,
        xLabel: `${pt.termYears}y`,
        xSubLabel: `${pt.interestPercentOfPrincipal}%`,
        values: {
          [TermInterestSeriesKey.TotalInterest]: pt.totalInterest,
        },
      }));
      return (
        <div className="mortgage-term-charts">
          <TimeSeriesChart
            key="term-payment"
            title="Bank Monthly Payment by Payoff Term"
            points={paymentPoints}
            series={TERM_PAYMENT_SERIES}
            mode={TimeSeriesChartMode.Lines}
            formatValue={formatEur}
          />
          <TimeSeriesChart
            key="term-interest"
            title="Total Bank Interest by Payoff Term"
            points={interestPoints}
            series={TERM_INTEREST_SERIES}
            mode={TimeSeriesChartMode.Lines}
            formatValue={formatEur}
          />
        </div>
      );
    }

    const debtPoints: TimeSeriesChartPoint<DebtSeriesKey>[] = schedule.years.map((row) => ({
      id: `y-${row.year}`,
      order: row.year,
      xLabel: `Y${row.year}`,
      values: {
        [DebtSeriesKey.BankBalance]: row.bankEndBalance,
        [DebtSeriesKey.KfwBalance]: row.kfwEndBalance,
        [DebtSeriesKey.CumulativePrincipal]: row.cumulativePrincipal,
        [DebtSeriesKey.CumulativeInterest]: row.cumulativeInterest,
      },
    }));

    return (
      <TimeSeriesChart
        key={view}
        title={hasKfw ? "Remaining Debt (Bank & KfW) & Cumulative Payments" : "Remaining Bank Debt & Cumulative Payments"}
        points={debtPoints}
        series={DEBT_SERIES}
        mode={TimeSeriesChartMode.Lines}
        formatValue={formatEur}
      />
    );
  };

  return (
    <section className="ui-card mortgage-results" aria-labelledby="mortgage-charts-heading">
      <div className="mortgage-section-header">
        <div>
          <h2 id="mortgage-charts-heading">Simulation Charts</h2>
          <p className="mortgage-muted">
            Inspect debt payoff, KfW grace-period payment step-ups, principal vs. interest split, and bank term sensitivity.
          </p>
        </div>
        <SegmentedControl
          compact
          label="Mortgage chart view"
          value={view}
          options={CHART_VIEW_OPTIONS}
          onChange={setView}
        />
      </div>
      {renderChart()}
    </section>
  );
}
