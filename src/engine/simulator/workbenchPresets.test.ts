import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  AnnualSalariesCount,
} from "#engine/types";
import {
  WORKBENCH_PRESETS,
  WorkbenchPresetId,
  buildWorkbenchPresetState,
  toWorkbenchPresetId,
} from "#engine/simulator/workbenchPresets";

describe("workbenchPresets steady-salary starter templates", () => {
  it("validates preset identifiers strictly", () => {
    assert.equal(toWorkbenchPresetId("classic-one-child"), WorkbenchPresetId.ClassicOneChild);
    assert.throws(() => toWorkbenchPresetId("invalid"), TypeError);
  });

  it("builds valid steady-salary states with zero default raises or 13th-month noise", () => {
    for (const preset of WORKBENCH_PRESETS) {
      const state = buildWorkbenchPresetState(preset.id);
      assert.equal(state.enableSalaryRaises, false);
      assert.equal(state.annualSalaryRaisePercent, 0);
      assert.equal(state.enable13thSalary, false);
      assert.equal(state.husbandSalariesCount, AnnualSalariesCount.Twelve);
      assert.equal(state.wifeSalariesCount, AnnualSalariesCount.Twelve);
      assert.equal(state.customSalaryRaises.length, 0);
    }

    const classic = buildWorkbenchPresetState(WorkbenchPresetId.ClassicOneChild);
    assert.equal(classic.customPregnancies.length, 1);
    assert.equal(classic.customTaxClassSwitches.length, 1);

    const twoKids = buildWorkbenchPresetState(WorkbenchPresetId.TwoChildrenSiblingBonus);
    assert.equal(twoKids.customPregnancies.length, 2);

    const blank = buildWorkbenchPresetState(WorkbenchPresetId.BlankPlan);
    assert.equal(blank.customPregnancies.length, 0);
    assert.equal(blank.customTaxClassSwitches.length, 0);
  });
});
