import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  AssetActionKind,
  AssetCategory,
  assetEventModule,
  toLifeAssetId,
} from "#engine/lifeProfile/assetEvent";
import {
  AssetAffordabilityStatus,
  evaluateAssetAffordability,
} from "#engine/lifeProfile/assetProjection";
import {
  CashDirection,
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";
import {
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  LifeEventStatus,
  toLifeEventDate,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";

it("tracks upfront vs linked cash costs without double counting and retires ongoing costs on sale", () => {
  const personId = toPersonId("p1");
  const cashId = toLifeEventId("cash-pv");
  const carId = toLifeAssetId("car-1");
  const solarId = toLifeAssetId("solar-1");

  const events = [
    {
      id: cashId,
      kind: cashEventModule.kind,
      personId,
      date: toLifeEventDate("2026-05-01"),
      status: LifeEventStatus.Actual,
      payload: {
        title: "Solar PV payment",
        direction: CashDirection.Outflow,
        amount: toEuroCents(1500000),
      },
    },
    {
      id: toLifeEventId("asset-car-buy"),
      kind: assetEventModule.kind,
      personId,
      date: toLifeEventDate("2025-01-10"),
      status: LifeEventStatus.Actual,
      payload: {
        assetId: carId,
        category: AssetCategory.Car,
        action: AssetActionKind.Purchase,
        title: "Family EV",
        upfrontCents: toEuroCents(2000000),
        ongoingMonthlyCents: toEuroCents(45000),
      },
    },
    {
      id: toLifeEventId("asset-car-sell"),
      kind: assetEventModule.kind,
      personId,
      date: toLifeEventDate("2026-04-01"),
      status: LifeEventStatus.Actual,
      payload: {
        assetId: carId,
        category: AssetCategory.Car,
        action: AssetActionKind.Sale,
        title: "Sold Family EV",
        upfrontCents: toEuroCents(1400000),
      },
    },
    {
      id: toLifeEventId("asset-solar"),
      kind: assetEventModule.kind,
      personId,
      date: toLifeEventDate("2026-05-01"),
      status: LifeEventStatus.Actual,
      payload: {
        assetId: solarId,
        category: AssetCategory.Solar,
        action: AssetActionKind.Installation,
        title: "10 kWp Solar PV",
        upfrontCents: toEuroCents(1500000),
        ongoingMonthlyCents: toEuroCents(2000),
        monthlySavingsCents: toEuroCents(14000),
        linkedCashEventId: cashId,
      },
    },
  ];

  const result = evaluateAssetAffordability({
    events,
    personId,
    includePlanned: true,
    availableSavingsCents: toEuroCents(2500000),
    monthlyNetIncomeCents: toEuroCents(450000),
  });

  assert.equal(result.totalUpfrontAllCents, 3500000);
  assert.equal(result.linkedCashUpfrontCents, 1500000);
  assert.equal(result.unlinkedUpfrontCents, 2000000);
  assert.equal(result.totalSaleProceedsCents, 1400000);
  // Car was sold, so only Solar ongoing (20) - savings (140) = -120 EUR/month remains active
  assert.equal(result.activeOngoingMonthlyCents, 2000);
  assert.equal(result.activeMonthlySavingsCents, 14000);
  assert.equal(result.netActiveMonthlyImpactCents, -12000);
  assert.equal(result.liquidSavingsGapCents, 0);
  assert.equal(result.affordabilityStatus, AssetAffordabilityStatus.Comfortable);
});
