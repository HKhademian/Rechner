import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  MetricTone,
  isMetricTone,
  metricToneClass,
} from "#utils/metricTone";

it("validates metric tones and composes institutional card classes", () => {
  assert.equal(isMetricTone(MetricTone.Gain), true);
  assert.equal(isMetricTone("unknown"), false);
  assert.equal(
    metricToneClass(MetricTone.Primary),
    "ui-card ui-metric-card ui-metric-card--primary",
  );
  assert.equal(
    metricToneClass(MetricTone.Loss, true),
    "ui-card ui-metric-card ui-metric-card--loss ui-metric-card--highlight",
  );
});
