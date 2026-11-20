import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  assetAffordabilityStore,
} from "#/apps/asset-affordability/assetAffordabilityStore.ts";
import {
  childcarePlannerStore,
} from "#/apps/childcare-planner/childcarePlannerStore.ts";
import {
  citizenshipStore,
} from "#/apps/citizenship/citizenshipStore.ts";
import {
  familyMilestonesStore,
} from "#/apps/family-milestones/familyMilestonesStore.ts";
import {
  permanentResidencyStore,
} from "#/apps/permanent-residency/permanentResidencyStore.ts";
import {
  planningDashboardStore,
} from "#/apps/planning-dashboard/planningDashboardStore.ts";
import {
  resignationRunwayStore,
} from "#/apps/resignation-runway/resignationRunwayStore.ts";
import {
  taxClassSwitchStore,
} from "#/apps/tax-class-switch/taxClassSwitchStore.ts";
import {
  travelPlannerStore,
} from "#/apps/travel-planner/travelPlannerStore.ts";
import {
  CitizenshipPathway,
} from "#engine/lifeProfile/citizenshipPreparation";
import {
  PlanningPriority,
} from "#engine/lifeProfile/planningAssistant";
import {
  PermanentResidencyRoute,
} from "#engine/lifeProfile/residencyPreparation";
import {
  TaxClassCombination,
} from "#engine/lifeProfile/taxSwitchEvent";

describe("standalone intent-based planning tool stores", () => {
  it("supports isolated updates, validation clamping and clean reset across all 9 stores", () => {
    resignationRunwayStore.update((s) => ({ ...s,
      openingSavingsEur: 42000,
      waitingPeriodMonths: 2 }));
    assert.equal(resignationRunwayStore.state.value.openingSavingsEur, 42000);
    assert.equal(resignationRunwayStore.state.value.waitingPeriodMonths, 2);
    resignationRunwayStore.reset();
    assert.deepEqual(resignationRunwayStore.state.value, resignationRunwayStore.defaultState);

    permanentResidencyStore.update((s) => ({ ...s,
      route: PermanentResidencyRoute.BlueCardA1,
      absenceDays: 45 }));
    assert.equal(permanentResidencyStore.state.value.route, PermanentResidencyRoute.BlueCardA1);
    assert.equal(permanentResidencyStore.state.value.absenceDays, 45);
    permanentResidencyStore.reset();
    assert.deepEqual(permanentResidencyStore.state.value, permanentResidencyStore.defaultState);

    citizenshipStore.update((s) => ({ ...s,
      pathway: CitizenshipPathway.SpousalThreeYear,
      hasLanguageB1Certificate: true }));
    assert.equal(citizenshipStore.state.value.pathway, CitizenshipPathway.SpousalThreeYear);
    assert.equal(citizenshipStore.state.value.hasLanguageB1Certificate, true);
    citizenshipStore.reset();
    assert.deepEqual(citizenshipStore.state.value, citizenshipStore.defaultState);

    familyMilestonesStore.update((s) => ({ ...s,
      multipleCount: 2 }));
    assert.equal(familyMilestonesStore.state.value.multipleCount, 2);
    familyMilestonesStore.reset();
    assert.deepEqual(familyMilestonesStore.state.value, familyMilestonesStore.defaultState);

    childcarePlannerStore.update((s) => ({ ...s,
      asOfDate: "2026-05-01" }));
    assert.equal(childcarePlannerStore.state.value.asOfDate, "2026-05-01");
    childcarePlannerStore.reset();
    assert.deepEqual(childcarePlannerStore.state.value, childcarePlannerStore.defaultState);

    travelPlannerStore.update((s) => ({ ...s,
      compareOrigin: "Munich",
      compareDestination: "Vienna" }));
    assert.equal(travelPlannerStore.state.value.compareOrigin, "Munich");
    assert.equal(travelPlannerStore.state.value.compareDestination, "Vienna");
    travelPlannerStore.reset();
    assert.deepEqual(travelPlannerStore.state.value, travelPlannerStore.defaultState);

    taxClassSwitchStore.update((s) => ({ ...s,
      targetCombination: TaxClassCombination.IV_IV_Factor,
      switchMonth: 7 }));
    assert.equal(taxClassSwitchStore.state.value.targetCombination, TaxClassCombination.IV_IV_Factor);
    assert.equal(taxClassSwitchStore.state.value.switchMonth, 7);
    taxClassSwitchStore.reset();
    assert.deepEqual(taxClassSwitchStore.state.value, taxClassSwitchStore.defaultState);

    assetAffordabilityStore.update((s) => ({ ...s,
      availableSavingsEur: 55000 }));
    assert.equal(assetAffordabilityStore.state.value.availableSavingsEur, 55000);
    assetAffordabilityStore.reset();
    assert.deepEqual(assetAffordabilityStore.state.value, assetAffordabilityStore.defaultState);

    planningDashboardStore.update((s) => ({ ...s,
      priority: PlanningPriority.MajorPurchases,
      hasMajorPurchase: true }));
    assert.equal(planningDashboardStore.state.value.priority, PlanningPriority.MajorPurchases);
    assert.equal(planningDashboardStore.state.value.hasMajorPurchase, true);
    planningDashboardStore.reset();
    assert.deepEqual(planningDashboardStore.state.value, planningDashboardStore.defaultState);
  });
});
