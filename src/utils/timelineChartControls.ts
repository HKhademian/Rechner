import {
  TimelineChartMode,
} from "#engine/types";

export interface ChartModeOption {
  readonly value: TimelineChartMode;
  readonly label: string;
}

/** Canonical chart view mode options shared across the Parental Leave timeline. */
export const TIMELINE_CHART_MODE_OPTIONS: readonly ChartModeOption[] = [
  {
    value: TimelineChartMode.StackedBar,
    label: "Stacked Bar",
  },
  {
    value: TimelineChartMode.Lines,
    label: "Line Series",
  },
  {
    value: TimelineChartMode.Area,
    label: "Area Trend",
  },
  {
    value: TimelineChartMode.Compare,
    label: "Compare",
  },
] as const;

/** Human-readable chart mode label lookup. */
export function chartModeLabel(mode: TimelineChartMode): string {
  return TIMELINE_CHART_MODE_OPTIONS.find((item) => item.value === mode)?.label ?? mode;
}
