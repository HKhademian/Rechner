import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  buildLawPageTitle,
  filterLawsByGroup,
  getCalculatorsUsingLaw,
  parseLawPageLocation,
} from "#/components/laws/lawPageHelpers.ts";
import {
  getAllLawEntries,
  getAllLawGroupEntries,
  getLawEntry,
} from "#engine/laws/registry";
import {
  LawGroupId,
  LawId,
  LawTag,
} from "#engine/laws/types";

describe("Full Law Page Helpers", () => {
  it("parses pathname law slugs and group parameters under both root and GitHub Pages base paths", () => {
    const githubPagesParsed = parseLawPageLocation(
      "/Rechner/laws/beeg-2c/",
      "?group=group-beeg-tax-swap&tag=payroll&q=tax%20class",
      "/Rechner/laws/",
    );

    assert.equal(githubPagesParsed.lawId, LawId.BEEG_2c);
    assert.equal(githubPagesParsed.groupId, LawGroupId.BEEG_TaxSwap);
    assert.equal(githubPagesParsed.tagFilter, LawTag.Payroll);
    assert.equal(githubPagesParsed.searchQuery, "tax class");

    const rootParsed = parseLawPageLocation(
      "/laws/estg-38b",
      "",
      "/laws/",
    );
    assert.equal(rootParsed.lawId, LawId.EStG_38b);
    assert.equal(rootParsed.groupId, getLawEntry(LawId.EStG_38b).groupId);
    assert.equal(rootParsed.tagFilter, undefined);
  });

  it("supports query-based law and group deep links while ignoring invalid tokens", () => {
    const queryLaw = parseLawPageLocation("/laws/", "?law=muschg-19&tag=not-a-tag", "/laws/");
    assert.equal(queryLaw.lawId, LawId.MuSchG_19);
    assert.equal(queryLaw.tagFilter, undefined);

    const groupOnly = parseLawPageLocation("/laws/", "?group=group-estg-kindergeld", "/laws/");
    assert.equal(groupOnly.lawId, LawId.EStG_66);
    assert.equal(groupOnly.groupId, LawGroupId.EStG_Kindergeld);

    const invalidSlug = parseLawPageLocation("/laws/non-existent/", "?group=invalid", "/laws/");
    assert.equal(invalidSlug.lawId, undefined);
    assert.equal(invalidSlug.groupId, undefined);
  });

  it("filters sidebar statutes cleanly by thematic group and restores the full catalog when cleared", () => {
    const allLaws = getAllLawEntries();
    for (const group of getAllLawGroupEntries()) {
      const members = filterLawsByGroup(allLaws, group.id);
      assert.equal(members.length, group.memberLawIds.length);
      for (const memberId of group.memberLawIds) {
        assert.equal(
          members.some((law) => law.id === memberId),
          true,
          `Missing group member ${memberId} in ${group.id}`,
        );
      }
    }

    assert.equal(filterLawsByGroup(allLaws, undefined).length, allLaws.length);
  });

  it("maps every registered statute to its implementing calculators and generates canonical SSR-aligned titles", () => {
    const allLaws = getAllLawEntries();
    for (const entry of allLaws) {
      const calculators = getCalculatorsUsingLaw(entry);
      assert.equal(
        calculators.length > 0,
        true,
        `Law ${entry.id} should map to at least one calculator`,
      );
      const title = buildLawPageTitle(entry);
      assert.equal(title.includes(entry.citation), true);
      assert.equal(title.includes(entry.title), true);
    }

    const classRuleCalculators = getCalculatorsUsingLaw(getLawEntry(LawId.BEEG_2c)).map((app) => app.id);
    assert.deepEqual(classRuleCalculators, [AppId.NetPay, AppId.ParentalLeave]);

    const maternityCalculators = getCalculatorsUsingLaw(getLawEntry(LawId.MuSchG_19)).map((app) => app.id);
    assert.deepEqual(maternityCalculators, [AppId.ParentalLeave]);
  });
});
