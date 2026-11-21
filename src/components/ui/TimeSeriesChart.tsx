import type {
  JSX,
} from "preact";
import {
  SegmentedControl,
} from "#components/ui/SegmentedControl";
import {
  type TimeSeriesChartCoreProps,
  type TimeSeriesChartHoverContext,
  type TimeSeriesChartModeOption,
  type TimeSeriesChartPoint,
  TimeSeriesChartCore,
} from "#/components/ui/timeSeriesChartCore.ts";
import {
  type TimeSeriesChartMode,
} from "#/components/ui/timeSeriesChartEngine.ts";
import "./TimeSeriesChart.css";

export type {
  TimeSeriesChartHoverContext,
  TimeSeriesChartModeOption,
  TimeSeriesChartPoint,
};

export interface TimeSeriesChartProps<TKey extends string = string, TMeta = undefined>
  extends Omit<TimeSeriesChartCoreProps<TKey, TMeta>, "modeControl"> {
  readonly modeOptions?: readonly TimeSeriesChartModeOption[];
  readonly onModeChange?: (mode: TimeSeriesChartMode) => void;
  readonly modeControlLabel?: string;
}

/**
 * Shared institutional `<TimeSeriesChart />` UI primitive.
 *
 * Wraps the pure-TS hydration-safe `TimeSeriesChartCore` with tokenized CSS styles
 * and the shared `<SegmentedControl />` mode switcher. Strictly domain-agnostic.
 */
export function TimeSeriesChart<TKey extends string = string, TMeta = undefined>({
  mode,
  modeOptions,
  onModeChange,
  modeControlLabel = "Chart display mode",
  ...rest
}: TimeSeriesChartProps<TKey, TMeta>): JSX.Element {
  const modeControl =
    modeOptions && modeOptions.length > 0 && onModeChange ? (
      <SegmentedControl
        compact
        label={modeControlLabel}
        value={mode}
        options={modeOptions}
        onChange={onModeChange}
      />
    ) : undefined;

  return (
    <TimeSeriesChartCore
      {...rest}
      mode={mode}
      modeControl={modeControl}
    />
  );
}
