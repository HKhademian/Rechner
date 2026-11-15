export const MetricTone = {
  Neutral: "neutral",
  Primary: "primary",
  Gain: "gain",
  Loss: "loss",
} as const;
export type MetricTone = (typeof MetricTone)[keyof typeof MetricTone];

export function isMetricTone(value: unknown): value is MetricTone {
  return typeof value === "string" && Object.values(MetricTone).includes(value as MetricTone);
}

export function metricToneClass(tone: MetricTone, highlight = false): string {
  return `ui-card ui-metric-card ui-metric-card--${tone}${highlight ? " ui-metric-card--highlight" : ""}`;
}
