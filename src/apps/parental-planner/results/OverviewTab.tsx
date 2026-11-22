import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  type ChartOverlaySeries,
  type ChartSeriesDefinition,
  type TimeSeriesChartHoverContext,
  type TimeSeriesChartModeOption,
  Badge,
  BadgeTone,
  SegmentedControl,
  TimeSeriesChart,
  TimeSeriesChartMode,
  TimeSeriesTone,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  type TimelineMonth,
  ActiveScenarioView,
  TimelineTimeRangeFilter,
  toEuroAmount,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  ParameterId,
} from "#engine/parameters/types";
import {
  TIMELINE_CHART_MODE_OPTIONS,
} from "#utils/timelineChartControls";
import {
  TimelineChartSeriesKey,
  getActiveTimelineSeriesKeys,
  mapAbstractModeToTimelineMode,
  mapTimelineModeToAbstractMode,
  mapTimelineMonthToChartPoint,
} from "#utils/timelineChartGeometry";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  setWorkbenchChartMode,
  setWorkbenchTimeRange,
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchMetrics,
  displayedWorkbenchScenarioA,
  displayedWorkbenchScenarioB,
  displayedWorkbenchScenarioC,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  workbenchHoveredMonth,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

const WORKBENCH_SERIES_BY_KEY: Readonly<
  Record<TimelineChartSeriesKey, ChartSeriesDefinition<TimelineChartSeriesKey>>
> = Object.freeze({
  [TimelineChartSeriesKey.HusbandSalary]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandSalary,
    label: "Partner 1 Salary",
    tooltipLabel: "Partner 1 Net Salary:",
    color: "var(--series-salary-husband)",
    seriesClass: "plw-series--husband-salary",
  }),
  [TimelineChartSeriesKey.WifeSalary]: Object.freeze({
    key: TimelineChartSeriesKey.WifeSalary,
    label: "Partner 2 Salary",
    tooltipLabel: "Partner 2 Net Salary:",
    color: "var(--series-salary-wife)",
    seriesClass: "plw-series--wife-salary",
  }),
  [TimelineChartSeriesKey.Mutterschutz]: Object.freeze({
    key: TimelineChartSeriesKey.Mutterschutz,
    label: "Maternity (Mutterschutz)",
    tooltipLabel: "Maternity Pay (MuSchG):",
    color: "var(--series-mutterschutz)",
    seriesClass: "plw-series--mutterschutz",
  }),
  [TimelineChartSeriesKey.WifeElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.WifeElterngeld,
    label: "Elterngeld (Mother)",
    tooltipLabel: "Elterngeld (Mother):",
    color: "var(--series-elterngeld-mother)",
    seriesClass: "plw-series--wife-elterngeld",
    tooltipTone: TimeSeriesTone.Positive,
  }),
  [TimelineChartSeriesKey.HusbandElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandElterngeld,
    label: "Partner Months (Father)",
    tooltipLabel: "Partner Months (Father):",
    color: "var(--series-elterngeld-father)",
    seriesClass: "plw-series--husband-elterngeld",
    tooltipTone: TimeSeriesTone.Warning,
  }),
  [TimelineChartSeriesKey.Kindergeld]: Object.freeze({
    key: TimelineChartSeriesKey.Kindergeld,
    label: "Kindergeld",
    tooltipLabel: "Kindergeld (§ 66 EStG):",
    color: "var(--series-kindergeld)",
    seriesClass: "plw-series--kindergeld",
  }),
  [TimelineChartSeriesKey.SalaryBonuses]: Object.freeze({
    key: TimelineChartSeriesKey.SalaryBonuses,
    label: "Salary Bonuses",
    tooltipLabel: "Salary Bonuses:",
    color: "var(--series-salary-bonuses)",
    seriesClass: "plw-series--salary-bonuses",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.InvestmentReturns]: Object.freeze({
    key: TimelineChartSeriesKey.InvestmentReturns,
    label: "Other / Investment Income",
    tooltipLabel: "Other / Investment Income:",
    color: "var(--series-investment-returns)",
    seriesClass: "plw-series--investment-returns",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.CustomIncome]: Object.freeze({
    key: TimelineChartSeriesKey.CustomIncome,
    label: "Grants & Regional Benefits",
    tooltipLabel: "Grants & Regional Benefits:",
    color: "var(--series-custom-income)",
    seriesClass: "plw-series--custom-income",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.TaxRefund]: Object.freeze({
    key: TimelineChartSeriesKey.TaxRefund,
    label: "Tax Settlement",
    tooltipLabel: "Tax Settlement (§ 36 EStG):",
    color: "var(--series-tax-refund)",
    seriesClass: "plw-series--tax-refund",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.DaycareFees]: Object.freeze({
    key: TimelineChartSeriesKey.DaycareFees,
    label: "Daycare / Kita Fees",
    tooltipLabel: "Daycare / Kita Fees:",
    color: "var(--series-daycare-fees)",
    seriesClass: "plw-series--daycare-fees",
    tooltipTone: TimeSeriesTone.Negative,
  }),
  [TimelineChartSeriesKey.CustomCosts]: Object.freeze({
    key: TimelineChartSeriesKey.CustomCosts,
    label: "One-Off Costs",
    tooltipLabel: "One-Off Costs:",
    color: "var(--series-custom-costs)",
    seriesClass: "plw-series--custom-costs",
    tooltipTone: TimeSeriesTone.Negative,
  }),
});

const MODE_OPTIONS: readonly TimeSeriesChartModeOption[] = Object.freeze(
  TIMELINE_CHART_MODE_OPTIONS.map((opt) => Object.freeze({
    value: mapTimelineModeToAbstractMode(opt.value),
    label: opt.label,
  })),
);

/** Tab 1: Overview & Interactive Cashflow Chart + Calm Wiki-Linked Narrative + Compare Matrix. */
export function OverviewTab(): JSX.Element {
  const s = workbenchState.value;
  const aData = displayedWorkbenchScenarioA.value;
  const bData = displayedWorkbenchScenarioB.value;
  const cData = displayedWorkbenchScenarioC.value;
  const currentData = s.activeScenario === ActiveScenarioView.Compare
    ? cData
    : displayedWorkbenchCurrentScenario.value;
  const metrics = displayedWorkbenchMetrics.value;

  const isCompare = s.activeScenario === ActiveScenarioView.Compare;
  const abstractMode = isCompare
    ? TimeSeriesChartMode.Overlay
    : mapTimelineModeToAbstractMode(s.chartMode);

  const filteredMonths = s.timeRangeFilter === TimelineTimeRangeFilter.Child1
    ? currentData.months.filter((m) => m.month <= 24)
    : s.timeRangeFilter === TimelineTimeRangeFilter.Child2
      ? currentData.months.filter((m) => m.month >= 25 && m.month <= 48)
      : s.timeRangeFilter === TimelineTimeRangeFilter.Post
        ? currentData.months.filter((m) => m.month >= 49)
        : currentData.months;

  const displayedMonths = [...filteredMonths].sort((a, b) => a.month - b.month);
  const chartPoints = displayedMonths.map(mapTimelineMonthToChartPoint);
  const activeSeriesKeys = getActiveTimelineSeriesKeys(displayedMonths);
  const seriesDefs = activeSeriesKeys.map((k) => WORKBENCH_SERIES_BY_KEY[k]);

  const aByMonth = new Map(aData.months.map((m) => [m.month, m]));
  const bByMonth = new Map(bData.months.map((m) => [m.month, m]));
  const cByMonth = new Map(cData.months.map((m) => [m.month, m]));

  const overlaySeries: readonly ChartOverlaySeries[] = [
    {
      key: "scenarioA",
      label: "Status Quo (A)",
      color: "var(--text-muted)",
      strokeWidth: 2,
      strokeDasharray: "4 4",
      values: displayedMonths.map((m) => aByMonth.get(m.month)?.monthlyTotal ?? null),
    },
    {
      key: "scenarioB",
      label: "Baseline (B)",
      color: "var(--color-warning)",
      strokeWidth: 2.25,
      values: displayedMonths.map((m) => bByMonth.get(m.month)?.monthlyTotal ?? null),
    },
    {
      key: "scenarioC",
      label: "Optimized (C)",
      color: "var(--color-gain)",
      strokeWidth: 3,
      values: displayedMonths.map((m) => cByMonth.get(m.month)?.monthlyTotal ?? null),
    },
  ];

  const firstB = bData.months[0];
  const baselineMonthlySalary = firstB
    ? toEuroAmount(firstB.husbandSalary + firstB.wifeSalary)
    : undefined;

  const renderTooltip = (
    ctx: TimeSeriesChartHoverContext<TimelineChartSeriesKey, TimelineMonth>,
  ): ComponentChildren => {
    const m = ctx.point.meta;
    if (!m) {
      return null;
    }
    return (
      <>
        <div className="ui-chart__tooltip-header">
          <div>
            <span className="ui-chart__tooltip-title">M{m.month} · {m.calendarLabel}</span>
            <div className="ui-chart__tooltip-meta">{m.taxClassLabel}</div>
          </div>
          <span className="ui-chart__tooltip-total tabular-nums">
            {formatEur(ctx.mode === TimeSeriesChartMode.Overlay ? m.monthlyTotal : ctx.activeTotals.netTotal)}
          </span>
        </div>
        {m.eventTag && <Badge tone={BadgeTone.Brand}>{m.eventTag}</Badge>}
        <div className="ui-chart__tooltip-list">
          {ctx.mode === TimeSeriesChartMode.Overlay ? (
            <>
              <div className="ui-chart__tooltip-row ui-chart__tooltip-row--positive">
                <span>Scenario C (Optimized)</span>
                <strong className="tabular-nums">{formatEur(cByMonth.get(m.month)?.monthlyTotal ?? 0)}</strong>
              </div>
              <div className="ui-chart__tooltip-row ui-chart__tooltip-row--warning">
                <span>Scenario B (Baseline)</span>
                <strong className="tabular-nums">{formatEur(bByMonth.get(m.month)?.monthlyTotal ?? 0)}</strong>
              </div>
              <div className="ui-chart__tooltip-row">
                <span>Scenario A (No Children)</span>
                <strong className="tabular-nums">{formatEur(aByMonth.get(m.month)?.monthlyTotal ?? 0)}</strong>
              </div>
            </>
          ) : (
            seriesDefs
              .filter((def) => Boolean(ctx.visibleSeries[def.key]) && Math.abs(ctx.point.values[def.key] ?? 0) > 0.5)
              .map((def) => (
                <div key={def.key} className="ui-chart__tooltip-row">
                  <span>{def.tooltipLabel ?? def.label}</span>
                  <strong className="tabular-nums">{formatEur(ctx.point.values[def.key] ?? 0)}</strong>
                </div>
              ))
          )}
        </div>
      </>
    );
  };

  return (
    <>
      <div className="plw-toolbar">
        <SegmentedControl
          compact
          label="Filter chart horizon"
          value={s.timeRangeFilter}
          options={[
            {
              value: TimelineTimeRangeFilter.All,
              label: "Full Plan",
            },
            {
              value: TimelineTimeRangeFilter.Child1,
              label: "M1–M24",
            },
            {
              value: TimelineTimeRangeFilter.Child2,
              label: "M25–M48",
            },
            {
              value: TimelineTimeRangeFilter.Post,
              label: "M49+",
            },
          ]}
          onChange={setWorkbenchTimeRange}
        />
      </div>

      <TimeSeriesChart<TimelineChartSeriesKey, TimelineMonth>
        title="Monthly Net Household Cashflow"
        subtitle={isCompare
          ? "Comparing Scenario C (Optimized), Scenario B (Baseline), and Scenario A (Status Quo)."
          : `${currentData.months.length}-month steady-salary projection with statutory Elterngeld, Mutterschutz, and annual tax reconciliation.`}
        points={chartPoints}
        series={seriesDefs}
        mode={abstractMode}
        modeOptions={isCompare ? undefined : MODE_OPTIONS}
        onModeChange={(next) => setWorkbenchChartMode(mapAbstractModeToTimelineMode(next))}
        overlaySeries={overlaySeries}
        referenceLine={baselineMonthlySalary !== undefined
          ? {
            value: baselineMonthlySalary,
            label: `Baseline Salary ${formatEur(baselineMonthlySalary)}/mo`,
          }
          : undefined}
        formatValue={(v: number) => formatEur(v)}
        renderTooltip={renderTooltip}
        onHoverIndexChange={(_index, point) => {
          workbenchHoveredMonth.value = point?.meta?.month ?? null;
        }}
      />

      <div className="plw-prose">
        <p>
          Over <strong>{s.simulationDurationMonths} months</strong>, your optimized plan yields{" "}
          <strong className="tabular-nums">{formatEur(cData.summary.grandTotal)}</strong> total net household cashflow{" "}
          (a <strong className="tabular-nums">{metrics.gainCvsB >= 0 ? "+" : ""}{formatEur(metrics.gainCvsB)}</strong>{" "}
          advantage over Baseline B via the{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.BEEG_2b }}>§ 2b BEEG</WikiRefLink>{" "}
          7-month tax-class majority rule). Monthly{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Topic,
            id: "parental-allowance" }}>Elterngeld</WikiRefLink>{" "}
          is capped at{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Parameter,
            id: ParameterId.Benefit_BasisMaximum }}>€1,800/mo Basis</WikiRefLink>{" "}
          and reconciled in your{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Topic,
            id: "joint-assessment" }}>joint annual tax return</WikiRefLink>{" "}
          under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_32b }}>§ 32b EStG</WikiRefLink>{" "}
          (<em>Progressionsvorbehalt</em>).
        </p>
      </div>

      <div className="plw-table-wrap">
        <table className="plw-table" aria-label="3-scenario side-by-side summary">
          <thead>
            <tr>
              <th>Metric</th>
              <th className="plw-table__num">Scenario C (Optimized)</th>
              <th className="plw-table__num">Scenario B (Baseline)</th>
              <th className="plw-table__num">Scenario A (No Births)</th>
              <th className="plw-table__num">Δ C vs B</th>
              <th className="plw-table__num">Δ C vs A</th>
            </tr>
          </thead>
          <tbody>
            {(() => {
              const cEg = cData.summary.totalWifeElterngeld + cData.summary.totalHusbandElterngeld;
              const bEg = bData.summary.totalWifeElterngeld + bData.summary.totalHusbandElterngeld;
              const egDeltaCB = cEg - bEg;
              const mutterDeltaCB = cData.summary.totalMutterschutz - bData.summary.totalMutterschutz;
              const kgDeltaCA = cData.summary.totalKindergeld - aData.summary.totalKindergeld;
              const taxDeltaCB = cData.summary.totalTaxRefunds - bData.summary.totalTaxRefunds;
              const taxDeltaCA = cData.summary.totalTaxRefunds - aData.summary.totalTaxRefunds;
              const kitaC = cData.summary.totalChildcareFees ?? 0;
              const kitaB = bData.summary.totalChildcareFees ?? 0;
              const signed = (v: number): string => `${v > 0 ? "+" : ""}${formatEur(v)}`;

              return (
                <>
                  <tr>
                    <td><strong>Total Household Cashflow</strong></td>
                    <td className="plw-table__num"><strong>{formatEur(cData.summary.grandTotal)}</strong></td>
                    <td className="plw-table__num">{formatEur(bData.summary.grandTotal)}</td>
                    <td className="plw-table__num">{formatEur(aData.summary.grandTotal)}</td>
                    <td className={`plw-table__num${metrics.gainCvsB >= 0 ? " plw-table__gain" : " plw-table__loss"}`}>
                      {signed(metrics.gainCvsB)}
                    </td>
                    <td className={`plw-table__num${metrics.diffCvsA >= 0 ? " plw-table__gain" : " plw-table__loss"}`}>
                      {signed(metrics.diffCvsA)}
                    </td>
                  </tr>
                  <tr>
                    <td>Elterngeld (Mother + Partner)</td>
                    <td className="plw-table__num">{formatEur(cEg)}</td>
                    <td className="plw-table__num">{formatEur(bEg)}</td>
                    <td className="plw-table__num">{formatEur(0)}</td>
                    <td className={`plw-table__num${egDeltaCB > 0 ? " plw-table__gain" : egDeltaCB < 0 ? " plw-table__loss" : ""}`}>
                      {signed(egDeltaCB)}
                    </td>
                    <td className={`plw-table__num${cEg > 0 ? " plw-table__gain" : ""}`}>
                      {signed(cEg)}
                    </td>
                  </tr>
                  <tr>
                    <td>Mutterschutz Pay</td>
                    <td className="plw-table__num">{formatEur(cData.summary.totalMutterschutz)}</td>
                    <td className="plw-table__num">{formatEur(bData.summary.totalMutterschutz)}</td>
                    <td className="plw-table__num">{formatEur(0)}</td>
                    <td className="plw-table__num">{signed(mutterDeltaCB)}</td>
                    <td className="plw-table__num">{signed(cData.summary.totalMutterschutz)}</td>
                  </tr>
                  <tr>
                    <td>Kindergeld (§ 66 EStG)</td>
                    <td className="plw-table__num">{formatEur(cData.summary.totalKindergeld)}</td>
                    <td className="plw-table__num">{formatEur(bData.summary.totalKindergeld)}</td>
                    <td className="plw-table__num">{formatEur(aData.summary.totalKindergeld)}</td>
                    <td className="plw-table__num">{formatEur(0)}</td>
                    <td className={`plw-table__num${kgDeltaCA > 0 ? " plw-table__gain" : ""}`}>
                      {signed(kgDeltaCA)}
                    </td>
                  </tr>
                  <tr>
                    <td>Annual Tax Settlements (§ 36 EStG)</td>
                    <td className="plw-table__num">{formatEur(cData.summary.totalTaxRefunds)}</td>
                    <td className="plw-table__num">{formatEur(bData.summary.totalTaxRefunds)}</td>
                    <td className="plw-table__num">{formatEur(aData.summary.totalTaxRefunds)}</td>
                    <td className="plw-table__num">{signed(taxDeltaCB)}</td>
                    <td className="plw-table__num">{signed(taxDeltaCA)}</td>
                  </tr>
                  <tr>
                    <td>Daycare / Kita Outflows</td>
                    <td className="plw-table__num">{kitaC > 0 ? `-${formatEur(kitaC)}` : formatEur(0)}</td>
                    <td className="plw-table__num">{kitaB > 0 ? `-${formatEur(kitaB)}` : formatEur(0)}</td>
                    <td className="plw-table__num">{formatEur(0)}</td>
                    <td className="plw-table__num">{formatEur(0)}</td>
                    <td className={`plw-table__num${kitaC > 0 ? " plw-table__loss" : ""}`}>
                      {kitaC > 0 ? `-${formatEur(kitaC)}` : formatEur(0)}
                    </td>
                  </tr>
                </>
              );
            })()}
          </tbody>
        </table>
      </div>
    </>
  );
}
