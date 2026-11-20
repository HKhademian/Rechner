import {
  type JSX,
} from "preact";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import {
  CashFlowChartGraphic,
} from "./Icons";

export interface CashFlowChartComparisonSeries {
  readonly id: string;
  readonly label: string;
  readonly balances: readonly number[];
}

export interface CashFlowChartProps {
  readonly balances: readonly number[];
  readonly historyBoundaryIndex?: number;
  readonly horizonLabel?: string;
  readonly subtitle?: string;
  readonly comparisonSeries?: readonly CashFlowChartComparisonSeries[];
}

/** A visual summary of the same estimates presented in the adjacent table. */
export default function CashFlowChart({
  balances,
  historyBoundaryIndex,
  horizonLabel,
  subtitle = "based on your assumptions",
  comparisonSeries = [],
}: CashFlowChartProps): JSX.Element {
  const allValues = [
    ...balances,
    ...comparisonSeries.flatMap((series) => series.balances),
  ];
  const scale = Math.max(1, ...allValues.map(Math.abs));
  const normalize = (values: readonly number[]): readonly number[] => values.map((balance) => balance / scale);
  const normalizedAll = normalize(allValues);
  const low = Math.min(0, ...normalizedAll);
  const high = Math.max(0, ...normalizedAll);
  const range = high - low || 1;
  const xFor = (index: number, count: number): number => count <= 1 ? 12 : 12 + index * 276 / (count - 1);
  const yFor = (normalizedValue: number): number => 88 - (normalizedValue - low) * 76 / range;
  const toPoints = (values: readonly number[], startIndex = 0, totalCount = values.length): string => normalize(values)
    .map((value, offset) => `${xFor(startIndex + offset, totalCount)},${yFor(value)}`)
    .join(" ");

  const zeroY = yFor(0);
  const hasSplit = historyBoundaryIndex !== undefined
    && historyBoundaryIndex > 0
    && historyBoundaryIndex < balances.length - 1;
  const historyPoints = hasSplit
    ? toPoints(balances.slice(0, historyBoundaryIndex + 1), 0, balances.length)
    : historyBoundaryIndex !== undefined && historyBoundaryIndex >= balances.length - 1
      ? toPoints(balances)
      : undefined;
  const projectionPoints = hasSplit
    ? toPoints(balances.slice(historyBoundaryIndex), historyBoundaryIndex, balances.length)
    : historyBoundaryIndex === 0
      ? toPoints(balances)
      : undefined;
  const splitX = hasSplit ? xFor(historyBoundaryIndex, balances.length) : undefined;
  const comparisonLines = comparisonSeries
    .filter((series) => series.balances.length === balances.length)
    .map((series) => ({
      id: series.id,
      points: toPoints(series.balances),
    }));
  const endLabel = horizonLabel ?? `After ${Math.max(1, balances.length - 1)} months`;

  return <figure className="life-monthly__chart">
    <figcaption>Estimated closing balance <span>· {subtitle}</span></figcaption>
    <CashFlowChartGraphic
      points={historyPoints || projectionPoints ? undefined : toPoints(balances)}
      historyPoints={historyPoints}
      projectionPoints={projectionPoints}
      splitX={splitX}
      zeroY={zeroY}
      comparisonLines={comparisonLines}
    />
    <div className="life-monthly__chart-labels" aria-hidden="true">
      <span>Opening: {formatIntegerEuroCents(balances[0])}</span>
      {hasSplit && <span>Solid: history · Dashed: forecast</span>}
      <span>{endLabel}: {formatIntegerEuroCents(balances[balances.length - 1])}</span>
    </div>
    {comparisonSeries.length > 0 && <div className="life-monthly__chart-legend">
      {comparisonSeries.map((series) => <span key={series.id}>
        Comparison: {series.label} ({formatIntegerEuroCents(series.balances[series.balances.length - 1])})
      </span>)}
    </div>}
  </figure>;
}
