import assert from "node:assert/strict";
import {
  it, 
} from "node:test";
import {
  parseContentLinks,
  plainContentText,
  resolveContentLink,
} from "#utils/contentLinks";
import {
  LawGroupId,
  LawId,
} from "#engine/laws/types";

const topics = [{ id: "solar" }, { id: "solar-vat",
  parentId: "solar" }];

it("resolves links to calculators, laws and nested topics", () => {
  assert.ok(resolveContentLink("rechner://app/housing", topics)?.href.endsWith("/calculators/housing/"));
  assert.ok(resolveContentLink("rechner://law/kfw-300", topics)?.href.endsWith("/laws/kfw-300/"));
  assert.ok(resolveContentLink("rechner://topic/solar/solar-vat", topics)?.href.endsWith("/topics/solar/solar-vat/"));
  assert.ok(resolveContentLink("rechner://app/mortgage/mortgage-budget", topics)?.href.endsWith("/calculators/mortgage/#mortgage-budget"));
  for (const value of ["rechner://app/unknown", "rechner://law/nope", "rechner://topic/other/solar-vat", "javascript:alert%281%29"]) {
    assert.equal(resolveContentLink(value, topics), undefined);
  }
});

it("resolves categories and law groups to normal web destinations", () => {
  const resources = { categoryIds: ["home"],
    primaryLawForGroup: (id: string) => id === LawGroupId.Housing_HomeAcquisition ? LawId.KfW_300 : undefined };
  assert.ok(resolveContentLink("rechner://category/home", topics, resources)?.href.endsWith("/topics/#home"));
  assert.deepEqual(resolveContentLink("rechner://group/group-housing-home-acquisition", topics, resources), { href: "/laws/kfw-300/?group=group-housing-home-acquisition",
    groupId: LawGroupId.Housing_HomeAcquisition });
  assert.equal(resolveContentLink("rechner://category/unknown", topics, resources), undefined);
});

it("extracts readable labels without exposing link syntax", () => {
  const text = "See [the planner](rechner://app/housing) and [KfW](rechner://law/kfw-300).";
  assert.equal(plainContentText(text), "See the planner and KfW.");
  assert.deepEqual(parseContentLinks(text).filter((part) => part.target).map((part) => part.target), ["rechner://app/housing", "rechner://law/kfw-300"]);
  assert.deepEqual(parseContentLinks("[KfW](https://example.org/product-(300)/)")[0], { text: "KfW",
    target: "https://example.org/product-(300)/" });
});
