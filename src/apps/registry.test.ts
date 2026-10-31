import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  calculatorApps,
  calculatorAtPath,
  catalogPage,
} from "#/apps/registry.ts";
import {
  AppId,
  CalculatorCategory,
  calculatorPath,
} from "#/apps/appDefinition.ts";

it("registers unique routes and resolves exact app paths without accidental prefix matches", () => {
  assert.equal(new Set(calculatorApps.map((app) => app.id)).size, calculatorApps.length);
  for (const app of calculatorApps) {
    assert.equal(calculatorAtPath(calculatorPath(app.id))?.id, app.id);
    assert.equal(calculatorAtPath(calculatorPath(app.id).slice(0, -1))?.id, app.id);
    assert.equal(calculatorAtPath(`${calculatorPath(app.id)}other`), undefined);
  }
  assert.equal(calculatorAtPath("/"), undefined);
});

it("filters German search terms, categories and empty results and clamps paginated results", () => {
  assert.equal(catalogPage(calculatorApps, "  NETTO  ", undefined, 1).items[0].id, AppId.NetPay);
  assert.equal(catalogPage(calculatorApps, "", CalculatorCategory.Family, 1).items[0].id, AppId.ParentalLeave);
  assert.equal(catalogPage(calculatorApps, "nothing matches", undefined, 99).total, 0);
  const many = Array.from({ length: 8 }, () => calculatorApps[0]);
  assert.equal(catalogPage(many, "", undefined, 2, 3).items.length, 3);
  assert.equal(catalogPage(many, "", undefined, 99, 3).page, 3);
  assert.equal(catalogPage(many, "", undefined, -1, 3).page, 1);
  assert.throws(() => catalogPage(many, "", undefined, 1, 0), TypeError);
});
