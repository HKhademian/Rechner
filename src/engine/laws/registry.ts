import {
  toSourceUrl,
} from "#engine/config/benefitRules";
import {
  type ExternalSourceId as ExternalSourceIdType,
  type LawEntry,
  type LawGroupEntry,
  type LawRelationMetadata,
  type LawTag as LawTagType,
  ExternalSourceId,
  LawCode,
  LawGroupId,
  LawId,
  LawRelationType,
  LawTag,
} from "#engine/laws/types";
import {
  toStatutoryCitation,
} from "#engine/types";

function gesetzeUrl(
  lawSlug: string,
  sectionSlug: string,
) {
  return toSourceUrl(`https://www.gesetze-im-internet.de/${lawSlug}/__${sectionSlug}.html`);
}

function freezeEntry(entry: LawEntry): LawEntry {
  return Object.freeze({
    ...entry,
    tags: Object.freeze([...entry.tags]),
    relatedLaws: Object.freeze({ ...entry.relatedLaws }),
    externalSources: Object.freeze({ ...entry.externalSources }),
  });
}

function freezeGroup(group: LawGroupEntry): LawGroupEntry {
  return Object.freeze({
    ...group,
    tags: Object.freeze([...group.tags]),
    memberLawIds: Object.freeze([...group.memberLawIds]),
  });
}

/**
 * Central frozen statutory law reference registry shared across all calculators.
 * Every LawId maps to typed citation details, benefit/anti-benefit summaries,
 * domain tags, cross-referenced law relation maps, and official external source maps.
 */
export const LAW_REGISTRY: Readonly<Record<LawId, LawEntry>> = Object.freeze({
  [LawId.BEEG_1]: freezeEntry({
    id: LawId.BEEG_1,
    citation: toStatutoryCitation("§ 1 BEEG"),
    code: LawCode.BEEG,
    section: "§ 1",
    title: "Elterngeld Eligibility, Working Hours Cap & Income Limit",
    summary: "Establishes personal eligibility for Elterngeld, the 32-hour weekly working limit during allowance receipt, and the couple taxable-income eligibility cap (§ 1 Abs. 8 BEEG).",
    benefit: "Protects parental allowance eligibility while working part-time up to 32 hours per week.",
    antiBenefit: "Exceeding 32 weekly hours or surpassing the prior-year household taxable income cap (€175,000 from April 2025) eliminates entitlement completely.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits, LawTag.Payroll],
    groupId: LawGroupId.BEEG_PartnershipBonus,
    relatedLaws: {
      [LawId.EStG_2]: {
        relationType: LawRelationType.DependsOn,
        description: "Prior-year taxable income eligibility uses § 2 Abs. 5 and Abs. 5a EStG.",
      },
      [LawId.BEEG_4]: {
        relationType: LawRelationType.InteractsWith,
        description: "Defines how eligible months are claimed across Basis and Plus budgets.",
      },
      [LawId.BEEG_4b]: {
        relationType: LawRelationType.Extends,
        description: "Partnership bonus narrows the weekly hours corridor to 24–32 hours.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "1"),
        label: "§ 1 BEEG Statutory Text",
        description: "Official eligibility criteria, 32h cap, and income threshold.",
      },
      [ExternalSourceId.BmbfsfjGuidelines]: {
        url: toSourceUrl("https://www.bmbfsfj.bund.de/resource/blob/243236/6d06137220a52d1a18905493c3ab6199/richtlinien-zum-beeg-data.pdf"),
        label: "BEEG Administrative Guidelines",
        description: "Federal ministry interpretation and rounding guidelines.",
      },
    },
  }),

  [LawId.BEEG_2]: freezeEntry({
    id: LawId.BEEG_2,
    citation: toStatutoryCitation("§ 2 BEEG"),
    code: LawCode.BEEG,
    section: "§ 2",
    title: "Amount of Elterngeld, Replacement Rate & Caps",
    summary: "Defines the sliding replacement rate (65%–100%), the €2,770 assessable net ceiling, the €300 floor, and the €1,800 Basiselterngeld maximum.",
    benefit: "Boosts replacement up to 100% for lower incomes below €1,000 and guarantees a €300 Basis floor.",
    antiBenefit: "Caps assessable pre-birth net at €2,770 (max €1,800/month Basis) and reduces the rate from 67% down to 65% above €1,200.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits],
    groupId: LawGroupId.BEEG_SyntheticNet,
    relatedLaws: {
      [LawId.BEEG_2b]: {
        relationType: LawRelationType.DependsOn,
        description: "Assessment lookback selects the 12 eligible months feeding § 2.",
      },
      [LawId.BEEG_2c]: {
        relationType: LawRelationType.DependsOn,
        description: "Standardized BEEG net from employment income is computed under § 2c.",
      },
      [LawId.BEEG_4a]: {
        relationType: LawRelationType.Modifies,
        description: "ElterngeldPlus caps payments at 50% of the no-income Basis amount.",
      },
      [LawId.BEEG_2a]: {
        relationType: LawRelationType.Extends,
        description: "Sibling bonus adds 10% (min €75 Basis / €37.50 Plus) on top of § 2.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2"),
        label: "§ 2 BEEG Statutory Text",
        description: "Replacement scale, €300–€1,800 bounds, and €2,770 assessable net cap.",
      },
    },
  }),

  [LawId.BEEG_2a]: freezeEntry({
    id: LawId.BEEG_2a,
    citation: toStatutoryCitation("§ 2a BEEG"),
    code: LawCode.BEEG,
    section: "§ 2a",
    title: "Sibling Bonus (Geschwisterbonus) & Multiple-Birth Addition",
    summary: "Increases positive Elterngeld by 10% (at least €75/month Basis or €37.50/month Plus) when qualifying younger siblings live in the household.",
    benefit: "Adds +10% (min €75 Basis / €37.50 Plus) when 1 older child is under 3 or 2+ older children are under 6.",
    antiBenefit: "Applies only while the older sibling stays under the age threshold and adds nothing if the base allowance is zero.",
    tags: [LawTag.Child, LawTag.Parent, LawTag.Benefits],
    groupId: LawGroupId.BEEG_SiblingBonus,
    relatedLaws: {
      [LawId.BEEG_2]: {
        relationType: LawRelationType.Extends,
        description: "Applies 10% uplift on top of the calculated § 2 entitlement.",
      },
      [LawId.BEEG_4a]: {
        relationType: LawRelationType.InteractsWith,
        description: "Halves the €75 minimum addition to €37.50 for ElterngeldPlus months.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2a"),
        label: "§ 2a BEEG Statutory Text",
        description: "Sibling age routes (<36 months for 1 child, <72 months for 2+ children).",
      },
    },
  }),

  [LawId.BEEG_2b]: freezeEntry({
    id: LawId.BEEG_2b,
    citation: toStatutoryCitation("§ 2b BEEG"),
    code: LawCode.BEEG,
    section: "§ 2b",
    title: "Assessment Period & Statutory Exclusion Months",
    summary: "Selects the 12 eligible calendar months prior to birth or maternity protection and replaces statutory exclusion months (maternity, prior Elterngeld up to 14 life-months) with earlier months.",
    benefit: "Excludes maternity and earlier Elterngeld months so a closely spaced second birth can reach back to higher pre-birth earnings.",
    antiBenefit: "Denied prior Elterngeld claims or long unpaid gaps do not qualify as exclusion months and can dilute the 12-month average.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits, LawTag.Maternity],
    groupId: LawGroupId.BEEG_TaxSwap,
    relatedLaws: {
      [LawId.BEEG_2c]: {
        relationType: LawRelationType.InteractsWith,
        description: "Supplies the eligible months used to determine the frozen tax class.",
      },
      [LawId.MuSchG_3]: {
        relationType: LawRelationType.DependsOn,
        description: "Maternity protection months trigger statutory lookback exclusions.",
      },
      [LawId.BEEG_2]: {
        relationType: LawRelationType.Implements,
        description: "Feeds the 12-month average into the § 2 replacement calculation.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2b"),
        label: "§ 2b BEEG Statutory Text",
        description: "12-month assessment window and statutory exclusion rules.",
      },
    },
  }),

  [LawId.BEEG_2c]: freezeEntry({
    id: LawId.BEEG_2c,
    citation: toStatutoryCitation("§ 2c BEEG"),
    code: LawCode.BEEG,
    section: "§ 2c",
    title: "Employment Income & Tax-Class Tie-Breaking",
    summary: "Establishes how ongoing employment wages enter standardized Elterngeld net and selects the tax class that prevailed in the majority of eligible months (latest on a tie).",
    benefit: "A timely switch into a more favorable tax class (e.g. V→III) across the majority or tie-break of assessment months raises standardized net.",
    antiBenefit: "A late tax-class switch cannot rewrite the majority/tie rule, and higher monthly withholding reduces the other spouse's cash flow until annual reconciliation.",
    tags: [LawTag.Parent, LawTag.Payroll, LawTag.Tax, LawTag.Benefits],
    groupId: LawGroupId.BEEG_TaxSwap,
    relatedLaws: {
      [LawId.BEEG_2b]: {
        relationType: LawRelationType.DependsOn,
        description: "Uses the eligible assessment months defined in § 2b BEEG.",
      },
      [LawId.BEEG_2e]: {
        relationType: LawRelationType.InteractsWith,
        description: "Standardized tax deductions are computed using the selected class under § 2e.",
      },
      [LawId.EStG_38b]: {
        relationType: LawRelationType.DependsOn,
        description: "Wage tax classes I–VI originate from § 38b EStG.",
      },
      [LawId.EStG_26b]: {
        relationType: LawRelationType.ContrastsWith,
        description: "Temporary class swaps do not change final annual liability under joint assessment.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2c"),
        label: "§ 2c BEEG Statutory Text",
        description: "Deduction characteristic selection and employment income rules.",
      },
      [ExternalSourceId.Familienportal]: {
        url: toSourceUrl("https://familienportal.de/familienportal/familienleistungen/elterngeld/arbeitssituation/auf-welche-steuerklasse-kommt-es-fuer-die-berechnung-meines-elterngelds-an-wenn-ich-die-steuerklasse-gewechselt-habe--124670"),
        label: "Familienportal Tax-Class Guidance",
        description: "Official federal guidance on tax-class switches and equal-duration ties.",
      },
    },
  }),

  [LawId.BEEG_2d]: freezeEntry({
    id: LawId.BEEG_2d,
    citation: toStatutoryCitation("§ 2d BEEG"),
    code: LawCode.BEEG,
    section: "§ 2d",
    title: "Mixed & Self-Employed Income Rules",
    summary: "Coordinates assessment periods when self-employment or business income coincides with employment earnings.",
    benefit: "Prevents double counting and sets deterministic rules when non-employment income is present.",
    antiBenefit: "Self-employed or mixed income shifts the assessment period to the last concluded tax assessment year rather than 12 pre-birth months.",
    tags: [LawTag.Parent, LawTag.Tax, LawTag.Benefits],
    groupId: LawGroupId.BEEG_SyntheticNet,
    relatedLaws: {
      [LawId.BEEG_2b]: {
        relationType: LawRelationType.Modifies,
        description: "Shifts the assessment window when profit-based income exists.",
      },
      [LawId.BEEG_2c]: {
        relationType: LawRelationType.ContrastsWith,
        description: "Applies to non-employment profit income vs. § 2c employment wages.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2d"),
        label: "§ 2d BEEG Statutory Text",
        description: "Assessment rules for profit and mixed income.",
      },
    },
  }),

  [LawId.BEEG_2e]: freezeEntry({
    id: LawId.BEEG_2e,
    citation: toStatutoryCitation("§ 2e BEEG"),
    code: LawCode.BEEG,
    section: "§ 2e",
    title: "Standardized BEEG Tax Deductions",
    summary: "Applies standardized income tax, solidarity surcharge, and flat church tax (8%) using the January PAP of the calendar year before birth.",
    benefit: "Creates a predictable standardized net separate from individual payroll quirks like mid-year allowances.",
    antiBenefit: "Ignores personal payroll allowances and depends on the January PAP snapshot from the year prior to birth.",
    tags: [LawTag.Parent, LawTag.Tax, LawTag.Benefits],
    groupId: LawGroupId.BEEG_SyntheticNet,
    relatedLaws: {
      [LawId.BMF_PAP]: {
        relationType: LawRelationType.DependsOn,
        description: "Uses the January BMF PAP table of the calendar year before birth.",
      },
      [LawId.BEEG_2f]: {
        relationType: LawRelationType.InteractsWith,
        description: "Combined with § 2f flat social deductions to form BEEG standardized net.",
      },
      [LawId.BEEG_2c]: {
        relationType: LawRelationType.DependsOn,
        description: "Receives the frozen tax class and church tax flag from § 2c.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2e"),
        label: "§ 2e BEEG Statutory Text",
        description: "Standardized BEEG tax deduction rules.",
      },
    },
  }),

  [LawId.BEEG_2f]: freezeEntry({
    id: LawId.BEEG_2f,
    citation: toStatutoryCitation("§ 2f BEEG"),
    code: LawCode.BEEG,
    section: "§ 2f",
    title: "Standardized BEEG Social Security Flat Deductions",
    summary: "Deducts flat statutory percentages (9% health/care, 10% pension, 2% unemployment) without ordinary contribution ceilings, plus a transition-zone factor.",
    benefit: "Applies a lower transition-zone deduction factor for low-to-mid incomes.",
    antiBenefit: "High earners have no upper contribution ceiling in BEEG net (unlike real payroll), reducing BEEG net compared to actual take-home pay.",
    tags: [LawTag.Parent, LawTag.Insurance, LawTag.Benefits],
    groupId: LawGroupId.BEEG_SyntheticNet,
    relatedLaws: {
      [LawId.BEEG_2e]: {
        relationType: LawRelationType.InteractsWith,
        description: "Combined with § 2e tax deductions to produce BEEG net.",
      },
      [LawId.SGB4_20]: {
        relationType: LawRelationType.InteractsWith,
        description: "Transition-zone BEEG factor parallels the SGB IV Midijob corridor.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "2f"),
        label: "§ 2f BEEG Statutory Text",
        description: "Flat 9%/10%/2% social-insurance deductions for BEEG.",
      },
    },
  }),

  [LawId.BEEG_3]: freezeEntry({
    id: LawId.BEEG_3,
    citation: toStatutoryCitation("§ 3 BEEG"),
    code: LawCode.BEEG,
    section: "§ 3",
    title: "Offsetting Maternity & Wage-Replacement Benefits",
    summary: "Credits maternity benefits (Mutterschaftsgeld and employer supplement) euro-for-euro against Elterngeld in overlapping months.",
    benefit: "Ensures maternity pay covers 100% of prior net without consuming extra family Basis months beyond the offset.",
    antiBenefit: "Maternity months still count as Basiselterngeld months used by the mother and zero out simultaneous Elterngeld payouts.",
    tags: [LawTag.Maternity, LawTag.Parent, LawTag.Benefits],
    groupId: LawGroupId.MuSchG_Maternity,
    relatedLaws: {
      [LawId.MuSchG_19]: {
        relationType: LawRelationType.Offsets,
        description: "Offsets statutory Mutterschaftsgeld against Elterngeld.",
      },
      [LawId.MuSchG_20]: {
        relationType: LawRelationType.Offsets,
        description: "Offsets employer maternity supplement against Elterngeld.",
      },
      [LawId.BEEG_4]: {
        relationType: LawRelationType.InteractsWith,
        description: "Maternity offset months count toward the mother's Basis budget.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "3"),
        label: "§ 3 BEEG Statutory Text",
        description: "Crediting rules for maternity and replacement benefits.",
      },
    },
  }),

  [LawId.BEEG_4]: freezeEntry({
    id: LawId.BEEG_4,
    citation: toStatutoryCitation("§ 4 BEEG"),
    code: LawCode.BEEG,
    section: "§ 4",
    title: "Claim Duration, Parent Budgets & Partner Months",
    summary: "Allocates 12 Basis months plus 2 additional Partner months (14 total), subject to a minimum 2-month claim per claiming parent.",
    benefit: "Grants 2 bonus Partner months when both parents claim at least 2 months each.",
    antiBenefit: "Claims shorter than 2 life-months are forfeited, and parallel Basis months by both parents have statutory overlap limits.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits],
    groupId: LawGroupId.BEEG_PartnershipBonus,
    relatedLaws: {
      [LawId.BEEG_4a]: {
        relationType: LawRelationType.Extends,
        description: "Each remaining Basis month can be converted into 2 ElterngeldPlus months.",
      },
      [LawId.BEEG_4b]: {
        relationType: LawRelationType.Extends,
        description: "Adds up to 4 extra Plus months per parent via Partnership Bonus.",
      },
      [LawId.BEEG_1]: {
        relationType: LawRelationType.DependsOn,
        description: "Requires meeting the § 1 weekly hours and income limits.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "4"),
        label: "§ 4 BEEG Statutory Text",
        description: "12+2 family budget and 2-month minimum claim rules.",
      },
    },
  }),

  [LawId.BEEG_4a]: freezeEntry({
    id: LawId.BEEG_4a,
    citation: toStatutoryCitation("§ 4a BEEG"),
    code: LawCode.BEEG,
    section: "§ 4a",
    title: "ElterngeldPlus Calculation & Personal Ceiling",
    summary: "Doubles the payout duration at up to 50% of the no-income Basis entitlement (€150–€900/month), rewarding part-time post-birth work.",
    benefit: "Stretches budget months 2-for-1 and softens part-time income offsets compared to Basiselterngeld.",
    antiBenefit: "Strictly capped at half of the parent's no-income Basis entitlement (ceiling €900/month before sibling bonus).",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits, LawTag.Payroll],
    groupId: LawGroupId.BEEG_SyntheticNet,
    relatedLaws: {
      [LawId.BEEG_2]: {
        relationType: LawRelationType.DependsOn,
        description: "Uses the parent's § 2 no-income Basis amount to set the 50% Plus cap.",
      },
      [LawId.BEEG_4]: {
        relationType: LawRelationType.Modifies,
        description: "Converts 1 Basis month into 2 ElterngeldPlus months.",
      },
      [LawId.BEEG_4b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Partnership bonus months are paid under ElterngeldPlus rules.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "4a"),
        label: "§ 4a BEEG Statutory Text",
        description: "ElterngeldPlus rate, cap, and conversion mechanics.",
      },
    },
  }),

  [LawId.BEEG_4b]: freezeEntry({
    id: LawId.BEEG_4b,
    citation: toStatutoryCitation("§ 4b BEEG"),
    code: LawCode.BEEG,
    section: "§ 4b",
    title: "Partnership Bonus (Partnerschaftsbonus)",
    summary: "Provides 2 to 4 additional ElterngeldPlus months for each parent if both simultaneously work 24–32 hours/week in consecutive months.",
    benefit: "Unlocks up to 4 extra ElterngeldPlus months per parent beyond the standard 14-month family budget.",
    antiBenefit: "If either parent breaks the 24–32h/week corridor in any consecutive bonus month, the bonus months can be reclaimed.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits, LawTag.Payroll],
    groupId: LawGroupId.BEEG_PartnershipBonus,
    relatedLaws: {
      [LawId.BEEG_1]: {
        relationType: LawRelationType.DependsOn,
        description: "Tightens the § 1 max 32h limit into a 24–32h dual-parent corridor.",
      },
      [LawId.BEEG_4a]: {
        relationType: LawRelationType.Implements,
        description: "Bonus months are computed and capped as ElterngeldPlus.",
      },
      [LawId.BEEG_4]: {
        relationType: LawRelationType.Extends,
        description: "Adds supplementary months on top of the 12+2 family budget.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("beeg", "4b"),
        label: "§ 4b BEEG Statutory Text",
        description: "24–32h corridor and 2–4 consecutive month conditions.",
      },
    },
  }),

  [LawId.EStG_2]: freezeEntry({
    id: LawId.EStG_2,
    citation: toStatutoryCitation("§ 2 EStG"),
    code: LawCode.EStG,
    section: "§ 2",
    title: "Income Categories & Taxable Income (zvE)",
    summary: "Defines total income, adjusted gross income, and taxable income (zu versteuerndes Einkommen), including § 2 Abs. 5a modifications for benefit eligibility.",
    benefit: "Provides the structured deduction chain from gross wages down to taxable income.",
    antiBenefit: "For Elterngeld income limits (§ 1 Abs. 8 BEEG), § 2 Abs. 5a adds back certain capital income and deductions.",
    tags: [LawTag.Tax, LawTag.Payroll, LawTag.Benefits],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_9a]: {
        relationType: LawRelationType.DependsOn,
        description: "Subtracts work-expense lump sum before arriving at employment income.",
      },
      [LawId.EStG_32a]: {
        relationType: LawRelationType.Implements,
        description: "zvE from § 2 feeds the statutory § 32a income tax tariff.",
      },
      [LawId.BEEG_1]: {
        relationType: LawRelationType.InteractsWith,
        description: "Determines couple taxable income tested against the BEEG limit.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "2"),
        label: "§ 2 EStG Statutory Text",
        description: "Scope of income and taxable income derivation.",
      },
    },
  }),

  [LawId.EStG_9a]: freezeEntry({
    id: LawId.EStG_9a,
    citation: toStatutoryCitation("§ 9a EStG"),
    code: LawCode.EStG,
    section: "§ 9a",
    title: "Employee Work-Expense Lump Sum (Arbeitnehmer-Pauschbetrag)",
    summary: "Grants an automatic standard annual work-expense deduction (€1,230) against employment income without requiring receipts.",
    benefit: "Automatically reduces taxable employment income by €1,230 per employed person per year.",
    antiBenefit: "Already built into standard payroll tables, so it only generates an extra refund if actual itemized expenses exceed €1,230.",
    tags: [LawTag.Tax, LawTag.Payroll],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_19]: {
        relationType: LawRelationType.Modifies,
        description: "Applies directly to employment income under § 19 EStG.",
      },
      [LawId.EStG_2]: {
        relationType: LawRelationType.Implements,
        description: "Lowers net employment income entering § 2 EStG.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "9a"),
        label: "§ 9a EStG Statutory Text",
        description: "Standard lump-sum work-expense deduction.",
      },
    },
  }),

  [LawId.EStG_10]: freezeEntry({
    id: LawId.EStG_10,
    citation: toStatutoryCitation("§ 10 EStG"),
    code: LawCode.EStG,
    section: "§ 10",
    title: "Deductible Provident & Insurance Contributions (Vorsorgeaufwendungen)",
    summary: "Governs deductibility of statutory pension contributions, basic health/long-term care insurance, and other insurance caps.",
    benefit: "Allows full deduction of basic health/care contributions and statutory pension shares.",
    antiBenefit: "Other insurance premiums (like unemployment) are capped and crowded out once basic health/care exceeds €1,900 (€3,800 joint).",
    tags: [LawTag.Tax, LawTag.Insurance, LawTag.Payroll],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_10c]: {
        relationType: LawRelationType.InteractsWith,
        description: "Works alongside the general special-expense lump sum.",
      },
      [LawId.SGB5_241]: {
        relationType: LawRelationType.DependsOn,
        description: "Deducts employee health share contributions.",
      },
      [LawId.SGB6_158]: {
        relationType: LawRelationType.DependsOn,
        description: "Deducts employee pension contributions.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "10"),
        label: "§ 10 EStG Statutory Text",
        description: "Special-expense deductions for pension and health/care contributions.",
      },
    },
  }),

  [LawId.EStG_10_1_5]: freezeEntry({
    id: LawId.EStG_10_1_5,
    citation: toStatutoryCitation("§ 10 Abs. 1 Nr. 5 EStG"),
    code: LawCode.EStG,
    section: "§ 10 Abs. 1 Nr. 5",
    title: "Childcare Expenses Special Deduction (Kinderbetreuungskosten)",
    summary: "Allows deducting qualified daycare, Kita, Tagesmutter, or nanny care expenses as Sonderausgaben for children under age 14: two-thirds up to €4,000/child through 2024, raised to 80% up to €4,800/child/year from 2025 under JStG 2024.",
    benefit: "Lowers annual joint taxable income (zvE) by up to €4,800 per child under 14 from 2025 onward (80% of €6,000 paid care expenses).",
    antiBenefit: "Covers pure care contributions only — meal charges and sports/music tuition remain non-deductible, and cash reimbursement requires verified invoices plus bank transfer.",
    tags: [LawTag.Child, LawTag.Parent, LawTag.Tax],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_10]: {
        relationType: LawRelationType.Extends,
        description: "Itemized under § 10 EStG Sonderausgaben alongside provident insurance deductions.",
      },
      [LawId.EStG_2]: {
        relationType: LawRelationType.Modifies,
        description: "Reduces annual joint taxable income (§ 2 Abs. 4 EStG).",
      },
      [LawId.EStG_66]: {
        relationType: LawRelationType.InteractsWith,
        description: "Applies independently alongside Kindergeld / Kinderfreibetrag.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "10"),
        label: "§ 10 Abs. 1 Nr. 5 EStG Statutory Text",
        description: "Deductibility of childcare expenses as Sonderausgaben.",
      },
      [ExternalSourceId.Bundesgesetzblatt]: {
        url: toSourceUrl("https://www.recht.bund.de/bgbl/1/2024/387/regelungstext.pdf"),
        label: "Jahressteuergesetz 2024 (BGBl. I 2024 Nr. 387)",
        description: "Raised deductible share from 2/3 (€4,000) to 80% (€4,800) starting 2025.",
      },
    },
  }),

  [LawId.EStG_10c]: freezeEntry({
    id: LawId.EStG_10c,
    citation: toStatutoryCitation("§ 10c EStG"),
    code: LawCode.EStG,
    section: "§ 10c",
    title: "Special-Expense Lump Sum (Sonderausgaben-Pauschbetrag)",
    summary: "Provides a small automatic special-expense allowance (€36 single / €72 joint) when no higher itemized special expenses are claimed.",
    benefit: "Automatically reduces taxable income by €36 (€72 joint) without documentation.",
    antiBenefit: "Modest fixed amount that does not scale with income.",
    tags: [LawTag.Tax],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_10]: {
        relationType: LawRelationType.InteractsWith,
        description: "Applied alongside provident insurance deductions.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "10c"),
        label: "§ 10c EStG Statutory Text",
        description: "Standard €36 / €72 special-expense lump sum.",
      },
    },
  }),

  [LawId.EStG_19]: freezeEntry({
    id: LawId.EStG_19,
    citation: toStatutoryCitation("§ 19 EStG"),
    code: LawCode.EStG,
    section: "§ 19",
    title: "Income from Employment (Einkünfte aus nichtselbständiger Arbeit)",
    summary: "Classifies regular wages, salaries, bonuses, and employer supplements as taxable employment income.",
    benefit: "Qualifies for the § 9a work-expense lump sum and standard payroll withholding.",
    antiBenefit: "Contractual bonuses and 13th-month salaries are taxed as ordinary employment income.",
    tags: [LawTag.Payroll, LawTag.Tax],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.EStG_9a]: {
        relationType: LawRelationType.Modifies,
        description: "Reduced by the § 9a EStG employee expense allowance.",
      },
      [LawId.EStG_39b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Regular vs. one-off bonus withholding rules under § 39b apply.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "19"),
        label: "§ 19 EStG Statutory Text",
        description: "Definition of taxable employment wages and extras.",
      },
    },
  }),

  [LawId.EStG_20]: freezeEntry({
    id: LawId.EStG_20,
    citation: toStatutoryCitation("§ 20 EStG"),
    code: LawCode.EStG,
    section: "§ 20",
    title: "Capital Investment Income (Kapitalerträge)",
    summary: "Governs dividends, interest, and investment gains; excluded from BEEG employment earnings but relevant for § 2 Abs. 5a eligibility.",
    benefit: "Allows tracking passive dividend/ETF cash flows separately from employment payroll.",
    antiBenefit: "Still counts toward the prior-year household taxable income cap for Elterngeld eligibility.",
    tags: [LawTag.Tax, LawTag.Benefits],
    relatedLaws: {
      [LawId.EStG_2]: {
        relationType: LawRelationType.InteractsWith,
        description: "Enters § 2 Abs. 5a EStG modifications for benefit income limits.",
      },
      [LawId.BEEG_1]: {
        relationType: LawRelationType.InteractsWith,
        description: "Can push household income above the BEEG § 1 Abs. 8 limit.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "20"),
        label: "§ 20 EStG Statutory Text",
        description: "Taxation of dividends, interest, and capital gains.",
      },
    },
  }),

  [LawId.EStG_24a]: freezeEntry({
    id: LawId.EStG_24a,
    citation: toStatutoryCitation("§ 24a EStG"),
    code: LawCode.EStG,
    section: "§ 24a",
    title: "Age Relief Allowance (Altersentlastungsbetrag)",
    summary: "Grants an age-cohort percentage relief (with an annual euro cap) on positive wages for taxpayers over age 64 on January 1.",
    benefit: "Reduces annual taxable income automatically based on the permanent birth-year cohort.",
    antiBenefit: "Cohort percentage and euro cap phase down over time and require known age at start of year.",
    tags: [LawTag.Tax, LawTag.Payroll],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_2]: {
        relationType: LawRelationType.Modifies,
        description: "Deducted when computing annual adjusted gross income.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "24a"),
        label: "§ 24a EStG Statutory Text",
        description: "Age relief cohort table and maximum annual amounts.",
      },
    },
  }),

  [LawId.EStG_24b]: freezeEntry({
    id: LawId.EStG_24b,
    citation: toStatutoryCitation("§ 24b EStG"),
    code: LawCode.EStG,
    section: "§ 24b",
    title: "Single-Parent Tax Relief (Entlastungsbetrag für Alleinerziehende)",
    summary: "Grants €4,260 relief (plus €240 per additional qualifying child) to eligible single parents in Tax Class II.",
    benefit: "Significantly lowers Tax Class II withholding and annual taxable income for qualifying single parents.",
    antiBenefit: "Lost immediately if another adult shares the household registration (no true single-parent household).",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Tax],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.EStG_38b]: {
        relationType: LawRelationType.Implements,
        description: "Incorporated into Tax Class II wage withholding.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "24b"),
        label: "§ 24b EStG Statutory Text",
        description: "Single-parent relief base and extra-child increments.",
      },
    },
  }),

  [LawId.EStG_26]: freezeEntry({
    id: LawId.EStG_26,
    citation: toStatutoryCitation("§ 26 EStG"),
    code: LawCode.EStG,
    section: "§ 26",
    title: "Election of Individual vs. Joint Assessment",
    summary: "Allows married spouses or registered civil partners to elect either individual assessment or joint assessment.",
    benefit: "Gives couples flexibility to choose joint splitting or separate assessment when beneficial.",
    antiBenefit: "Joint assessment is never automatic from living together; it requires marriage/registered partnership and explicit election.",
    tags: [LawTag.Marriage, LawTag.Tax],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_26b]: {
        relationType: LawRelationType.Implements,
        description: "Joint assessment election triggers the § 26b splitting calculation.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "26"),
        label: "§ 26 EStG Statutory Text",
        description: "Conditions for spouse/partner assessment election.",
      },
    },
  }),

  [LawId.EStG_26b]: freezeEntry({
    id: LawId.EStG_26b,
    citation: toStatutoryCitation("§ 26b EStG"),
    code: LawCode.EStG,
    section: "§ 26b",
    title: "Joint Spousal Assessment (Zusammenveranlagung)",
    summary: "Pools both spouses' taxable income and reconciles withheld payroll taxes against the joint splitting tariff.",
    benefit: "Equalizes asymmetric earnings (e.g. during parental leave) and often generates refunds when one partner stops working.",
    antiBenefit: "A III/V or IV-factor setup can still trigger a tax repayment at year-end when combined with § 32b progression income.",
    tags: [LawTag.Marriage, LawTag.Tax, LawTag.Parent],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_26]: {
        relationType: LawRelationType.DependsOn,
        description: "Requires an eligible joint-assessment election under § 26.",
      },
      [LawId.EStG_32a]: {
        relationType: LawRelationType.Implements,
        description: "Applies the § 32a Abs. 5 splitting formula to pooled zvE.",
      },
      [LawId.EStG_32b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Elterngeld/Mutterschutz progression raises the effective tax rate on joint income.",
      },
      [LawId.EStG_36]: {
        relationType: LawRelationType.Implements,
        description: "Reconciles assessed liability against monthly withheld tax credits.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "26b"),
        label: "§ 26b EStG Statutory Text",
        description: "Pooling of spousal income under joint assessment.",
      },
    },
  }),

  [LawId.EStG_31]: freezeEntry({
    id: LawId.EStG_31,
    citation: toStatutoryCitation("§ 31 EStG"),
    code: LawCode.EStG,
    section: "§ 31",
    title: "Family Equalization & Günstigerprüfung",
    summary: "Automatically compares Kindergeld received during the year against the tax savings from the Kinderfreibetrag and grants whichever is higher.",
    benefit: "High-marginal-rate households automatically receive the extra tax relief above paid Kindergeld.",
    antiBenefit: "Middle- and lower-income households receive no extra tax deduction because Kindergeld already exceeds the tax relief.",
    tags: [LawTag.Child, LawTag.Tax, LawTag.Benefits],
    groupId: LawGroupId.EStG_Kindergeld,
    relatedLaws: {
      [LawId.EStG_32]: {
        relationType: LawRelationType.DependsOn,
        description: "Tests the annual § 32 Abs. 6 Kinderfreibetrag amount.",
      },
      [LawId.EStG_66]: {
        relationType: LawRelationType.ContrastsWith,
        description: "Compares tax relief against monthly § 66 Kindergeld payouts.",
      },
      [LawId.SolzG_3]: {
        relationType: LawRelationType.InteractsWith,
        description: "Kinderfreibetrag always reduces the Solidarity Surcharge base even when Kindergeld wins.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "31"),
        label: "§ 31 EStG Statutory Text",
        description: "Mandatory tax-office Günstigerprüfung rule.",
      },
    },
  }),

  [LawId.EStG_32]: freezeEntry({
    id: LawId.EStG_32,
    citation: toStatutoryCitation("§ 32 EStG"),
    code: LawCode.EStG,
    section: "§ 32",
    title: "Child Allowance (Kinderfreibetrag & BEA)",
    summary: "Sets the annual tax-free allowance per child (subsistence + care/education/training allowance), prorated by birth month.",
    benefit: "Protects the minimum subsistence cost of each child from income tax and reduces SolZ/church tax.",
    antiBenefit: "Only lowers income tax if its tax relief exceeds annual Kindergeld under § 31 Günstigerprüfung.",
    tags: [LawTag.Child, LawTag.Tax],
    groupId: LawGroupId.EStG_Kindergeld,
    relatedLaws: {
      [LawId.EStG_31]: {
        relationType: LawRelationType.Implements,
        description: "Evaluated by the § 31 favorability test.",
      },
      [LawId.EStG_66]: {
        relationType: LawRelationType.ContrastsWith,
        description: "Alternative to monthly Kindergeld cash payments.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "32"),
        label: "§ 32 EStG Statutory Text",
        description: "Child definition and Kinderfreibetrag amounts.",
      },
    },
  }),

  [LawId.EStG_32a]: freezeEntry({
    id: LawId.EStG_32a,
    citation: toStatutoryCitation("§ 32a EStG"),
    code: LawCode.EStG,
    section: "§ 32a",
    title: "Income Tax Tariff & Splitting Formula",
    summary: "Defines the piecewise progressive German income tax formula (basic allowance, two quadratic zones, 42% top zone, 45% highest zone) and the Abs. 5 splitting tariff.",
    benefit: "Exempts income up to the Grundfreibetrag and halves progression for joint spouses via the splitting factor 2 × T(zvE / 2).",
    antiBenefit: "Steep marginal progression in Zones 2–3 means extra income or progression benefits increase effective tax rates quickly.",
    tags: [LawTag.Tax, LawTag.Marriage],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_26b]: {
        relationType: LawRelationType.Implements,
        description: "Applies Abs. 5 splitting formula for joint assessment.",
      },
      [LawId.EStG_32b]: {
        relationType: LawRelationType.Modifies,
        description: "Progression clause modifies the average rate applied to § 32a.",
      },
      [LawId.EStG_2]: {
        relationType: LawRelationType.DependsOn,
        description: "Takes annual zvE from § 2 EStG as input.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "32a"),
        label: "§ 32a EStG Statutory Text",
        description: "Piecewise progressive tariff coefficients and splitting formula.",
      },
      [ExternalSourceId.Bundesgesetzblatt]: {
        url: toSourceUrl("https://www.recht.bund.de/bgbl/1/2024/449/regelungstext.pdf?__blob=publicationFile&v=3"),
        label: "Federal Law Gazette (Steuerfortentwicklungsgesetz)",
        description: "Official published 2025/2026 Grundfreibetrag and tariff coefficients.",
      },
    },
  }),

  [LawId.EStG_32b]: freezeEntry({
    id: LawId.EStG_32b,
    citation: toStatutoryCitation("§ 32b EStG"),
    code: LawCode.EStG,
    section: "§ 32b",
    title: "Progression Clause (Progressionsvorbehalt)",
    summary: "Adds tax-free wage-replacement benefits (Elterngeld, Mutterschaftsgeld) to taxable income solely to determine a higher average tax rate on remaining taxable income.",
    benefit: "Elterngeld and Mutterschutz stay tax-free themselves — only the rate on other taxable income is adjusted.",
    antiBenefit: "Frequently triggers unexpected year-end tax repayments when one spouse continues earning high salary while the other receives Elterngeld.",
    tags: [LawTag.Tax, LawTag.Parent, LawTag.Benefits, LawTag.Maternity],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_32a]: {
        relationType: LawRelationType.Modifies,
        description: "Computes effective average rate at T(zvE + benefits) / (zvE + benefits).",
      },
      [LawId.EStG_26b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Hits joint spousal income during parental-leave years.",
      },
      [LawId.BEEG_2]: {
        relationType: LawRelationType.InteractsWith,
        description: "Elterngeld payouts enter the § 32b progression base.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "32b"),
        label: "§ 32b EStG Statutory Text",
        description: "List of progression-subject benefits and rate formula.",
      },
    },
  }),

  [LawId.EStG_36]: freezeEntry({
    id: LawId.EStG_36,
    citation: toStatutoryCitation("§ 36 EStG"),
    code: LawCode.EStG,
    section: "§ 36",
    title: "Annual Tax Credits & Signed Settlement",
    summary: "Credits withheld monthly wage tax and solidarity surcharge against final assessed annual tax liability, yielding a refund or repayment.",
    benefit: "Returns excess monthly withholding (e.g. from temporary Class V during § 2b optimization) after filing.",
    antiBenefit: "Produces a tax repayment bill when monthly withholding (e.g. Class III or § 32b years) was lower than final liability.",
    tags: [LawTag.Tax, LawTag.Payroll],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_26b]: {
        relationType: LawRelationType.DependsOn,
        description: "Settles assessed annual joint liability.",
      },
      [LawId.EStG_38b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Reconciles monthly payroll withholding back to true liability.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "36"),
        label: "§ 36 EStG Statutory Text",
        description: "Assessment settlement and credit rules.",
      },
    },
  }),

  [LawId.EStG_38b]: freezeEntry({
    id: LawId.EStG_38b,
    citation: toStatutoryCitation("§ 38b EStG"),
    code: LawCode.EStG,
    section: "§ 38b",
    title: "Wage Tax Classes (Lohnsteuerklassen I–VI)",
    summary: "Assigns monthly payroll tax classes: I (single), II (single parent), III/V (spousal split), IV/IV (equal split), VI (secondary job).",
    benefit: "Lets couples shape monthly net cash flow and legally optimize Elterngeld assessment under § 2c BEEG.",
    antiBenefit: "Does not reduce total annual income tax; Class III/V or V/III only shifts timing between monthly payroll and § 36 settlement.",
    tags: [LawTag.Payroll, LawTag.Tax, LawTag.Marriage],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.EStG_39f]: {
        relationType: LawRelationType.Extends,
        description: "Class IV + Factor spreads joint tax liability proportionally.",
      },
      [LawId.BEEG_2c]: {
        relationType: LawRelationType.InteractsWith,
        description: "Payroll tax class determines BEEG standardized tax deductions.",
      },
      [LawId.EStG_36]: {
        relationType: LawRelationType.InteractsWith,
        description: "Monthly differences are settled at year-end under § 36.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "38b"),
        label: "§ 38b EStG Statutory Text",
        description: "Classification rules for wage tax classes I–VI.",
      },
    },
  }),

  [LawId.EStG_39b]: freezeEntry({
    id: LawId.EStG_39b,
    citation: toStatutoryCitation("§ 39b EStG"),
    code: LawCode.EStG,
    section: "§ 39b",
    title: "Monthly Payroll & One-Off Bonus Withholding (Sonstige Bezüge)",
    summary: "Governs regular monthly wage-tax withholding and the differential annualization method for irregular bonuses (13th-month / vacation / Christmas bonuses).",
    benefit: "Prevents over-withholding on regular monthly paychecks when bonuses occur.",
    antiBenefit: "Bonuses face differential annual marginal withholding and do not count as ongoing regular pay for BEEG Elterngeld.",
    tags: [LawTag.Payroll, LawTag.Tax],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.BMF_PAP]: {
        relationType: LawRelationType.Implements,
        description: "Implemented algorithmically via the official BMF PAP.",
      },
      [LawId.EStG_19]: {
        relationType: LawRelationType.DependsOn,
        description: "Withholds tax on § 19 employment earnings.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "39b"),
        label: "§ 39b EStG Statutory Text",
        description: "Regular and Sonstige Bezüge withholding rules.",
      },
    },
  }),

  [LawId.EStG_39f]: freezeEntry({
    id: LawId.EStG_39f,
    citation: toStatutoryCitation("§ 39f EStG"),
    code: LawCode.EStG,
    section: "§ 39f",
    title: "Class IV Factor Method (Faktorverfahren)",
    summary: "Applies a 3-decimal-truncated splitting factor to Class IV withholding so spouses pay near-exact proportional annual tax every month.",
    benefit: "Avoids large year-end tax repayments common with III/V while reflecting splitting gains immediately.",
    antiBenefit: "Reduces the higher-earning or leave-planning spouse's BEEG net compared to strategically switching into Class III.",
    tags: [LawTag.Payroll, LawTag.Tax, LawTag.Marriage],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.EStG_38b]: {
        relationType: LawRelationType.Modifies,
        description: "Modifies Tax Class IV monthly payroll withholding.",
      },
      [LawId.BMF_PAP]: {
        relationType: LawRelationType.DependsOn,
        description: "Factor calculation uses the published BMF PAP tax tables.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "39f"),
        label: "§ 39f EStG Statutory Text",
        description: "Formula and 3-decimal truncation for Class IV factor.",
      },
    },
  }),

  [LawId.EStG_62]: freezeEntry({
    id: LawId.EStG_62,
    citation: toStatutoryCitation("§ 62 EStG"),
    code: LawCode.EStG,
    section: "§ 62",
    title: "Kindergeld Personal Entitlement Conditions",
    summary: "Establishes residency, parental relationship, and personal eligibility criteria for monthly Kindergeld.",
    benefit: "Covers biological, adopted, and qualifying household children in Germany.",
    antiBenefit: "Requires valid German residency/tax-status ties and ongoing child qualification.",
    tags: [LawTag.Child, LawTag.Benefits, LawTag.Visa],
    groupId: LawGroupId.EStG_Kindergeld,
    relatedLaws: {
      [LawId.EStG_66]: {
        relationType: LawRelationType.Implements,
        description: "Determines who receives the monthly § 66 payout.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "62"),
        label: "§ 62 EStG Statutory Text",
        description: "Residency and personal eligibility for Kindergeld.",
      },
    },
  }),

  [LawId.EStG_66]: freezeEntry({
    id: LawId.EStG_66,
    citation: toStatutoryCitation("§ 66 EStG"),
    code: LawCode.EStG,
    section: "§ 66",
    title: "Monthly Child Benefit Amount (Kindergeld)",
    summary: "Sets the uniform monthly tax-exempt child benefit payment per qualifying child (€259/month in 2026).",
    benefit: "Provides steady, tax-free monthly cash per child regardless of parent income.",
    antiBenefit: "Credited against the § 32 Kinderfreibetrag tax advantage during annual § 31 Günstigerprüfung.",
    tags: [LawTag.Child, LawTag.Benefits, LawTag.Tax],
    groupId: LawGroupId.EStG_Kindergeld,
    relatedLaws: {
      [LawId.EStG_62]: {
        relationType: LawRelationType.DependsOn,
        description: "Requires personal entitlement under § 62 EStG.",
      },
      [LawId.EStG_31]: {
        relationType: LawRelationType.InteractsWith,
        description: "Tested annually against the § 32 Kinderfreibetrag.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "66"),
        label: "§ 66 EStG Statutory Text",
        description: "Monthly Kindergeld euro amount per child.",
      },
    },
  }),

  [LawId.InflG]: freezeEntry({
    id: LawId.InflG,
    citation: toStatutoryCitation("InflAusG / StFortEntwG (§ 32a EStG)"),
    code: LawCode.EStG,
    section: "Tarifverschiebung (kalte Progression)",
    title: "Bracket Creep Relief & Inflation Adjustment (Inflationsausgleich)",
    summary: "Periodically shifts § 32a EStG tariff brackets, Grundfreibetrag, and Kinderfreibetrag upward to neutralize cold progression and model future statutory inflation indexing.",
    benefit: "Prevents inflation-driven nominal wage increases from pushing households into higher real income tax brackets.",
    antiBenefit: "Unlegislated future years beyond verified statutory tables (2026+) depend on optional projection assumptions rather than fixed law.",
    tags: [LawTag.Tax, LawTag.Child],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_32a]: {
        relationType: LawRelationType.Modifies,
        description: "Adjusts § 32a EStG Grundfreibetrag and zone ceilings for inflation.",
      },
      [LawId.EStG_32]: {
        relationType: LawRelationType.Modifies,
        description: "Accompanies periodic adjustments to the § 32 Kinderfreibetrag.",
      },
    },
    externalSources: {
      [ExternalSourceId.Bundesgesetzblatt]: {
        url: toSourceUrl("https://www.recht.bund.de/bgbl/1/2024/449/regelungstext.pdf?__blob=publicationFile&v=3"),
        label: "Steuerfortentwicklungsgesetz (BGBl. I 2024 Nr. 449)",
        description: "Statutory inflation-compensation adjustments for 2025 and 2026 tariffs.",
      },
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("estg", "32a"),
        label: "§ 32a EStG Statutory Text",
        description: "Underlying progressive income tax tariff structure.",
      },
    },
  }),

  [LawId.MuSchG_3]: freezeEntry({
    id: LawId.MuSchG_3,
    citation: toStatutoryCitation("§ 3 MuSchG"),
    code: LawCode.MuSchG,
    section: "§ 3",
    title: "Maternity Protection Windows (Mutterschutzfristen)",
    summary: "Prohibits employment during the statutory protection window (6 weeks before expected birth and 8 weeks after birth, 12 weeks for premature/multiple births).",
    benefit: "Protects health and triggers full net wage replacement alongside § 2b BEEG exclusion protection.",
    antiBenefit: "Calendar-month simulations approximate day-exact 6/8-week windows; premature or multiple births extend post-birth windows.",
    tags: [LawTag.Maternity, LawTag.Parent, LawTag.Benefits],
    groupId: LawGroupId.MuSchG_Maternity,
    relatedLaws: {
      [LawId.MuSchG_19]: {
        relationType: LawRelationType.InteractsWith,
        description: "Triggers statutory Mutterschaftsgeld payouts during the protection window.",
      },
      [LawId.MuSchG_20]: {
        relationType: LawRelationType.InteractsWith,
        description: "Triggers the employer supplement topping up to 100% of prior net.",
      },
      [LawId.BEEG_2b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Maternity protection months are excluded from later BEEG lookbacks.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("muschg_2018", "3"),
        label: "§ 3 MuSchG Statutory Text",
        description: "Pre-birth and post-birth employment protection periods.",
      },
    },
  }),

  [LawId.MuSchG_19]: freezeEntry({
    id: LawId.MuSchG_19,
    citation: toStatutoryCitation("§ 19 MuSchG"),
    code: LawCode.MuSchG,
    section: "§ 19",
    title: "Statutory Maternity Allowance (Mutterschaftsgeld)",
    summary: "Provides the health-insurer share of maternity pay (up to €13/calendar day for statutory insured employees) during § 3 protection periods.",
    benefit: "Tax-free base maternity contribution paired with the employer supplement.",
    antiBenefit: "Offsets Elterngeld under § 3 BEEG and enters § 32b EStG progression.",
    tags: [LawTag.Maternity, LawTag.Insurance, LawTag.Benefits],
    groupId: LawGroupId.MuSchG_Maternity,
    relatedLaws: {
      [LawId.MuSchG_20]: {
        relationType: LawRelationType.InteractsWith,
        description: "Combined with employer supplement to reach 100% of average net.",
      },
      [LawId.BEEG_3]: {
        relationType: LawRelationType.Offsets,
        description: "Credited against post-birth Elterngeld.",
      },
      [LawId.EStG_32b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Subject to annual tax progression.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("muschg_2018", "19"),
        label: "§ 19 MuSchG Statutory Text",
        description: "Statutory maternity allowance calculation.",
      },
    },
  }),

  [LawId.MuSchG_20]: freezeEntry({
    id: LawId.MuSchG_20,
    citation: toStatutoryCitation("§ 20 MuSchG"),
    code: LawCode.MuSchG,
    section: "§ 20",
    title: "Employer Maternity Supplement (Arbeitgeberzuschuss)",
    summary: "Requires employers to top up § 19 Mutterschaftsgeld to 100% of the average net wage of the last 3 completed calendar months before protection starts.",
    benefit: "Maintains 100% of pre-maternity net pay during the protection window without payroll tax withholding.",
    antiBenefit: "Because it uses the last 3 months before maternity, a late pay cut lowers it, and it still counts toward § 32b progression.",
    tags: [LawTag.Maternity, LawTag.Payroll, LawTag.Benefits],
    groupId: LawGroupId.MuSchG_Maternity,
    relatedLaws: {
      [LawId.MuSchG_3]: {
        relationType: LawRelationType.DependsOn,
        description: "Paid during § 3 MuSchG protection periods.",
      },
      [LawId.MuSchG_19]: {
        relationType: LawRelationType.Extends,
        description: "Tops up § 19 health-insurer payments to 100% net.",
      },
      [LawId.BEEG_3]: {
        relationType: LawRelationType.Offsets,
        description: "Offsets post-birth Elterngeld under § 3 BEEG.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("muschg_2018", "20"),
        label: "§ 20 MuSchG Statutory Text",
        description: "3-month reference earnings for employer maternity supplement.",
      },
    },
  }),

  [LawId.SolzG_1]: freezeEntry({
    id: LawId.SolzG_1,
    citation: toStatutoryCitation("§ 1 SolzG"),
    code: LawCode.SolzG,
    section: "§ 1",
    title: "Solidarity Surcharge Levy Scope",
    summary: "Establishes the Solidarity Surcharge (Solidaritätszuschlag) levied on assessed and withheld income tax.",
    benefit: "Most middle-income earners are fully exempt thanks to § 3/§ 4 SolzG exemption thresholds.",
    antiBenefit: "Applies on top of income tax for high earners and in the mitigation phase-in zone.",
    tags: [LawTag.Tax, LawTag.Payroll],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.SolzG_3]: {
        relationType: LawRelationType.InteractsWith,
        description: "Base calculation reduces tax base by Kinderfreibetrag under § 3.",
      },
      [LawId.SolzG_4]: {
        relationType: LawRelationType.Implements,
        description: "Rate and mitigation zone are defined in § 4 SolzG.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("solzg_1995", "1"),
        label: "§ 1 SolzG Statutory Text",
        description: "Scope of the Solidarity Surcharge.",
      },
    },
  }),

  [LawId.SolzG_3]: freezeEntry({
    id: LawId.SolzG_3,
    citation: toStatutoryCitation("§ 3 SolzG"),
    code: LawCode.SolzG,
    section: "§ 3",
    title: "Solidarity Surcharge Assessment Base & Child Relief",
    summary: "Computes the Solidarity Surcharge tax base after always deducting child allowances (§ 32 Abs. 6 EStG) regardless of Kindergeld favorability.",
    benefit: "Parents always get the Kinderfreibetrag reduction on Solidarity Surcharge even when Kindergeld beats income tax.",
    antiBenefit: "Increases complexity because SolZ uses a separate notional tax base from income tax when Kindergeld wins.",
    tags: [LawTag.Tax, LawTag.Child],
    groupId: LawGroupId.EStG_TaxSplitting,
    relatedLaws: {
      [LawId.EStG_32]: {
        relationType: LawRelationType.DependsOn,
        description: "Always deducts Kinderfreibetrag when computing SolZ base.",
      },
      [LawId.SolzG_4]: {
        relationType: LawRelationType.Implements,
        description: "Passes reduced tax base to § 4 SolzG rate and exemption.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("solzg_1995", "3"),
        label: "§ 3 SolzG Statutory Text",
        description: "Notional child-adjusted SolZ assessment base.",
      },
    },
  }),

  [LawId.SolzG_4]: freezeEntry({
    id: LawId.SolzG_4,
    citation: toStatutoryCitation("§ 4 SolzG"),
    code: LawCode.SolzG,
    section: "§ 4",
    title: "Solidarity Surcharge Rate, Exemption & Mitigation Zone",
    summary: "Applies 5.5% surcharge above the exemption threshold (doubled for joint spouses), phased in smoothly via the 11.9% mitigation zone.",
    benefit: "Exempts income tax below €19,950 (single) / €39,900 (joint) in 2025, rising in 2026.",
    antiBenefit: "The 11.9% phase-in mitigation zone temporarily creates a higher effective marginal tax rate.",
    tags: [LawTag.Tax, LawTag.Payroll],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.SolzG_3]: {
        relationType: LawRelationType.DependsOn,
        description: "Uses the § 3 assessment base and exemption thresholds.",
      },
      [LawId.EStG_32a]: {
        relationType: LawRelationType.InteractsWith,
        description: "Surcharge scales off assessed § 32a income tax.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("solzg_1995", "4"),
        label: "§ 4 SolzG Statutory Text",
        description: "5.5% rate, 11.9% mitigation cap, and exemption bounds.",
      },
    },
  }),

  [LawId.SGB3_341]: freezeEntry({
    id: LawId.SGB3_341,
    citation: toStatutoryCitation("§ 341 SGB III"),
    code: LawCode.SGB3,
    section: "§ 341",
    title: "Statutory Unemployment Insurance Contribution Rate",
    summary: "Sets the total statutory unemployment insurance contribution rate (2.6%, split equally 1.3% employee / 1.3% employer) up to the pension assessment ceiling.",
    benefit: "Funds unemployment protection and is capped at the annual pension contribution ceiling.",
    antiBenefit: "Employee share may be crowded out of § 10 EStG tax deductibility once health/care premiums exceed the other-insurance limit.",
    tags: [LawTag.Insurance, LawTag.Payroll],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.SGB6_158]: {
        relationType: LawRelationType.InteractsWith,
        description: "Shares the statutory pension assessment ceiling.",
      },
      [LawId.SGB4_20]: {
        relationType: LawRelationType.Modifies,
        description: "Midijob transition zone reduces employee contributions under § 20 SGB IV.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_3", "341"),
        label: "§ 341 SGB III Statutory Text",
        description: "Official unemployment contribution rate.",
      },
    },
  }),

  [LawId.SGB4_20]: freezeEntry({
    id: LawId.SGB4_20,
    citation: toStatutoryCitation("§ 20 SGB IV"),
    code: LawCode.SGB4,
    section: "§ 20",
    title: "Midijob Transition Zone (Übergangsbereich)",
    summary: "Reduces employee social-security contributions smoothly for monthly regular wages between the Minijob threshold and €2,000 while preserving full pension entitlements.",
    benefit: "Significantly increases net take-home pay for mid-low and part-time salaries without losing pension credits.",
    antiBenefit: "Does not cover special trainee/student or multiple-job scenarios automatically and interacts specially with care surcharges.",
    tags: [LawTag.Payroll, LawTag.Insurance],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.SGB5_241]: {
        relationType: LawRelationType.Modifies,
        description: "Uses reduced employee contribution base in the Midijob corridor.",
      },
      [LawId.SGB11_55]: {
        relationType: LawRelationType.InteractsWith,
        description: "Care childless surcharge uses the total transition base while child discounts use employee base.",
      },
      [LawId.BEEG_2f]: {
        relationType: LawRelationType.InteractsWith,
        description: "Paralleled by BEEG's own transition factor under § 2f.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_4", "20"),
        label: "§ 20 SGB IV Statutory Text",
        description: "Midijob corridor formula and F-factor definition.",
      },
    },
  }),

  [LawId.SGB4_23a]: freezeEntry({
    id: LawId.SGB4_23a,
    citation: toStatutoryCitation("§ 23a SGB IV"),
    code: LawCode.SGB4,
    section: "§ 23a",
    title: "One-Off Bonus Contributions & March Clause",
    summary: "Uses year-to-date social-security assessment ceilings to determine how much of a bonus (e.g. vacation or Christmas bonus) is subject to social contributions.",
    benefit: "Above annual contribution ceilings, extra bonus payments avoid further health, pension, and unemployment deductions.",
    antiBenefit: "Bonuses paid between January and March can be attributed to the prior calendar year (Märzklausel) if YTD limits are exceeded.",
    tags: [LawTag.Payroll, LawTag.Insurance],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.EStG_39b]: {
        relationType: LawRelationType.InteractsWith,
        description: "Coordinates social contribution caps with Sonstige Bezüge wage tax.",
      },
      [LawId.BVV_2]: {
        relationType: LawRelationType.DependsOn,
        description: "Applies statutory cent-rounding to one-off contribution bases.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_4", "23a"),
        label: "§ 23a SGB IV Statutory Text",
        description: "Annual YTD contribution assessment for one-off payments.",
      },
    },
  }),

  [LawId.SGB5_241]: freezeEntry({
    id: LawId.SGB5_241,
    citation: toStatutoryCitation("§ 241 SGB V"),
    code: LawCode.SGB5,
    section: "§ 241",
    title: "Statutory Health Insurance Rate (GKV)",
    summary: "Sets the general statutory health contribution rate (14.6%, shared 7.3% employee / 7.3% employer) plus the insurer-specific Zusatzbeitrag (also shared 50/50).",
    benefit: "Covers family members including children at no extra premium and is fully tax-deductible for basic coverage.",
    antiBenefit: "Insurer Zusatzbeitrag varies by provider and increases deductions proportionally up to the annual health ceiling.",
    tags: [LawTag.Insurance, LawTag.Payroll],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.BVV_2]: {
        relationType: LawRelationType.DependsOn,
        description: "General rate and Zusatzbeitrag are rounded separately before addition.",
      },
      [LawId.EStG_10]: {
        relationType: LawRelationType.InteractsWith,
        description: "Basic health share (96% of general contribution) is tax-deductible.",
      },
      [LawId.SGB4_20]: {
        relationType: LawRelationType.Modifies,
        description: "Reduced inside the Midijob transition zone.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_5", "241"),
        label: "§ 241 SGB V Statutory Text",
        description: "General 14.6% statutory health contribution rate.",
      },
    },
  }),

  [LawId.SGB6_158]: freezeEntry({
    id: LawId.SGB6_158,
    citation: toStatutoryCitation("§ 158 SGB VI"),
    code: LawCode.SGB6,
    section: "§ 158",
    title: "Statutory Pension Insurance Rate (RV)",
    summary: "Sets the statutory pension contribution rate (18.6%, shared 9.3% employee / 9.3% employer) up to the statutory pension ceiling.",
    benefit: "Builds statutory retirement entitlements and is 100% tax-deductible under § 10 EStG.",
    antiBenefit: "Represents the largest single social deduction on gross pay up to the pension assessment ceiling.",
    tags: [LawTag.Insurance, LawTag.Payroll],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.EStG_10]: {
        relationType: LawRelationType.InteractsWith,
        description: "Employee pension contributions are 100% deductible under § 10 EStG.",
      },
      [LawId.SGB3_341]: {
        relationType: LawRelationType.InteractsWith,
        description: "Shares the statutory annual pension ceiling.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_6", "158"),
        label: "§ 158 SGB VI Statutory Text",
        description: "Statutory pension contribution rate.",
      },
    },
  }),

  [LawId.SGB11_55]: freezeEntry({
    id: LawId.SGB11_55,
    citation: toStatutoryCitation("§ 55 SGB XI"),
    code: LawCode.SGB11,
    section: "§ 55",
    title: "Care Insurance Child Surcharge & Child Discounts",
    summary: "Adds a +0.6% surcharge for childless employees aged 23+ and grants -0.25% per qualifying child (children 2 through 5 under age 25).",
    benefit: "Parents with 2–5 children under 25 save up to 1.0 percentage point on long-term care contributions.",
    antiBenefit: "Childless employees aged 23+ pay an unshared +0.6% surcharge, and discounts expire as children turn 25.",
    tags: [LawTag.Insurance, LawTag.Child, LawTag.Parent, LawTag.Payroll],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.SGB11_58]: {
        relationType: LawRelationType.InteractsWith,
        description: "Coordinates base employee/employer care share (including Saxony rule).",
      },
      [LawId.SGB4_20]: {
        relationType: LawRelationType.InteractsWith,
        description: "Midijob transition applies distinct bases to surcharge vs. child discounts.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_11", "55"),
        label: "§ 55 SGB XI Statutory Text",
        description: "Childless surcharge and under-25 multi-child discount rules.",
      },
      [ExternalSourceId.GkvSpitzenverband]: {
        url: toSourceUrl("https://www.gkv-spitzenverband.de/media/dokumente/pflegeversicherung/grundprinzipien/2025-03-31_GH_Beitragssatzdifferenzierung_sPV.pdf"),
        label: "GKV Care Differentiation Guidance",
        description: "Official combined-rate rounding rules (§ 3.3).",
      },
    },
  }),

  [LawId.SGB11_58]: freezeEntry({
    id: LawId.SGB11_58,
    citation: toStatutoryCitation("§ 58 SGB XI"),
    code: LawCode.SGB11,
    section: "§ 58",
    title: "Long-Term Care Employer/Employee Split & Saxony Rule",
    summary: "Splits the standard care insurance rate equally between employer and employee outside Saxony, while Saxony shifts an extra 0.5% to employees.",
    benefit: "Equal 50/50 base rate sharing across 15 German federal states.",
    antiBenefit: "Employees working in Saxony pay an additional 0.5% employee care contribution.",
    tags: [LawTag.Insurance, LawTag.Payroll],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.SGB11_55]: {
        relationType: LawRelationType.InteractsWith,
        description: "Combined with childless surcharge or child discounts under § 55.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: gesetzeUrl("sgb_11", "58"),
        label: "§ 58 SGB XI Statutory Text",
        description: "Employee/employer split and Saxony adjustment.",
      },
      [ExternalSourceId.BmgPflege]: {
        url: toSourceUrl("https://www.bundesgesundheitsministerium.de/themen/pflege/online-ratgeber-pflege/die-pflegeversicherung/finanzierung"),
        label: "BMG Care Financing Overview",
        description: "Federal Ministry of Health published contribution rates.",
      },
    },
  }),

  [LawId.BVV_2]: freezeEntry({
    id: LawId.BVV_2,
    citation: toStatutoryCitation("§ 2 BVV"),
    code: LawCode.BVV,
    section: "§ 2",
    title: "Social Contribution Rounding Rules",
    summary: "Requires calculating and rounding general health contributions and the insurer Zusatzbeitrag separately to cents before summing.",
    benefit: "Ensures payroll cent parity with certified German payroll engines.",
    antiBenefit: "Tiny 1-cent rounding differences can occur if rates are summed before multiplying the base.",
    tags: [LawTag.Payroll, LawTag.Insurance],
    groupId: LawGroupId.SGB_SocialSecurity,
    relatedLaws: {
      [LawId.SGB5_241]: {
        relationType: LawRelationType.Implements,
        description: "Governs cent rounding for § 241 SGB V health contributions.",
      },
      [LawId.SGB4_23a]: {
        relationType: LawRelationType.Implements,
        description: "Applies to one-off bonus social contribution bases.",
      },
    },
    externalSources: {
      [ExternalSourceId.GesetzeImInternet]: {
        url: toSourceUrl("https://www.gesetze-im-internet.de/beitrvv/BJNR113800006.html"),
        label: "§ 2 BVV Statutory Text",
        description: "Official contribution procedure and rounding ordinance.",
      },
    },
  }),

  [LawId.KfW_300]: freezeEntry({
    id: LawId.KfW_300,
    citation: toStatutoryCitation("KfW 300"),
    code: LawCode.KfW,
    section: "300",
    title: "KfW 300 Home Ownership for Families (Wohneigentum für Familien)",
    summary: "Low-interest housing loan program for families with children whose prior-year taxable household income falls under program thresholds.",
    benefit: "Provides subsidized housing loans for energy-efficient homes when zvE stays below the family threshold.",
    antiBenefit: "Uses exact final taxable income from official tax notices; modeled employment estimates exclude non-salary deductions.",
    tags: [LawTag.Housing, LawTag.Child, LawTag.Parent, LawTag.Energy, LawTag.Green],
    relatedLaws: {
      [LawId.EStG_2]: {
        relationType: LawRelationType.DependsOn,
        description: "Tests household taxable income (zvE) from official tax assessments.",
      },
    },
    externalSources: {
      [ExternalSourceId.KfwPortal]: {
        url: toSourceUrl("https://www.kfw.de/PDF/Download-Center/F%C3%B6rderprogramme-(Inlandsf%C3%B6rderung)/PDF-Dokumente/6000005060_M_300_WEF.pdf"),
        label: "KfW 300 Program Information Sheet",
        description: "Official income-evidence rules for KfW 300 family housing loans.",
      },
    },
  }),

  [LawId.BMF_PAP]: freezeEntry({
    id: LawId.BMF_PAP,
    citation: toStatutoryCitation("BMF PAP"),
    code: LawCode.BMF,
    section: "PAP",
    title: "Federal Ministry of Finance Payroll Tax Algorithm (PAP)",
    summary: "Official annual flowchart algorithm published by BMF governing monthly wage tax and solidarity withholding across Germany.",
    benefit: "Guarantees exact statutory payroll withholding parity with official BMF tax tables.",
    antiBenefit: "Only verified published years exist; BEEG standardized net specifically requires the January snapshot of the year prior to birth.",
    tags: [LawTag.Payroll, LawTag.Tax],
    groupId: LawGroupId.EStG_PayrollWithholding,
    relatedLaws: {
      [LawId.EStG_39b]: {
        relationType: LawRelationType.Implements,
        description: "Executes statutory § 39b EStG monthly and bonus withholding.",
      },
      [LawId.EStG_39f]: {
        relationType: LawRelationType.Implements,
        description: "Computes Class IV factor parameters.",
      },
      [LawId.BEEG_2e]: {
        relationType: LawRelationType.InteractsWith,
        description: "January PAP snapshot before birth determines BEEG § 2e tax deductions.",
      },
    },
    externalSources: {
      [ExternalSourceId.BmfSteuerrechner]: {
        url: toSourceUrl("https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml"),
        label: "BMF Programmablaufplan (PAP)",
        description: "Official BMF wage-tax algorithm and publication history.",
      },
    },
  }),
});

/**
 * Thematic groups of interrelated laws with combined benefit / anti-benefit guidance.
 */
export const LAW_GROUP_REGISTRY: Readonly<Record<LawGroupId, LawGroupEntry>> = Object.freeze({
  [LawGroupId.BEEG_TaxSwap]: freezeGroup({
    id: LawGroupId.BEEG_TaxSwap,
    title: "Tax Class & Assessment History",
    citationLabel: "§§ 2b, 2c BEEG",
    summary: "Selects 12 eligible pre-birth months (skipping maternity/older-child exclusion months) and locks in the tax class held in the majority or tie-break of those months.",
    benefit: "Planning a timely tax-class switch into Class III for the primary leave-taking parent can materially increase standardized Elterngeld net.",
    antiBenefit: "Late switches do not rewrite the majority/tie rule, and Class V reduces the other spouse's monthly paycheck until annual filing.",
    tags: [LawTag.Parent, LawTag.Tax, LawTag.Benefits, LawTag.Payroll],
    primaryLawId: LawId.BEEG_2c,
    memberLawIds: [LawId.BEEG_2b, LawId.BEEG_2c],
  }),

  [LawGroupId.MuSchG_Maternity]: freezeGroup({
    id: LawGroupId.MuSchG_Maternity,
    title: "Maternity Protection & Reference Pay",
    citationLabel: "§§ 3, 19, 20 MuSchG; § 3 BEEG",
    summary: "Protects employment around birth and replaces 100% of the prior 3-month average net wage, credited against concurrent Elterngeld.",
    benefit: "Preserves 100% net take-home pay during maternity protection and protects later BEEG lookbacks via exclusion months.",
    antiBenefit: "Post-birth maternity weeks consume mother's Basiselterngeld months and enter annual § 32b tax progression.",
    tags: [LawTag.Maternity, LawTag.Parent, LawTag.Benefits, LawTag.Payroll],
    primaryLawId: LawId.MuSchG_20,
    memberLawIds: [LawId.MuSchG_3, LawId.MuSchG_19, LawId.MuSchG_20, LawId.BEEG_3],
  }),

  [LawGroupId.BEEG_SyntheticNet]: freezeGroup({
    id: LawGroupId.BEEG_SyntheticNet,
    title: "Standardized BEEG Net & Personal Plus Ceiling",
    citationLabel: "§§ 2, 2c–2f, 4a BEEG",
    summary: "Computes BEEG assessment net using flat social rates (9%/10%/2%) and January PAP taxes, independent of actual payroll take-home.",
    benefit: "High replacement up to 100% at lower incomes and 2-for-1 duration stretching under ElterngeldPlus.",
    antiBenefit: "Capped at €2,770 assessable net (€1,800 Basis / €900 Plus) with no social-contribution ceiling in flat deductions.",
    tags: [LawTag.Parent, LawTag.Benefits, LawTag.Tax, LawTag.Insurance],
    primaryLawId: LawId.BEEG_2,
    memberLawIds: [LawId.BEEG_2, LawId.BEEG_2c, LawId.BEEG_2d, LawId.BEEG_2e, LawId.BEEG_2f, LawId.BEEG_4a],
  }),

  [LawGroupId.EStG_TaxSplitting]: freezeGroup({
    id: LawGroupId.EStG_TaxSplitting,
    title: "Annual Joint Assessment & Progression Settlement",
    citationLabel: "§§ 2, 26, 26b, 32a, 32b, 36 EStG; SolzG",
    summary: "Reconciles monthly payroll withholdings against actual annual joint liability including splitting tariff and progression on replacement benefits.",
    benefit: "Income splitting and deductions often generate substantial tax refunds when one partner has low/zero earnings.",
    antiBenefit: "Elterngeld and maternity progression (§ 32b) frequently create year-end tax repayments when one spouse earns full salary.",
    tags: [LawTag.Tax, LawTag.Marriage, LawTag.Parent],
    primaryLawId: LawId.EStG_26b,
    memberLawIds: [
      LawId.EStG_2,
      LawId.EStG_9a,
      LawId.EStG_10,
      LawId.EStG_10_1_5,
      LawId.EStG_10c,
      LawId.EStG_24a,
      LawId.EStG_26,
      LawId.EStG_26b,
      LawId.EStG_32a,
      LawId.EStG_32b,
      LawId.EStG_36,
      LawId.InflG,
      LawId.SolzG_3,
    ],
  }),

  [LawGroupId.BEEG_PartnershipBonus]: freezeGroup({
    id: LawGroupId.BEEG_PartnershipBonus,
    title: "Parent Claim Budgets & Partnership Bonus",
    citationLabel: "§§ 1, 4, 4a, 4b BEEG",
    summary: "Coordinates individual/family Basis & Plus budgets (12+2 months) and unlocks 2–4 Partnership Bonus months when both parents work 24–32h/week.",
    benefit: "Adds up to 4 extra ElterngeldPlus months per parent when sharing work and childcare symmetrically.",
    antiBenefit: "Strict 24–32h corridor and minimum 2-month claim duration mean mistimed hours can forfeit bonus months.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits, LawTag.Payroll],
    primaryLawId: LawId.BEEG_4b,
    memberLawIds: [LawId.BEEG_1, LawId.BEEG_4, LawId.BEEG_4a, LawId.BEEG_4b],
  }),

  [LawGroupId.BEEG_SiblingBonus]: freezeGroup({
    id: LawGroupId.BEEG_SiblingBonus,
    title: "Household Sibling Bonus (Geschwisterbonus)",
    citationLabel: "§§ 2a, 4a BEEG",
    summary: "Grants a +10% supplement (minimum €75 Basis / €37.50 Plus) while qualifying older siblings remain under age 3 (or two under age 6).",
    benefit: "Rewards closely spaced births with guaranteed minimum monthly additions.",
    antiBenefit: "Expires immediately after the older sibling passes the age threshold and requires known sibling ages.",
    tags: [LawTag.Child, LawTag.Parent, LawTag.Benefits],
    primaryLawId: LawId.BEEG_2a,
    memberLawIds: [LawId.BEEG_2a, LawId.BEEG_4a],
  }),

  [LawGroupId.BEEG_Child2Dilution]: freezeGroup({
    id: LawGroupId.BEEG_Child2Dilution,
    title: "Assessment Lookback for Later Births",
    citationLabel: "§§ 2b, 2c BEEG",
    summary: "Recomputes the 12-month assessment before each later birth, skipping maternity and eligible older-child Elterngeld months up to 14 life-months.",
    benefit: "Prevents older-child leave months (within 14 life-months) from depressing the next child's pre-birth average.",
    antiBenefit: "Part-time work or unpaid leave outside the 14-month exclusion window reduces the assessment base for the next child.",
    tags: [LawTag.Parent, LawTag.Child, LawTag.Benefits],
    primaryLawId: LawId.BEEG_2b,
    memberLawIds: [LawId.BEEG_2b, LawId.BEEG_2c],
  }),

  [LawGroupId.EStG_Kindergeld]: freezeGroup({
    id: LawGroupId.EStG_Kindergeld,
    title: "Child Benefit & Tax-Allowance Favorability",
    citationLabel: "§§ 31, 32, 62, 66 EStG",
    summary: "Pays tax-free monthly Kindergeld per qualifying child and automatically tests annually whether Kinderfreibetrag yields greater tax relief.",
    benefit: "Guarantees monthly cash flow plus automatic optimization at higher marginal tax brackets.",
    antiBenefit: "You do not keep both full Kindergeld and full Kinderfreibetrag income-tax relief; § 31 nets them against each other.",
    tags: [LawTag.Child, LawTag.Benefits, LawTag.Tax],
    primaryLawId: LawId.EStG_66,
    memberLawIds: [LawId.EStG_31, LawId.EStG_32, LawId.EStG_62, LawId.EStG_66],
  }),

  [LawGroupId.EStG_PayrollWithholding]: freezeGroup({
    id: LawGroupId.EStG_PayrollWithholding,
    title: "Monthly Payroll Withholding & Bonus Rules",
    citationLabel: "§§ 19, 24b, 38b, 39b, 39f EStG; §§ 1, 4 SolzG",
    summary: "Governs monthly wage tax, single-parent relief, Class IV factor, Solidarity Surcharge, and differential bonus withholding via BMF PAP.",
    benefit: "Accurate monthly cash flow modeling matching certified German payroll outputs.",
    antiBenefit: "Monthly withholding is only an advance payment; annual assessment determines final liability.",
    tags: [LawTag.Payroll, LawTag.Tax],
    primaryLawId: LawId.EStG_38b,
    memberLawIds: [LawId.EStG_19, LawId.EStG_24b, LawId.EStG_38b, LawId.EStG_39b, LawId.EStG_39f, LawId.SolzG_1, LawId.SolzG_4, LawId.BMF_PAP],
  }),

  [LawGroupId.SGB_SocialSecurity]: freezeGroup({
    id: LawGroupId.SGB_SocialSecurity,
    title: "Social Security Contributions & Midijob Corridor",
    citationLabel: "§§ 20, 23a SGB IV; § 241 SGB V; § 158 SGB VI; § 341 SGB III; §§ 55, 58 SGB XI; § 2 BVV",
    summary: "Models statutory health, pension, unemployment, and care insurance contributions including Midijob relief, Saxony care rules, and cent rounding.",
    benefit: "Captures Midijob contribution savings and multi-child long-term care discounts accurately.",
    antiBenefit: "Childless employees aged 23+ pay a 0.6% surcharge, and Saxony employees pay an extra 0.5% base share.",
    tags: [LawTag.Insurance, LawTag.Payroll, LawTag.Child],
    primaryLawId: LawId.SGB5_241,
    memberLawIds: [LawId.SGB4_20, LawId.SGB4_23a, LawId.SGB5_241, LawId.SGB6_158, LawId.SGB3_341, LawId.SGB11_55, LawId.SGB11_58, LawId.BVV_2],
  }),
});

/**
 * Resolved cross-reference link for UI display and graph traversal.
 */
export interface RelatedLawItem {
  readonly law: LawEntry;
  readonly metadata: LawRelationMetadata;
}

/** Looks up a strongly-typed `LawEntry` by `LawId`. */
export function getLawEntry(id: LawId): LawEntry {
  return LAW_REGISTRY[id];
}

/** Looks up a strongly-typed `LawGroupEntry` by `LawGroupId`. */
export function getLawGroupEntry(id: LawGroupId): LawGroupEntry {
  return LAW_GROUP_REGISTRY[id];
}

/** Returns all registered law entries in deterministic order. */
export function getAllLawEntries(): readonly LawEntry[] {
  return Object.values(LAW_REGISTRY);
}

/** Returns all registered law groups in deterministic order. */
export function getAllLawGroupEntries(): readonly LawGroupEntry[] {
  return Object.values(LAW_GROUP_REGISTRY);
}

/** Returns all laws tagged with the given `LawTag`. */
export function getLawsByTag(tag: LawTagType): readonly LawEntry[] {
  return getAllLawEntries().filter((entry) => entry.tags.includes(tag));
}

/** Returns all outgoing cross-referenced laws for `id` with their relation metadata. */
export function getRelatedLaws(id: LawId): readonly RelatedLawItem[] {
  const entry = getLawEntry(id);
  const items: RelatedLawItem[] = [];
  for (const [targetId, metadata] of Object.entries(entry.relatedLaws)) {
    if (metadata) {
      items.push({
        law: getLawEntry(targetId as LawId),
        metadata,
      });
    }
  }
  return items;
}

/** Returns all laws that explicitly reference `id` in their `relatedLaws` map. */
export function getLawsReferencing(id: LawId): readonly RelatedLawItem[] {
  const items: RelatedLawItem[] = [];
  for (const entry of getAllLawEntries()) {
    const metadata = entry.relatedLaws[id];
    if (metadata) {
      items.push({
        law: entry,
        metadata,
      });
    }
  }
  return items;
}

/** Returns all distinct tags actively used across registered laws, preserving enum order. */
export function getUsedLawTags(): readonly LawTagType[] {
  const used = new Set<LawTagType>();
  for (const entry of getAllLawEntries()) {
    for (const tag of entry.tags) {
      used.add(tag);
    }
  }
  return Object.values(LawTag).filter((tag) => used.has(tag));
}

/** Filters laws by optional search text (matching citation, title, summary) and optional `LawTag`. */
export function searchLaws(
  query: string,
  tag?: LawTagType,
): readonly LawEntry[] {
  const normalized = query.trim().toLowerCase();
  return getAllLawEntries().filter((entry) => {
    if (tag && !entry.tags.includes(tag)) {
      return false;
    }
    if (!normalized) {
      return true;
    }
    return (
      entry.citation.toLowerCase().includes(normalized) ||
      entry.title.toLowerCase().includes(normalized) ||
      entry.summary.toLowerCase().includes(normalized) ||
      entry.code.toLowerCase().includes(normalized)
    );
  });
}

/** Returns all external sources of a `LawEntry` as deterministic tuples. */
export function getExternalSourceEntries(
  entry: LawEntry,
): readonly {
  readonly sourceId: ExternalSourceIdType;
  readonly url: string;
  readonly label: string;
  readonly description?: string;
}[] {
  const items: {
    readonly sourceId: ExternalSourceIdType;
    readonly url: string;
    readonly label: string;
    readonly description?: string;
  }[] = [];
  for (const [sourceId, meta] of Object.entries(entry.externalSources)) {
    if (meta) {
      items.push({
        sourceId: sourceId as ExternalSourceIdType,
        url: meta.url,
        label: meta.label,
        description: meta.description,
      });
    }
  }
  return items;
}
