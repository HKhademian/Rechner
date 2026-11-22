import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  FederalStateKitaPresetId,
} from "#engine/types";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  mapFederalStateToKitaPreset,
} from "#engine/benefits/kitaProfileMapping";

describe("mapFederalStateToKitaPreset", () => {
  it("maps supported federal states to regional municipal daycare presets", () => {
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.Berlin), FederalStateKitaPresetId.Berlin);
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.Bayern), FederalStateKitaPresetId.BavariaMunich);
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.Hamburg), FederalStateKitaPresetId.Hamburg);
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.NordrheinWestfalen), FederalStateKitaPresetId.NrwDuesseldorf);
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.BadenWuerttemberg), FederalStateKitaPresetId.BwStuttgart);
  });

  it("falls back to Custom for states without a dedicated municipal preset", () => {
    assert.equal(mapFederalStateToKitaPreset(GermanFederalState.Sachsen), FederalStateKitaPresetId.Custom);
  });
});
