import {
  type SourceUrl,
} from "#engine/config/benefitRules";
import {
  type StatutoryCitation,
} from "#engine/types";

/**
 * German Statutory Law Code Identifiers.
 */
export const LawCode = {
  BEEG: "BEEG",
  EStG: "EStG",
  MuSchG: "MuSchG",
  SolzG: "SolzG",
  SGB3: "SGB III",
  SGB4: "SGB IV",
  SGB5: "SGB V",
  SGB6: "SGB VI",
  SGB11: "SGB XI",
  BVV: "BVV",
  KfW: "KfW",
  BMF: "BMF",
  AufenthG: "AufenthG",
  UStG: "UStG",
  EEG: "EEG",
  GrEStG: "GrEStG",
} as const;
export type LawCode = (typeof LawCode)[keyof typeof LawCode];

/**
 * Strongly-typed statutory law identifiers across supported German statutes and guidelines.
 * Every statutory `§` reference in calculators must resolve to one of these compile-time keys.
 */
export const LawId = {
  // BEEG (Bundeselterngeld- und Elternzeitgesetz)
  BEEG_1: "beeg-1",
  BEEG_2: "beeg-2",
  BEEG_2a: "beeg-2a",
  BEEG_2b: "beeg-2b",
  BEEG_2c: "beeg-2c",
  BEEG_2d: "beeg-2d",
  BEEG_2e: "beeg-2e",
  BEEG_2f: "beeg-2f",
  BEEG_3: "beeg-3",
  BEEG_4: "beeg-4",
  BEEG_4a: "beeg-4a",
  BEEG_4b: "beeg-4b",

  // EStG (Einkommensteuergesetz)
  EStG_2: "estg-2",
  EStG_3_15: "estg-3-15",
  EStG_3_72: "estg-3-72",
  EStG_6_1_4: "estg-6-1-4",
  EStG_8_2: "estg-8-2",
  EStG_9_1_4: "estg-9-1-4",
  EStG_9a: "estg-9a",
  EStG_10: "estg-10",
  EStG_10_1_5: "estg-10-1-5",
  EStG_10c: "estg-10c",
  EStG_19: "estg-19",
  EStG_20: "estg-20",
  EStG_24a: "estg-24a",
  EStG_24b: "estg-24b",
  EStG_26: "estg-26",
  EStG_26b: "estg-26b",
  EStG_31: "estg-31",
  EStG_32: "estg-32",
  EStG_32a: "estg-32a",
  EStG_32b: "estg-32b",
  EStG_35a: "estg-35a",
  EStG_36: "estg-36",
  EStG_38b: "estg-38b",
  EStG_39b: "estg-39b",
  EStG_39f: "estg-39f",
  EStG_62: "estg-62",
  EStG_66: "estg-66",
  InflG: "inflg",

  // MuSchG (Mutterschutzgesetz)
  MuSchG_3: "muschg-3",
  MuSchG_19: "muschg-19",
  MuSchG_20: "muschg-20",

  // SolzG (Solidaritätszuschlaggesetz)
  SolzG_1: "solzg-1",
  SolzG_3: "solzg-3",
  SolzG_4: "solzg-4",

  // Social Security & Contribution Ordinances (SGB / BVV)
  SGB3_341: "sgb3-341",
  SGB4_20: "sgb4-20",
  SGB4_23a: "sgb4-23a",
  SGB5_241: "sgb5-241",
  SGB6_158: "sgb6-158",
  SGB11_55: "sgb11-55",
  SGB11_58: "sgb11-58",
  BVV_2: "bvv-2",

  // Residence & Immigration (AufenthG)
  AufenthG_18_2_5: "aufenthg-18-2-5",
  AufenthG_18c: "aufenthg-18c",
  AufenthG_18g: "aufenthg-18g",
  AufenthG_20a: "aufenthg-20a",

  // Energy, Solar & Housing (UStG, EEG, GrEStG, KfW, BMF)
  UStG_12_3: "ustg-12-3",
  EEG_48: "eeg-48",
  GrEStG_11: "grestg-11",
  KfW_300: "kfw-300",
  BMF_PAP: "bmf-pap",
} as const;
export type LawId = (typeof LawId)[keyof typeof LawId];

/**
 * Strongly-typed thematic law group identifiers for multi-section legal frameworks.
 */
export const LawGroupId = {
  BEEG_TaxSwap: "group-beeg-tax-swap",
  BEEG_SyntheticNet: "group-beeg-synthetic-net",
  BEEG_PartnershipBonus: "group-beeg-partnership-bonus",
  BEEG_SiblingBonus: "group-beeg-sibling-bonus",
  BEEG_Child2Dilution: "group-beeg-child2-dilution",
  MuSchG_Maternity: "group-muschg-maternity",
  EStG_TaxSplitting: "group-estg-tax-splitting",
  EStG_Kindergeld: "group-estg-kindergeld",
  EStG_PayrollWithholding: "group-estg-payroll-withholding",
  SGB_SocialSecurity: "group-sgb-social-security",
  AufenthG_BlueCard: "group-aufenthg-blue-card",
  EStG_CompanyCar: "group-estg-company-car",
  EStG_CommuterWorkExpenses: "group-estg-commuter-work-expenses",
  EEG_ResidentialSolar: "group-eeg-residential-solar",
  Housing_HomeAcquisition: "group-housing-home-acquisition",
} as const;
export type LawGroupId = (typeof LawGroupId)[keyof typeof LawGroupId];

/**
 * Domain classification tags for filtering and organizing laws across calculators.
 */
export const LawTag = {
  Child: "child",
  Parent: "parent",
  Tax: "tax",
  Payroll: "payroll",
  Benefits: "benefits",
  Insurance: "insurance",
  Maternity: "maternity",
  Marriage: "marriage",
  Housing: "housing",
  Visa: "visa",
  Energy: "energy",
  Solar: "solar",
  Green: "green",
  Car: "car",
} as const;
export type LawTag = (typeof LawTag)[keyof typeof LawTag];

/**
 * Semantic relationship kind between two cross-referenced laws.
 */
export const LawRelationType = {
  DependsOn: "depends_on",
  Modifies: "modifies",
  Extends: "extends",
  Offsets: "offsets",
  InteractsWith: "interacts_with",
  ContrastsWith: "contrasts_with",
  Implements: "implements",
} as const;
export type LawRelationType = (typeof LawRelationType)[keyof typeof LawRelationType];

/**
 * Canonical external statutory authority keys.
 */
export const ExternalSourceId = {
  GesetzeImInternet: "gesetze_im_internet",
  Familienportal: "familienportal",
  BmfSteuerrechner: "bmf_steuerrechner",
  BmbfsfjGuidelines: "bmbfsfj_guidelines",
  Bundesgesetzblatt: "bundesgesetzblatt",
  BmgPflege: "bmg_pflege",
  GkvSpitzenverband: "gkv_spitzenverband",
  KfwPortal: "kfw_portal",
  MakeItInGermany: "make_it_in_germany",
  Bundesnetzagentur: "bundesnetzagentur",
} as const;
export type ExternalSourceId = (typeof ExternalSourceId)[keyof typeof ExternalSourceId];

/**
 * Metadata describing how one law relates to another cross-referenced law.
 */
export interface LawRelationMetadata {
  readonly relationType?: LawRelationType;
  readonly description?: string;
}

/**
 * Official external reference metadata for a law entry.
 */
export interface ExternalLawSourceMetadata {
  readonly url: SourceUrl;
  readonly label: string;
  readonly description?: string;
}

/**
 * Complete typed law reference record stored in the central law registry.
 */
export interface LawEntry {
  readonly id: LawId;
  readonly citation: StatutoryCitation;
  readonly code: LawCode;
  readonly section: string;
  readonly title: string;
  readonly summary: string;
  readonly benefit?: string;
  readonly antiBenefit?: string;
  readonly tags: readonly LawTag[];
  readonly groupId?: LawGroupId;
  readonly relatedLaws: Readonly<Partial<Record<LawId, LawRelationMetadata>>>;
  readonly externalSources: Readonly<Partial<Record<ExternalSourceId, ExternalLawSourceMetadata>>>;
}

/**
 * Thematic group of interrelated laws sharing a higher-level benefit / anti-benefit summary.
 */
export interface LawGroupEntry {
  readonly id: LawGroupId;
  readonly title: string;
  readonly citationLabel: string;
  readonly summary: string;
  readonly benefit?: string;
  readonly antiBenefit?: string;
  readonly tags: readonly LawTag[];
  readonly primaryLawId: LawId;
  readonly memberLawIds: readonly LawId[];
}

function createEnumParser<T extends string>(
  enumObj: Record<string, T>,
  typeName: string,
): (value: string) => T {
  const validValues = new Set<string>(Object.values(enumObj));
  return (value: string): T => {
    if (!validValues.has(value)) {
      throw new TypeError(`Invalid ${typeName}: ${value}`);
    }
    return value as T;
  };
}

/** Validates and returns a `LawCode` enum value. */
export const toLawCode = createEnumParser(LawCode, "LawCode");

/** Validates and returns a `LawId` enum value. */
export const toLawId = createEnumParser(LawId, "LawId");

/** Validates and returns a `LawGroupId` enum value. */
export const toLawGroupId = createEnumParser(LawGroupId, "LawGroupId");

/** Validates and returns a `LawTag` enum value. */
export const toLawTag = createEnumParser(LawTag, "LawTag");

/** Validates and returns a `LawRelationType` enum value. */
export const toLawRelationType = createEnumParser(LawRelationType, "LawRelationType");

/** Validates and returns an `ExternalSourceId` enum value. */
export const toExternalSourceId = createEnumParser(ExternalSourceId, "ExternalSourceId");

/** Returns true if `value` is a valid `LawId`. */
export function isLawId(value: string): value is LawId {
  return (Object.values(LawId) as readonly string[]).includes(value);
}

/** Returns true if `value` is a valid `LawGroupId`. */
export function isLawGroupId(value: string): value is LawGroupId {
  return (Object.values(LawGroupId) as readonly string[]).includes(value);
}

/** Human-readable display label for a `LawTag`. */
export const LAW_TAG_LABELS: Readonly<Record<LawTag, string>> = Object.freeze({
  [LawTag.Child]: "Child",
  [LawTag.Parent]: "Parent",
  [LawTag.Tax]: "Tax",
  [LawTag.Payroll]: "Payroll",
  [LawTag.Benefits]: "Benefits",
  [LawTag.Insurance]: "Insurance",
  [LawTag.Maternity]: "Maternity",
  [LawTag.Marriage]: "Marriage",
  [LawTag.Housing]: "Housing",
  [LawTag.Visa]: "Visa",
  [LawTag.Energy]: "Energy",
  [LawTag.Solar]: "Solar",
  [LawTag.Green]: "Green",
  [LawTag.Car]: "Car",
});

/** Human-readable display label for a `LawRelationType`. */
export const LAW_RELATION_LABELS: Readonly<Record<LawRelationType, string>> = Object.freeze({
  [LawRelationType.DependsOn]: "Depends on",
  [LawRelationType.Modifies]: "Modifies",
  [LawRelationType.Extends]: "Extends",
  [LawRelationType.Offsets]: "Offsets",
  [LawRelationType.InteractsWith]: "Interacts with",
  [LawRelationType.ContrastsWith]: "Contrasts with",
  [LawRelationType.Implements]: "Implements",
});
