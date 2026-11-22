import type {
  ComponentChildren,
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
} from "#components/ui/Badge";
import {
  Disclosure,
} from "#components/ui/Disclosure";
import {
  type TimeSeriesChartHoverContext,
  type TimeSeriesChartModeOption,
  TimeSeriesChart,
} from "#components/ui/TimeSeriesChart";
import {
  type ChartOverlaySeries,
  type ChartSeriesDefinition,
  TimeSeriesChartMode,
  TimeSeriesTone,
} from "#/components/ui/timeSeriesChartEngine.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  TIMELINE_CHART_MODE_OPTIONS,
} from "#utils/timelineChartControls";
import {
  TimelineChartSeriesKey,
  classifySpecialEventSeriesKey,
  getActiveTimelineSeriesKeys,
  getMonthSeriesValue,
  mapAbstractModeToTimelineMode,
  mapTimelineModeToAbstractMode,
  mapTimelineMonthToChartPoint,
} from "#utils/timelineChartGeometry";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  chartMode,
  timeRangeFilter,
  displayedScenarioAData,
  displayedScenarioBData,
  displayedScenarioCData,
  displayedCurrentScenarioData,
  hoveredMonth,
} from "#store/elterngeldStore";
import LawRefLink from "#components/laws/LawRefLink";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";
import {
  type TimelineMonth,
  TimelineTimeRangeFilter,
  toEuroAmount,
} from "#engine/types";
import "./TimelineChart.css";

function formatCurrency(amount: number, maximumFractionDigits = 0): string {
  return formatEur(amount || 0, maximumFractionDigits);
}

const ELTERNGELD_SERIES_BY_KEY: Readonly<
  Record<TimelineChartSeriesKey, ChartSeriesDefinition<TimelineChartSeriesKey>>
> = Object.freeze({
  [TimelineChartSeriesKey.HusbandSalary]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandSalary,
    label: "Husband Salary",
    tooltipLabel: "Husband Net Salary:",
    color: "var(--series-salary-husband)",
    seriesClass: "timeline-chart__series--husband-salary",
  }),
  [TimelineChartSeriesKey.WifeSalary]: Object.freeze({
    key: TimelineChartSeriesKey.WifeSalary,
    label: "Wife Salary",
    tooltipLabel: "Wife Net Salary:",
    color: "var(--series-salary-wife)",
    seriesClass: "timeline-chart__series--wife-salary",
  }),
  [TimelineChartSeriesKey.Mutterschutz]: Object.freeze({
    key: TimelineChartSeriesKey.Mutterschutz,
    label: "Maternity (Mutterschutz)",
    tooltipLabel: "Maternity Pay (MuSchG):",
    color: "var(--series-mutterschutz)",
    seriesClass: "timeline-chart__series--mutterschutz",
  }),
  [TimelineChartSeriesKey.WifeElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.WifeElterngeld,
    label: "Elterngeld (Mother)",
    tooltipLabel: "Elterngeld (Mother / §§ 4, 4a BEEG):",
    color: "var(--series-elterngeld-mother)",
    seriesClass: "timeline-chart__series--wife-elterngeld",
    tooltipTone: TimeSeriesTone.Positive,
  }),
  [TimelineChartSeriesKey.HusbandElterngeld]: Object.freeze({
    key: TimelineChartSeriesKey.HusbandElterngeld,
    label: "Partner Months (Father)",
    tooltipLabel: "Partner Months (Father / §§ 4, 4b BEEG):",
    color: "var(--series-elterngeld-father)",
    seriesClass: "timeline-chart__series--husband-elterngeld",
    tooltipTone: TimeSeriesTone.Warning,
  }),
  [TimelineChartSeriesKey.Kindergeld]: Object.freeze({
    key: TimelineChartSeriesKey.Kindergeld,
    label: "Child Benefit (Kindergeld)",
    tooltipLabel: "Child Benefit (Kindergeld, § 66 EStG):",
    color: "var(--series-kindergeld)",
    seriesClass: "timeline-chart__series--kindergeld",
  }),
  [TimelineChartSeriesKey.SalaryBonuses]: Object.freeze({
    key: TimelineChartSeriesKey.SalaryBonuses,
    label: "Salary Bonuses (13th+ / Annual)",
    tooltipLabel: "Salary Bonuses (13th+ / Annual):",
    color: "var(--series-salary-bonuses)",
    seriesClass: "timeline-chart__series--salary-bonuses",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.InvestmentReturns]: Object.freeze({
    key: TimelineChartSeriesKey.InvestmentReturns,
    label: "Investment Returns",
    tooltipLabel: "Investment Returns (§ 20 EStG):",
    color: "var(--series-investment-returns)",
    seriesClass: "timeline-chart__series--investment-returns",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.CustomIncome]: Object.freeze({
    key: TimelineChartSeriesKey.CustomIncome,
    label: "One-Off Income / Grants",
    tooltipLabel: "One-Off Income / Grants:",
    color: "var(--series-custom-income)",
    seriesClass: "timeline-chart__series--custom-income",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.TaxRefund]: Object.freeze({
    key: TimelineChartSeriesKey.TaxRefund,
    label: "Tax Settlement (Finanzamt)",
    tooltipLabel: "Tax Settlement (§ 36 EStG):",
    color: "var(--series-tax-refund)",
    seriesClass: "timeline-chart__series--tax-refund",
    tooltipTone: TimeSeriesTone.Positive,
    showPositiveSign: true,
  }),
  [TimelineChartSeriesKey.DaycareFees]: Object.freeze({
    key: TimelineChartSeriesKey.DaycareFees,
    label: "Daycare / Kita Fees",
    tooltipLabel: "Daycare / Kita Fees:",
    color: "var(--series-daycare-fees)",
    seriesClass: "timeline-chart__series--daycare-fees",
    tooltipTone: TimeSeriesTone.Negative,
  }),
  [TimelineChartSeriesKey.CustomCosts]: Object.freeze({
    key: TimelineChartSeriesKey.CustomCosts,
    label: "One-Off Costs / Expenses",
    tooltipLabel: "One-Off Costs / Expenses:",
    color: "var(--series-custom-costs)",
    seriesClass: "timeline-chart__series--custom-costs",
    tooltipTone: TimeSeriesTone.Negative,
  }),
});

const ABSTRACT_MODE_OPTIONS: readonly TimeSeriesChartModeOption[] = Object.freeze(
  TIMELINE_CHART_MODE_OPTIONS.map((option) =>
    Object.freeze({
      value: mapTimelineModeToAbstractMode(option.value),
      label: option.label,
    })),
);

const ScenarioOverlayKey = {
  StatusQuoA: "scenarioA",
  BaselineB: "scenarioB",
  OptimizedC: "scenarioC",
} as const;

export default function TimelineChart(): JSX.Element {
  const hydrated = useHydrated();

  const activeTimelineMode = hydrated
    ? chartMode.value
    : mapAbstractModeToTimelineMode(TimeSeriesChartMode.StackedBar);
  const abstractMode = mapTimelineModeToAbstractMode(activeTimelineMode);
  const filter = hydrated ? timeRangeFilter.value : TimelineTimeRangeFilter.All;

  const currentData = displayedCurrentScenarioData.value;
  const aData = displayedScenarioAData.value;
  const bData = displayedScenarioBData.value;
  const cData = displayedScenarioCData.value;

  const filteredMonths = hydrated
    ? filter === TimelineTimeRangeFilter.Child1
      ? currentData.months.filter((m) => m.month <= 24)
      : filter === TimelineTimeRangeFilter.Child2
        ? currentData.months.filter((m) => m.month >= 25 && m.month <= 48)
        : filter === TimelineTimeRangeFilter.Post
          ? currentData.months.filter((m) => m.month >= 49)
          : currentData.months
    : [];

  const displayedMonths = [...filteredMonths].sort((a, b) => a.month - b.month);
  const chartPoints = displayedMonths.map(mapTimelineMonthToChartPoint);

  // Core 7 series always visible in legend + any active granular bonus/event series
  const activeSeriesKeys = getActiveTimelineSeriesKeys(displayedMonths);
  const activeSeriesDefinitions = activeSeriesKeys.map(
    (key) => ELTERNGELD_SERIES_BY_KEY[key],
  );
  const activeSeriesTopToBottom = [...activeSeriesDefinitions].reverse();

  const aByMonth = new Map(aData.months.map((m) => [m.month, m]));
  const bByMonth = new Map(bData.months.map((m) => [m.month, m]));
  const cByMonth = new Map(cData.months.map((m) => [m.month, m]));

  const overlaySeries: readonly ChartOverlaySeries[] = [
    {
      key: ScenarioOverlayKey.StatusQuoA,
      label: "Status Quo (A · No Children)",
      color: "var(--text-muted)",
      swatchClass: "timeline-chart__compare-swatch--a",
      strokeWidth: 2.25,
      strokeDasharray: "4 4",
      values: displayedMonths.map((m) => aByMonth.get(m.month)?.monthlyTotal ?? null),
    },
    {
      key: ScenarioOverlayKey.BaselineB,
      label: "Unoptimized Baseline (B)",
      color: "var(--color-warning)",
      swatchClass: "timeline-chart__compare-swatch--b",
      strokeWidth: 2.5,
      values: displayedMonths.map((m) => bByMonth.get(m.month)?.monthlyTotal ?? null),
    },
    {
      key: ScenarioOverlayKey.OptimizedC,
      label: "Statutory Optimized (C)",
      color: "var(--color-gain)",
      swatchClass: "timeline-chart__compare-swatch--c",
      strokeWidth: 3.25,
      values: displayedMonths.map((m) => cByMonth.get(m.month)?.monthlyTotal ?? null),
    },
  ];

  const referenceMonth = hydrated ? bData.months[0] : undefined;
  const referenceProfile = referenceMonth
    ? bData.configuration?.taxProfiles.find(
      (profile) => profile.calendarYear === referenceMonth.calendarYearNum,
    )
    : undefined;
  const referenceSalary = referenceMonth
    ? toEuroAmount(referenceMonth.husbandSalary + referenceMonth.wifeSalary)
    : undefined;
  const referenceProvisional = referenceMonth !== undefined && (
    !referenceMonth.payroll ||
    [referenceMonth.payroll.husband, referenceMonth.payroll.wife].some(
      (payroll) => payroll.payrollLimitations.length > 0,
    )
  );

  const referenceAside: ComponentChildren =
    referenceMonth && referenceSalary !== undefined ? (
      <div className="timeline-chart__reference">
        <p className="timeline-chart__reference-line">
          Salary reference: {formatCurrency(referenceSalary, 2)} / month · Scenario B,{" "}
          {referenceMonth.calendarLabel}. Initial net salaries only; later pay, benefits and
          one-off cash may differ.
          {referenceProvisional && " Provisional payroll estimate."}
        </p>
        <Disclosure title="Inspect reference source" subtle>
          <div className="timeline-chart__reference-details">
            <p>
              Scenario B ledger · {referenceMonth.relativeMonthLabel || referenceMonth.relativeBirthLabel} ({referenceMonth.calendarLabel}) · {referenceMonth.taxClassLabel}
            </p>
            <p className="tabular-nums">
              Husband {formatCurrency(referenceMonth.husbandSalary, 2)} + wife{" "}
              {formatCurrency(referenceMonth.wifeSalary, 2)} ={" "}
              {formatCurrency(referenceSalary, 2)}. Benefits, bonuses and annual tax settlements
              are excluded from this salary benchmark.
            </p>
            {referenceProfile && (
              <p>
                <LawRefLink
                  lawId={LawId.BMF_PAP}
                  groupId={LawGroupId.EStG_PayrollWithholding}
                  label={`Official payroll rules · ${referenceProfile.sourceYear}`}
                />
                {referenceProfile.projected && ` · Projected to ${referenceProfile.calendarYear}`}
                {referenceProvisional && " · Provisional values based on your supplied inputs."}
              </p>
            )}
          </div>
        </Disclosure>
      </div>
    ) : undefined;

  const renderElterngeldTooltip = (
    context: TimeSeriesChartHoverContext<TimelineChartSeriesKey, TimelineMonth>,
  ): ComponentChildren => {
    const month = context.point.meta;
    if (!month) {
      return null;
    }
    const isCompare = context.mode === TimeSeriesChartMode.Overlay;
    const compareA = aByMonth.get(month.month);
    const compareB = bByMonth.get(month.month);
    const compareC = cByMonth.get(month.month);

    const visibleSubEvents = month.specialEvents.filter((event) => {
      const key = classifySpecialEventSeriesKey(event);
      return key !== null && Boolean(context.visibleSeries[key]);
    });

    return (
      <>
        <div className="ui-chart__tooltip-header">
          <div>
            <span className="ui-chart__tooltip-title">
              {month.relativeMonthLabel || month.relativeBirthLabel}
            </span>
            <span className="ui-chart__tooltip-sublabel">
              {month.calendarLabel}
            </span>
            <div className="ui-chart__tooltip-meta">
              {month.daySplit ? month.daySplit.summaryLabel : month.taxClassLabel}
            </div>
          </div>
          <span className="ui-chart__tooltip-total tabular-nums">
            {formatCurrency(isCompare ? month.monthlyTotal : context.activeTotals.netTotal)}
          </span>
        </div>

        {month.eventTag && (
          <div className="timeline-chart__tooltip-event">
            <Badge tone={BadgeTone.Brand}>{month.eventTag}</Badge>
          </div>
        )}

        {isCompare ? (
          <div className="ui-chart__tooltip-list">
            {compareC && (
              <div className="ui-chart__tooltip-row ui-chart__tooltip-row--positive">
                <span className="ui-chart__tooltip-row-label">
                  <span className="ui-chart__overlay-swatch timeline-chart__compare-swatch--c" />
                  Scenario C (Optimized):
                </span>
                <span className="ui-chart__tooltip-row-val tabular-nums">
                  {formatCurrency(compareC.monthlyTotal)}
                </span>
              </div>
            )}
            {compareB && (
              <div className="ui-chart__tooltip-row ui-chart__tooltip-row--warning">
                <span className="ui-chart__tooltip-row-label">
                  <span className="ui-chart__overlay-swatch timeline-chart__compare-swatch--b" />
                  Scenario B (Baseline):
                </span>
                <span className="ui-chart__tooltip-row-val tabular-nums">
                  {formatCurrency(compareB.monthlyTotal)}
                </span>
              </div>
            )}
            {compareA && (
              <div className="ui-chart__tooltip-row">
                <span className="ui-chart__tooltip-row-label">
                  <span className="ui-chart__overlay-swatch timeline-chart__compare-swatch--a" />
                  Scenario A (Status Quo):
                </span>
                <span className="ui-chart__tooltip-row-val tabular-nums">
                  {formatCurrency(compareA.monthlyTotal)}
                </span>
              </div>
            )}
            {compareB && compareC && (
              <div
                className={[
                  "ui-chart__tooltip-row",
                  compareC.monthlyTotal - compareB.monthlyTotal >= 0
                    ? "ui-chart__tooltip-row--positive"
                    : "ui-chart__tooltip-row--negative",
                ].join(" ")}
              >
                <span className="ui-chart__tooltip-row-label">Δ C vs. B:</span>
                <span className="ui-chart__tooltip-row-val tabular-nums">
                  {compareC.monthlyTotal - compareB.monthlyTotal >= 0 ? "+" : ""}
                  {formatCurrency(compareC.monthlyTotal - compareB.monthlyTotal)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <>
            <div className="timeline-chart__tooltip-status">
              Status: <strong>{month.taxClassLabel}</strong>
            </div>

            <div className="ui-chart__tooltip-list">
              {(() => {
                const activeRows = activeSeriesTopToBottom.filter((seriesDef) => {
                  if (!context.visibleSeries[seriesDef.key]) {
                    return false;
                  }
                  return getMonthSeriesValue(month, seriesDef.key) !== 0;
                });
                if (activeRows.length === 0) {
                  return (
                    <div className="ui-chart__tooltip-empty">
                      No visible cashflow series in this month.
                    </div>
                  );
                }
                return activeRows.map((seriesDef) => {
                  const val = getMonthSeriesValue(month, seriesDef.key);
                  const toneClass =
                    val < 0
                      ? "ui-chart__tooltip-row--negative"
                      : seriesDef.tooltipTone === TimeSeriesTone.Positive
                        ? "ui-chart__tooltip-row--positive"
                        : seriesDef.tooltipTone === TimeSeriesTone.Warning
                          ? "ui-chart__tooltip-row--warning"
                          : "";
                  return (
                    <div
                      key={seriesDef.key}
                      className={[
                        "ui-chart__tooltip-row",
                        seriesDef.seriesClass ?? "",
                        toneClass,
                      ].filter(Boolean).join(" ")}
                    >
                      <span className="ui-chart__tooltip-row-label">
                        <span className="ui-chart__dot" />
                        {seriesDef.tooltipLabel ?? `${seriesDef.label}:`}
                      </span>
                      <span className="ui-chart__tooltip-row-val tabular-nums">
                        {val > 0 && seriesDef.showPositiveSign ? "+" : ""}
                        {formatCurrency(val)}
                      </span>
                    </div>
                  );
                });
              })()}
            </div>

            {visibleSubEvents.length > 0 && (
              <div className="timeline-chart__tooltip-subevents">
                {visibleSubEvents.map((event) => (
                  <div
                    key={event.eventId}
                    className="timeline-chart__tooltip-subevent-row"
                  >
                    <span>↳ {event.title}</span>
                    <span className="tabular-nums">
                      {event.amount > 0 ? "+" : ""}
                      {formatCurrency(event.amount)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </>
    );
  };

  return (
    <TimeSeriesChart<TimelineChartSeriesKey, TimelineMonth>
      title={
        hydrated
          ? `Monthly Cash Inflow & Benefits Timeline (${displayedMonths.length} Months)`
          : "Monthly Cash Inflow & Benefits Timeline"
      }
      subtitle="Monthly net salaries, parental benefits, Kindergeld, salary bonuses, daycare fees, one-off events, and tax settlements."
      headerAside={referenceAside}
      mode={abstractMode}
      modeOptions={ABSTRACT_MODE_OPTIONS}
      modeControlLabel="Timeline chart view"
      onModeChange={(nextMode) => {
        chartMode.value = mapAbstractModeToTimelineMode(nextMode);
      }}
      series={activeSeriesDefinitions}
      points={chartPoints}
      overlaySeries={overlaySeries}
      overlayLegendLabel="Scenarios:"
      seriesLegendLabel="Series:"
      referenceLine={
        referenceMonth && referenceSalary !== undefined
          ? {
            value: referenceSalary,
            label: `Initial net salaries · B · ${referenceMonth.calendarLabel}: ${formatCurrency(referenceSalary, 2)} / mo`,
          }
          : undefined
      }
      formatValue={(val) => formatCurrency(val)}
      renderTooltip={renderElterngeldTooltip}
      onHoverIndexChange={(_index, point) => {
        hoveredMonth.value = point?.meta?.month ?? null;
      }}
      hydrated={hydrated}
    />
  );
}
