import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  LawId,
} from "#engine/laws/types";
import {
  TaxClass,
} from "#engine/types";

export const TaxAssessment = {
  Unspecified: "UNSPECIFIED",
  Individual: "INDIVIDUAL",
  Joint: "JOINT",
} as const;
export type TaxAssessment = (typeof TaxAssessment)[keyof typeof TaxAssessment];

export function toTaxAssessment(value: string): TaxAssessment {
  if (!Object.values(TaxAssessment).includes(value as TaxAssessment)) {
    throw new TypeError("Choose individual or joint assessment.");
  }
  return value as TaxAssessment;
}

/**
 * Legal marital / cohabitation household status relevant under EStG §§ 24b, 26, 32a Abs. 6, and 38b.
 * Distinct from whether a second person's employment payroll is modeled in the table.
 */
export const HouseholdRelationship = {
  Unspecified: "UNSPECIFIED",
  Single: "SINGLE",
  UnmarriedPartners: "UNMARRIED_PARTNERS",
  MarriedOrCivilPartners: "MARRIED_OR_CIVIL_PARTNERS",
  QualifyingWidowed: "QUALIFYING_WIDOWED",
} as const;
export type HouseholdRelationship = (typeof HouseholdRelationship)[keyof typeof HouseholdRelationship];

export function toHouseholdRelationship(value: string): HouseholdRelationship {
  if (!Object.values(HouseholdRelationship).includes(value as HouseholdRelationship)) {
    throw new TypeError("Choose a supported household relationship status.");
  }
  return value as HouseholdRelationship;
}

export interface StatutoryAssessmentWarning {
  readonly lawId: LawId;
  readonly message: string;
}

/**
 * Checks declared German payroll tax classes (§§ 24b, 38b EStG), household relationship,
 * co-habiting payroll presence, and annual assessment mode (§§ 26, 26b, 32a Abs. 6 EStG).
 */
export function validateTaxClassAndAssessmentRules(inputs: Readonly<{
  readonly relationship: HouseholdRelationship;
  readonly assessment: TaxAssessment;
  readonly hasPartnerPayroll: boolean;
  readonly primaryTaxClass: TaxClass;
  readonly partnerTaxClass?: TaxClass;
  readonly childrenCount: number;
}>): readonly StatutoryAssessmentWarning[] {
  const warnings: StatutoryAssessmentWarning[] = [];
  const spouseClasses: readonly TaxClass[] = [TaxClass.III, TaxClass.IV, TaxClass.V];

  // 1. Single-parent relief (§ 24b EStG — Tax Class II)
  const usesClassII =
    inputs.primaryTaxClass === TaxClass.II ||
    (inputs.hasPartnerPayroll && inputs.partnerTaxClass === TaxClass.II);
  if (usesClassII) {
    if (inputs.relationship === HouseholdRelationship.MarriedOrCivilPartners) {
      warnings.push({
        lawId: LawId.EStG_24b,
        message: "Tax Class II (§ 24b EStG single-parent relief) does not apply to non-permanently-separated spouses.",
      });
    }
    else if (
      inputs.relationship === HouseholdRelationship.UnmarriedPartners ||
      (inputs.hasPartnerPayroll && inputs.relationship === HouseholdRelationship.Unspecified)
    ) {
      warnings.push({
        lawId: LawId.EStG_24b,
        message: "Sharing a household with another adult partner generally disqualifies Tax Class II (§ 24b Abs. 3 EStG) single-parent relief.",
      });
    }
    else if (inputs.childrenCount <= 0) {
      warnings.push({
        lawId: LawId.EStG_24b,
        message: "Tax Class II (§ 24b EStG) requires at least one qualifying child living in the sole-parent household.",
      });
    }
  }

  // 2. Marital payroll withholding classes III / IV / V (§ 38b EStG)
  const partnerUsesFourOrFive =
    inputs.hasPartnerPayroll &&
    (inputs.partnerTaxClass === TaxClass.IV || inputs.partnerTaxClass === TaxClass.V);
  const usesFourOrFive =
    inputs.primaryTaxClass === TaxClass.IV ||
    inputs.primaryTaxClass === TaxClass.V ||
    partnerUsesFourOrFive;
  if (
    usesFourOrFive &&
    (inputs.relationship === HouseholdRelationship.Single ||
      inputs.relationship === HouseholdRelationship.UnmarriedPartners ||
      inputs.relationship === HouseholdRelationship.QualifyingWidowed)
  ) {
    warnings.push({
      lawId: LawId.EStG_38b,
      message: "Tax Classes IV and V (§ 38b EStG) are reserved for non-separated married spouses or registered civil partners.",
    });
  }

  const partnerUsesClassIII = inputs.hasPartnerPayroll && inputs.partnerTaxClass === TaxClass.III;
  if (
    (inputs.primaryTaxClass === TaxClass.III || partnerUsesClassIII) &&
    (inputs.relationship === HouseholdRelationship.Single ||
      inputs.relationship === HouseholdRelationship.UnmarriedPartners)
  ) {
    warnings.push({
      lawId: LawId.EStG_38b,
      message: "Tax Class III (§ 38b EStG) applies only to spouses/civil partners or qualifying widowhood — not single or unmarried partners.",
    });
  }

  if (inputs.relationship === HouseholdRelationship.QualifyingWidowed && inputs.hasPartnerPayroll) {
    warnings.push({
      lawId: LawId.EStG_38b,
      message: "Qualifying widowhood splitting (§ 32a Abs. 6 EStG, Class III) assumes no co-assessed living spouse.",
    });
  }

  // 3. Annual Joint Assessment eligibility (§§ 26, 26b EStG)
  if (inputs.assessment === TaxAssessment.Joint) {
    if (
      inputs.relationship === HouseholdRelationship.Single ||
      inputs.relationship === HouseholdRelationship.UnmarriedPartners
    ) {
      warnings.push({
        lawId: LawId.EStG_26,
        message: "Joint assessment (§ 26 EStG) requires marriage or registered civil partnership; unmarried partners must file separate individual returns.",
      });
    }
    else if (inputs.relationship === HouseholdRelationship.QualifyingWidowed) {
      warnings.push({
        lawId: LawId.EStG_32a,
        message: "Qualifying widows/widowers apply the splitting tariff individually under § 32a Abs. 6 Nr. 1 EStG rather than two-spouse joint pooling.",
      });
    }
    else if (
      inputs.relationship === HouseholdRelationship.Unspecified &&
      !spouseClasses.includes(inputs.primaryTaxClass) &&
      (!inputs.hasPartnerPayroll || !inputs.partnerTaxClass || !spouseClasses.includes(inputs.partnerTaxClass))
    ) {
      warnings.push({
        lawId: LawId.EStG_26,
        message: "Joint assessment assumes eligible spouses or registered civil partners (§ 26 EStG); Tax Classes I/II alone do not establish splitting eligibility.",
      });
    }
  }

  return Object.freeze(warnings);
}

/** Partner presence does not establish eligibility or election for joint assessment. */
export const TAX_ASSESSMENT_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/estg/__26.html");
