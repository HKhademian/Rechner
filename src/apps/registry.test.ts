import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  allCalculatorApps,
  calculatorApps,
  calculatorAtPath,
  catalogPage,
  visibleCatalogApps,
} from "#/apps/registry.ts";
import {
  AppId,
  CalculatorCategory,
  CalculatorReleaseStatus,
  calculatorPath,
} from "#/apps/appDefinition.ts";

it("limits default release catalog to published calculators while retaining draft definitions", () => {
  assert.deepEqual(
    calculatorApps.map((app) => app.id),
    [AppId.NetPay, AppId.ParentalLeave, AppId.GiroCode],
  );
  assert.equal(
    calculatorApps.every((app) => app.releaseStatus === CalculatorReleaseStatus.Published),
    true,
  );
  assert.deepEqual(
    allCalculatorApps.filter((app) => app.releaseStatus === CalculatorReleaseStatus.Draft).map((app) => app.id),
    [
      AppId.Visa,
      AppId.CompanyCar,
      AppId.SolarEnergy,
      AppId.Housing,
      AppId.Mortgage,
      AppId.Kita,
      AppId.MinijobMidijob,
      AppId.CommuterAllowance,
    ],
  );
  assert.deepEqual(
    visibleCatalogApps(allCalculatorApps, false).map((app) => app.id),
    calculatorApps.map((app) => app.id),
  );
  assert.deepEqual(
    visibleCatalogApps(allCalculatorApps, true).map((app) => app.id),
    allCalculatorApps.map((app) => app.id),
  );
});

it("registers unique routes and resolves exact app paths without accidental prefix matches", () => {
  assert.equal(new Set(allCalculatorApps.map((app) => app.id)).size, allCalculatorApps.length);
  for (const app of allCalculatorApps) {
    assert.equal(calculatorAtPath(calculatorPath(app.id))?.id, app.id);
    assert.equal(calculatorAtPath(calculatorPath(app.id).slice(0, -1))?.id, app.id);
    assert.equal(calculatorAtPath(`${calculatorPath(app.id)}other`), undefined);
  }
  assert.equal(calculatorAtPath("/"), undefined);
});

it("filters German search terms, categories and empty results and clamps paginated results", () => {
  assert.equal(catalogPage(calculatorApps, "  NETTO  ", undefined, 1).items[0].id, AppId.NetPay);
  assert.equal(catalogPage(calculatorApps, "", CalculatorCategory.Family, 1).items[0].id, AppId.ParentalLeave);
  assert.equal(catalogPage(calculatorApps, "girocode", undefined, 1).items[0].id, AppId.GiroCode);
  assert.equal(catalogPage(allCalculatorApps, "blue card", undefined, 1).items[0].id, AppId.Visa);
  assert.equal(catalogPage(allCalculatorApps, "dienstwagen", undefined, 1).items[0].id, AppId.CompanyCar);
  assert.equal(catalogPage(allCalculatorApps, "photovoltaik", undefined, 1).items[0].id, AppId.SolarEnergy);
  assert.equal(catalogPage(allCalculatorApps, "kfw 300", undefined, 1).items[0].id, AppId.Housing);
  assert.equal(catalogPage(allCalculatorApps, "kinderbetreuung", undefined, 1).items[0].id, AppId.Kita);
  assert.equal(catalogPage(allCalculatorApps, "übergangsbereich", undefined, 1).items[0].id, AppId.MinijobMidijob);
  assert.equal(catalogPage(allCalculatorApps, "pendlerpauschale", undefined, 1).items[0].id, AppId.CommuterAllowance);
  assert.equal(catalogPage(calculatorApps, "", CalculatorCategory.Everyday, 1).items[0].id, AppId.GiroCode);
  assert.equal(catalogPage(calculatorApps, "nothing matches", undefined, 99).total, 0);
  const many = Array.from({ length: 8 }, () => calculatorApps[0]);
  assert.equal(catalogPage(many, "", undefined, 2, 3).items.length, 3);
  assert.equal(catalogPage(many, "", undefined, 99, 3).page, 3);
  assert.equal(catalogPage(many, "", undefined, -1, 3).page, 1);
  assert.throws(() => catalogPage(many, "", undefined, 1, 0), TypeError);
});
