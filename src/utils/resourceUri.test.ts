import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  ResourceKind,
  resourceId,
} from "#utils/resourceUri";

it("validates the resource kind and identifier in metadata", () => {
  assert.equal(resourceId("rechner://group/group-housing-home-acquisition", ResourceKind.Group), "group-housing-home-acquisition");
  assert.equal(resourceId("rechner://category/residence", ResourceKind.Category), "residence");
  for (const uri of ["rechner://app/visa", "rechner://law/estg-2/extra", "https://example.com"]) {
    assert.throws(() => resourceId(uri, ResourceKind.Law));
  }
});
