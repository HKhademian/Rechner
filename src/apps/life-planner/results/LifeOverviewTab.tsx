import type {
  JSX,
} from "preact";
import {
  type ChartOverlaySeries,
  type ChartSeriesDefinition,
  type TimeSeriesChartPoint,
  Badge,
  BadgeTone,
  MetricCard,
  MetricTone,
  TimeSeriesChart,
  TimeSeriesChartMode,
} from "#/components/ui/index.ts";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  SolvencyVerdict,
} from "#engine/lifeSimulator/types";
import {
  displayedActiveScenarioResult,
  displayedLifeBundle,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";
import {
  LifeChartMode,
  LifeScenarioView,
  activeLifeChartMode,
  activeLifeScenarioView,
} from "#/apps/life-planner/store/lifeWorkbenchUiState.ts";

const CashSeriesKey = {
  LiquidCash: "liquidCash",
} as const;
type CashSeriesKey = (typeof CashSeriesKey)[keyof typeof CashSeriesKey];

const NetWorthSeriesKey = {
  NetWorth: "netWorth",
  TotalAssets: "totalAssets",
  TotalDebt: "totalDebt",
} as const;
type NetWorthSeriesKey = (typeof NetWorthSeriesKey)[keyof typeof NetWorthSeriesKey];

const FlowSeriesKey = {
  IncomeAndBenefits: "incomeAndBenefits",
  TaxSettlement: "taxSettlement",
  Outflows: "outflows",
} as const;
type FlowSeriesKey = (typeof FlowSeriesKey)[keyof typeof FlowSeriesKey];

const CASH_SERIES: readonly ChartSeriesDefinition<CashSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: CashSeriesKey.LiquidCash,
    label: "Liquid Cash Balance",
    tooltipLabel: "Liquid Cash:",
    color: "var(--color-primary)",
  }),
]);

const NET_WORTH_SERIES: readonly ChartSeriesDefinition<NetWorthSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: NetWorthSeriesKey.NetWorth,
    label: "Net Worth",
    tooltipLabel: "Net Worth:",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: NetWorthSeriesKey.TotalAssets,
    label: "Total Assets",
    tooltipLabel: "Assets:",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: NetWorthSeriesKey.TotalDebt,
    label: "Remaining Debt",
    tooltipLabel: "Debt:",
    color: "var(--color-loss)",
  }),
]);

const FLOW_SERIES: readonly ChartSeriesDefinition<FlowSeriesKey>[] = Object.freeze([
  Object.freeze({
    key: FlowSeriesKey.IncomeAndBenefits,
    label: "Net Income & Benefits",
    tooltipLabel: "Inflows:",
    color: "var(--color-gain)",
  }),
  Object.freeze({
    key: FlowSeriesKey.TaxSettlement,
    label: "Annual Tax Settlement",
    tooltipLabel: "Tax Settlement:",
    color: "var(--color-primary)",
  }),
  Object.freeze({
    key: FlowSeriesKey.Outflows,
    label: "Housing & Living Outflows",
    tooltipLabel: "Outflows:",
    color: "var(--color-loss)",
  }),
]);

/**
 * Life Planner Overview & Interactive Multi-Series Chart Tab.
 * Surfaces 4 institutional KPIs, 3 Diagnostics cards, and a full-width TimeSeriesChart.
 */
export function LifeOverviewTab(): JSX.Element {
  const bundle = displayedLifeBundle.value;
  const active = displayedActiveScenarioResult.value;
  const view = activeLifeScenarioView.value;
  const chartMode = activeLifeChartMode.value;
  const { summary } = active;
  const { affordability, plannedVsBaseline } = bundle;

  const isCompare = view === LifeScenarioView.Compare;
  const verdictTone = affordability.verdict === SolvencyVerdict.Resilient
    ? BadgeTone.Gain
    : affordability.verdict === SolvencyVerdict.Tight
      ? BadgeTone.Warning
      : BadgeTone.Loss;

  const nextDeadline = active.deadlines[0];

  const renderChart = (): JSX.Element => {
    if (chartMode === LifeChartMode.NetWorth) {
      const points: TimeSeriesChartPoint<NetWorthSeriesKey>[] = active.months.map((row) => ({
        id: row.monthId,
        order: row.month,
        xLabel: row.monthId,
        values: {
          [NetWorthSeriesKey.NetWorth]: row.netWorth,
          [NetWorthSeriesKey.TotalAssets]: row.totalAssetsValue,
          [NetWorthSeriesKey.TotalDebt]: row.totalDebtBalance,
        },
      }));
      const overlays: ChartOverlaySeries[] = isCompare
        ? [
          {
            key: "baseline-nw",
            label: "Baseline Net Worth",
            color: "var(--text-muted)",
            strokeDasharray: "5 4",
            values: bundle.baseline.months.map((m) => m.netWorth),
          },
          {
            key: "stress-nw",
            label: "Stress Test Net Worth",
            color: "var(--color-warning)",
            strokeDasharray: "5 4",
            values: bundle.stressTest.months.map((m) => m.netWorth),
          },
        ]
        : [];
      return (
        <TimeSeriesChart
          title="Net Worth, Assets & Debt Trajectory"
          points={points}
          series={NET_WORTH_SERIES}
          overlaySeries={overlays}
          mode={TimeSeriesChartMode.Lines}
          formatValue={formatEur}
        />
      );
    }

    if (chartMode === LifeChartMode.MonthlyCashflow) {
      const points: TimeSeriesChartPoint<FlowSeriesKey>[] = active.months.map((row) => ({
        id: row.monthId,
        order: row.month,
        xLabel: row.monthId,
        values: {
          [FlowSeriesKey.IncomeAndBenefits]: row.primaryNetSalary + row.partnerNetSalary + row.statutoryBenefits,
          [FlowSeriesKey.TaxSettlement]: row.taxRefundOrRepayment,
          [FlowSeriesKey.Outflows]: row.housingAndAssetsNet - row.livingAndChildcareOutflow + row.otherEventsNet,
        },
      }));
      return (
        <TimeSeriesChart
          title="Monthly Cashflow Streams"
          points={points}
          series={FLOW_SERIES}
          mode={TimeSeriesChartMode.StackedBar}
          formatValue={formatEur}
        />
      );
    }

    const points: TimeSeriesChartPoint<CashSeriesKey>[] = active.months.map((row) => ({
      id: row.monthId,
      order: row.month,
      xLabel: row.monthId,
      xSubLabel: `${row.emergencyRunwayMonths}m`,
      values: {
        [CashSeriesKey.LiquidCash]: row.liquidCashBalance,
      },
    }));
    const overlays: ChartOverlaySeries[] = isCompare
      ? [
        {
          key: "baseline-cash",
          label: "Baseline Cash",
          color: "var(--text-muted)",
          strokeDasharray: "5 4",
          values: bundle.baseline.months.map((m) => m.liquidCashBalance),
        },
        {
          key: "stress-cash",
          label: "Stress Test Cash",
          color: "var(--color-loss)",
          strokeDasharray: "5 4",
          values: bundle.stressTest.months.map((m) => m.liquidCashBalance),
        },
      ]
      : [];

    return (
      <TimeSeriesChart
        title="Liquid Cash & Emergency Runway"
        points={points}
        series={CASH_SERIES}
        overlaySeries={overlays}
        referenceLine={{
          label: `Emergency Floor (${formatEur(affordability.emergencyFloorEur)})`,
          value: affordability.emergencyFloorEur,
        }}
        mode={TimeSeriesChartMode.Lines}
        formatValue={formatEur}
      />
    );
  };

  return (
    <>
      <div className="lpw-kpi-grid">
        <MetricCard
          label="Ending Liquid Cash"
          value={formatEur(summary.endingLiquidCash)}
          subtitle={`Lowest: ${formatEur(summary.minLiquidCash)} (M${summary.minLiquidCashMonth}) · Min runway ${summary.minRunwayMonths}m`}
          tone={summary.minLiquidCash < 0 ? MetricTone.Loss : MetricTone.Gain}
        />
        <MetricCard
          label="Ending Net Worth"
          value={formatEur(summary.endingNetWorth)}
          subtitle={`vs. Baseline: ${plannedVsBaseline.endingNetWorthDiff >= 0 ? "+" : ""}${formatEur(plannedVsBaseline.endingNetWorthDiff)}`}
          tone={summary.endingNetWorth >= 0 ? MetricTone.Primary : MetricTone.Loss}
        />
        <MetricCard
          label="Cumulative Net Cashflow"
          value={formatEur(summary.cumulativeNetCashflow)}
          subtitle={`Assets ${formatEur(summary.endingAssetsValue)} · Debt ${formatEur(summary.endingDebtBalance)}`}
          tone={summary.cumulativeNetCashflow >= 0 ? MetricTone.Neutral : MetricTone.Loss}
        />
        <MetricCard
          label="Total Net Tax Paid"
          value={formatEur(summary.totalNetTaxPaid)}
          subtitle={`Annual settlements: ${summary.totalAnnualTaxSettlements >= 0 ? "+" : ""}${formatEur(summary.totalAnnualTaxSettlements)}`}
          tone={MetricTone.Neutral}
        />
      </div>

      <div className="lpw-diagnostics-grid">
        <div className="lpw-diag-card">
          <div className="lpw-diag-card__head">
            <span>Disaster Solvency &amp; Safe Ceiling</span>
            <Badge tone={verdictTone}>{affordability.verdict}</Badge>
          </div>
          <p className="lpw-diag-card__body">
            Safe commitment headroom:
            {" "}
            <strong>
              {affordability.maxSafeAdditionalMonthlyCommitmentEur >= 0 ? "+" : ""}
              {formatEur(affordability.maxSafeAdditionalMonthlyCommitmentEur)}/mo
            </strong>
            {" · "}
            Safe rent up to {formatEur(affordability.maxSafeTotalRentEur)}/mo.
          </p>
        </div>

        <div className="lpw-diag-card">
          <div className="lpw-diag-card__head">
            <span>Unified Tax Collector</span>
            <Badge tone={BadgeTone.Brand}>{active.annualTaxRecords.length} Tax Years</Badge>
          </div>
          <p className="lpw-diag-card__body">
            Withheld {formatEur(summary.totalTaxWithheld)} across horizon; reconciled settlements net
            {" "}
            <strong>
              {summary.totalAnnualTaxSettlements >= 0 ? "+" : ""}
              {formatEur(summary.totalAnnualTaxSettlements)}
            </strong>
            .
          </p>
        </div>

        <div className="lpw-diag-card">
          <div className="lpw-diag-card__head">
            <span>Next Milestone / Deadline</span>
            <Badge tone={BadgeTone.Neutral}>{active.deadlines.length} Total</Badge>
          </div>
          <p className="lpw-diag-card__body">
            {nextDeadline
              ? `M${nextDeadline.month}: ${nextDeadline.title}`
              : "No statutory or residency deadlines scheduled in this horizon."}
          </p>
        </div>
      </div>

      <section className="lpw-card">
        <div className="lpw-card__header">
          <h2 className="lpw-card__title">Trajectory Analysis</h2>
          <div className="lpw-segmented" role="group" aria-label="Chart metric selector">
            <button
              type="button"
              className={`lpw-segmented__btn${chartMode === LifeChartMode.LiquidCash ? " lpw-segmented__btn--active" : ""}`}
              onClick={() => {
                activeLifeChartMode.value = LifeChartMode.LiquidCash;
              }}
            >
              Liquid Cash
            </button>
            <button
              type="button"
              className={`lpw-segmented__btn${chartMode === LifeChartMode.NetWorth ? " lpw-segmented__btn--active" : ""}`}
              onClick={() => {
                activeLifeChartMode.value = LifeChartMode.NetWorth;
              }}
            >
              Net Worth &amp; Debt
            </button>
            <button
              type="button"
              className={`lpw-segmented__btn${chartMode === LifeChartMode.MonthlyCashflow ? " lpw-segmented__btn--active" : ""}`}
              onClick={() => {
                activeLifeChartMode.value = LifeChartMode.MonthlyCashflow;
              }}
            >
              Monthly Cashflow
            </button>
          </div>
        </div>
        {renderChart()}
      </section>
    </>
  );
}
