import {
  toSourceUrl,
} from "#engine/config/benefitRules";

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

/** Partner presence does not establish eligibility or election for joint assessment. */
export const TAX_ASSESSMENT_SOURCE = toSourceUrl("https://www.gesetze-im-internet.de/estg/__26.html");
