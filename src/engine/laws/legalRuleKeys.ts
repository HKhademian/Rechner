import {
  type LawGroupId as LawGroupIdType,
  type LawId as LawIdType,
  LawGroupId,
  LawId,
} from "#engine/laws/types";

/** Statutory legal rule keys linking timeline explanations to canonical law entries and thematic groups. */
export const LegalRuleKey = {
  /** Maternity protection wage replacement (§§ 19, 20 MuSchG). */
  MuSchG_Maternity: "muschg-maternity",
  /** Proactive spousal tax class optimization (§ 2b Abs. 1 Satz 3 BEEG, BEEG § 2c(3)). */
  BEEG_TaxSwap: "beeg-tax-swap",
  /** Clean synthetic net income baseline (§ 2c BEEG). */
  BEEG_SyntheticNet: "beeg-synthetic-net",
  /** Spousal splitting tariff joint assessment (§ 26b, § 32a Abs. 5 EStG). */
  EStG_TaxSplitting: "estg-tax-splitting",
  /** Partnerschaftsbonus part-time window (§ 4b BEEG). */
  BEEG_PartnershipBonus: "beeg-partnership-bonus",
  /** Geschwisterbonus older sibling addition (§ 2a BEEG). */
  BEEG_SiblingBonus: "beeg-sibling-bonus",
  /** Child 2 sequential birth baseline dilution mitigation (§ 2b BEEG). */
  BEEG_Child2Dilution: "beeg-child2-dilution",
  /** Monthly child benefit (§ 66 EStG Kindergeld). */
  EStG_Kindergeld: "estg-kindergeld",
} as const;

/** Type alias for statutory legal rule keys. */
export type LegalRuleKeyType = (typeof LegalRuleKey)[keyof typeof LegalRuleKey];

/** Mapping from scenario legal rule keys to canonical LawId and LawGroupId entries. */
export const LEGAL_RULE_LAW_MAP: Readonly<
  Record<
    LegalRuleKeyType,
    {
      readonly lawId: LawIdType;
      readonly groupId: LawGroupIdType;
    }
  >
> = Object.freeze({
  [LegalRuleKey.MuSchG_Maternity]: {
    lawId: LawId.MuSchG_20,
    groupId: LawGroupId.MuSchG_Maternity,
  },
  [LegalRuleKey.BEEG_TaxSwap]: {
    lawId: LawId.BEEG_2c,
    groupId: LawGroupId.BEEG_TaxSwap,
  },
  [LegalRuleKey.BEEG_SyntheticNet]: {
    lawId: LawId.BEEG_2,
    groupId: LawGroupId.BEEG_SyntheticNet,
  },
  [LegalRuleKey.EStG_TaxSplitting]: {
    lawId: LawId.EStG_26b,
    groupId: LawGroupId.EStG_TaxSplitting,
  },
  [LegalRuleKey.BEEG_PartnershipBonus]: {
    lawId: LawId.BEEG_4b,
    groupId: LawGroupId.BEEG_PartnershipBonus,
  },
  [LegalRuleKey.BEEG_SiblingBonus]: {
    lawId: LawId.BEEG_2a,
    groupId: LawGroupId.BEEG_SiblingBonus,
  },
  [LegalRuleKey.BEEG_Child2Dilution]: {
    lawId: LawId.BEEG_2b,
    groupId: LawGroupId.BEEG_Child2Dilution,
  },
  [LegalRuleKey.EStG_Kindergeld]: {
    lawId: LawId.EStG_66,
    groupId: LawGroupId.EStG_Kindergeld,
  },
});
