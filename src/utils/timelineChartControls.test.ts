import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  TimelineChartMode,
} from "#engine/types";
import {
  TIMELINE_CHART_MODE_OPTIONS,
  chartModeLabel,
} from "./timelineChartControls.ts";

describe("timelineChartControls", () => {
  it("exposes every TimelineChartMode with a concise human label", () => {
    const values = TIMELINE_CHART_MODE_OPTIONS.map((option) => option.value);
    assert.deepEqual(values, [
      TimelineChartMode.StackedBar,
      TimelineChartMode.Lines,
      TimelineChartMode.Area,
      TimelineChartMode.Compare,
    ]);
    assert.equal(chartModeLabel(TimelineChartMode.StackedBar), "Stacked Bar");
    assert.equal(chartModeLabel(TimelineChartMode.Compare), "Compare");
  });
});
