import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  FORM_PROJECTION_PROFILES,
  FormProjectionProfileId,
  getFormProjectionProfile,
  getProjectionProfileForApp,
  isFormProjectionProfileId,
  projectParametersForProfile,
  toFormProjectionProfileId,
} from "#engine/parameters/projections";
import {
  getAllParameterDefinitions,
} from "#engine/parameters/registry";
import {
  ParameterDomain,
  ParameterId,
} from "#engine/parameters/types";
import {
  toFullCalendarYear,
} from "#engine/types";

describe("Form Projection Profiles & Out-of-Focus Default Projections", () => {
  it("partitions every ParameterDomain cleanly into focused and projected-out sets across all profiles", () => {
    const allDomains = new Set<ParameterDomain>(Object.values(ParameterDomain));
    for (const profile of Object.values(FORM_PROJECTION_PROFILES)) {
      const combined = new Set<ParameterDomain>([
        ...profile.focusedDomains,
        ...profile.projectedOutDomains,
      ]);
      assert.equal(combined.size, allDomains.size, `Profile ${profile.id} misses a ParameterDomain`);
      for (const focused of profile.focusedDomains) {
        assert.equal(
          profile.projectedOutDomains.includes(focused),
          false,
          `Profile ${profile.id} overlaps focused & projected-out domain ${focused}`,
        );
      }
    }

    assert.equal(isFormProjectionProfileId(FormProjectionProfileId.NetPayFocus), true);
    assert.equal(isFormProjectionProfileId("unknown_profile"), false);
    assert.equal(toFormProjectionProfileId("net_pay_focus"), FormProjectionProfileId.NetPayFocus);
    assert.throws(() => toFormProjectionProfileId("unknown_profile"), TypeError);

    assert.equal(getProjectionProfileForApp(AppId.NetPay).id, FormProjectionProfileId.NetPayFocus);
    assert.equal(getProjectionProfileForApp(AppId.ParentalLeave).id, FormProjectionProfileId.ParentalLeaveFocus);
    assert.equal(getProjectionProfileForApp(AppId.GiroCode).id, FormProjectionProfileId.GiroCodeFocus);
    assert.equal(getProjectionProfileForApp(AppId.Catalog).id, FormProjectionProfileId.FullCatalog);
  });

  it("projects year defaults for out-of-focus domains while preserving overrides inside focused domains", () => {
    const totalRegistryCount = getAllParameterDefinitions().length;
    const overrides = {
      [ParameterId.Tax_HealthSupplementTotalRate]: 0.031,
      [ParameterId.Convention_MotherOrdinaryPlusMonths]: 8,
    };

    const netPayView = projectParametersForProfile(
      FormProjectionProfileId.NetPayFocus,
      toFullCalendarYear(2026),
      overrides,
    );
    assert.equal(netPayView.totalCount, totalRegistryCount);
    assert.equal(netPayView.focusedParameters.length + netPayView.projectedOutParameters.length, totalRegistryCount);

    const netPayHealth = netPayView.focusedParameters.find(
      (item) => item.definition.id === ParameterId.Tax_HealthSupplementTotalRate,
    );
    assert.equal(netPayHealth?.activeValue, 0.031);
    assert.equal(netPayHealth?.overridden, true);

    const netPayMaternityConvention = netPayView.projectedOutParameters.find(
      (item) => item.definition.id === ParameterId.Convention_MotherOrdinaryPlusMonths,
    );
    assert.ok(netPayMaternityConvention);
    assert.equal(netPayMaternityConvention.activeValue, netPayMaternityConvention.baselineValue);
    assert.equal(netPayMaternityConvention.overridden, false);

    const parentalView = projectParametersForProfile(
      FormProjectionProfileId.ParentalLeaveFocus,
      toFullCalendarYear(2026),
      overrides,
    );
    const parentalMotherConvention = parentalView.focusedParameters.find(
      (item) => item.definition.id === ParameterId.Convention_MotherOrdinaryPlusMonths,
    );
    assert.equal(parentalMotherConvention?.activeValue, 8);
    assert.equal(parentalMotherConvention?.overridden, true);

    const fullView = projectParametersForProfile(
      getFormProjectionProfile(FormProjectionProfileId.FullCatalog).id,
      toFullCalendarYear(2026),
      overrides,
    );
    assert.equal(fullView.focusedParameters.length, totalRegistryCount);
    assert.equal(fullView.projectedOutParameters.length, 0);
  });
});
