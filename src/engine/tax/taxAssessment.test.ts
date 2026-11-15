import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  LawId,
} from "#engine/laws/types";
import {
  HouseholdRelationship,
  TaxAssessment,
  toHouseholdRelationship,
  validateTaxClassAndAssessmentRules,
} from "#engine/tax/taxAssessment";
import {
  TaxClass,
} from "#engine/types";

describe("Household relationship and statutory assessment validation", () => {
  it("validates HouseholdRelationship enum values and rejects unknown inputs", () => {
    assert.equal(
      toHouseholdRelationship("MARRIED_OR_CIVIL_PARTNERS"),
      HouseholdRelationship.MarriedOrCivilPartners,
    );
    assert.throws(() => toHouseholdRelationship("engaged"), TypeError);
  });

  it("flags § 24b Class II conflicts for marriage, partner cohabitation, and childlessness", () => {
    const marriedClassII = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.MarriedOrCivilPartners,
      assessment: TaxAssessment.Joint,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.II,
      childrenCount: 1,
    });
    assert.ok(marriedClassII.some((w) => w.lawId === LawId.EStG_24b));

    const unmarriedCohabitingClassII = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.UnmarriedPartners,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: true,
      primaryTaxClass: TaxClass.II,
      partnerTaxClass: TaxClass.I,
      childrenCount: 1,
    });
    assert.ok(unmarriedCohabitingClassII.some((w) => w.lawId === LawId.EStG_24b));

    const childlessClassII = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.Single,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.II,
      childrenCount: 0,
    });
    assert.ok(childlessClassII.some((w) => w.lawId === LawId.EStG_24b));

    const validSingleParent = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.Single,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.II,
      childrenCount: 1,
    });
    assert.deepEqual(validSingleParent, []);
  });

  it("enforces § 38b marital class eligibility while allowing qualifying widowhood Class III", () => {
    const unmarriedClassIV = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.UnmarriedPartners,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: true,
      primaryTaxClass: TaxClass.IV,
      partnerTaxClass: TaxClass.IV,
      childrenCount: 0,
    });
    assert.ok(unmarriedClassIV.some((w) => w.lawId === LawId.EStG_38b));

    const singleClassIII = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.Single,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.III,
      childrenCount: 0,
    });
    assert.ok(singleClassIII.some((w) => w.lawId === LawId.EStG_38b));

    const validWidowClassIII = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.QualifyingWidowed,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.III,
      childrenCount: 0,
    });
    assert.deepEqual(validWidowClassIII, []);

    const widowWithPartnerPayroll = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.QualifyingWidowed,
      assessment: TaxAssessment.Individual,
      hasPartnerPayroll: true,
      primaryTaxClass: TaxClass.III,
      partnerTaxClass: TaxClass.I,
      childrenCount: 0,
    });
    assert.ok(widowWithPartnerPayroll.some((w) => w.lawId === LawId.EStG_38b));
  });

  it("flags §§ 26 / 32a Joint Assessment mismatches without blocking valid married one-earner splitting", () => {
    const unmarriedJoint = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.UnmarriedPartners,
      assessment: TaxAssessment.Joint,
      hasPartnerPayroll: true,
      primaryTaxClass: TaxClass.I,
      partnerTaxClass: TaxClass.I,
      childrenCount: 0,
    });
    assert.ok(unmarriedJoint.some((w) => w.lawId === LawId.EStG_26));

    const widowedTwoSpouseJoint = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.QualifyingWidowed,
      assessment: TaxAssessment.Joint,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.III,
      childrenCount: 0,
    });
    assert.ok(widowedTwoSpouseJoint.some((w) => w.lawId === LawId.EStG_32a));

    const marriedZeroWageSpouse = validateTaxClassAndAssessmentRules({
      relationship: HouseholdRelationship.MarriedOrCivilPartners,
      assessment: TaxAssessment.Joint,
      hasPartnerPayroll: false,
      primaryTaxClass: TaxClass.III,
      childrenCount: 0,
    });
    assert.deepEqual(marriedZeroWageSpouse, []);
  });
});
