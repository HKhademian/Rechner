export const LEGACY_CONFIRMATION_STORAGE_KEY = "rechner:life-profile:legacy-confirmations:v1";

export const LegacyConfirmationStatus = {
  Missing: "missing",
  Valid: "valid",
  Invalid: "invalid",
  Unsupported: "unsupported",
} as const;
export type LegacyConfirmationStatus = (typeof LegacyConfirmationStatus)[keyof typeof LegacyConfirmationStatus];

export const LegacyProfileFieldGroup = {
  HouseholdBasics: "household-basics",
  EmploymentGross: "employment-gross",
  TaxAndFamily: "tax-and-family",
  CommuteAndCar: "commute-and-car",
  HousingAndSolar: "housing-and-solar",
} as const;
export type LegacyProfileFieldGroup = (typeof LegacyProfileFieldGroup)[keyof typeof LegacyProfileFieldGroup];

export function toLegacyProfileFieldGroup(value: string): LegacyProfileFieldGroup {
  if (!Object.values(LegacyProfileFieldGroup).includes(value as LegacyProfileFieldGroup)) {
    throw new TypeError("Unknown legacy profile field group.");
  }
  return value as LegacyProfileFieldGroup;
}

export const LEGACY_FIELD_GROUP_LABELS: Readonly<Record<LegacyProfileFieldGroup, string>> = Object.freeze({
  [LegacyProfileFieldGroup.HouseholdBasics]: "Planning year, federal state & household setup",
  [LegacyProfileFieldGroup.EmploymentGross]: "Primary & partner annual gross salaries",
  [LegacyProfileFieldGroup.TaxAndFamily]: "Tax classes, church tax & dependent children",
  [LegacyProfileFieldGroup.CommuteAndCar]: "Commute distance & company car details",
  [LegacyProfileFieldGroup.HousingAndSolar]: "Property purchase & solar installation assumptions",
});

export interface LegacyConfirmationRecord {
  readonly version: 1;
  readonly confirmedGroups: readonly LegacyProfileFieldGroup[];
}

export interface DecodedLegacyConfirmations {
  readonly status: LegacyConfirmationStatus;
  readonly record?: LegacyConfirmationRecord;
}

/** Validates the separate confirmation record without altering the legacy v1 profile schema. */
export function decodeLegacyConfirmations(raw: string | null): DecodedLegacyConfirmations {
  if (raw === null) {
    return { status: LegacyConfirmationStatus.Missing };
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data) || !("version" in data) || !Number.isInteger(data.version)) {
      return { status: LegacyConfirmationStatus.Invalid };
    }
    if (data.version !== 1 || Object.keys(data).some((key) => key !== "version" && key !== "confirmedGroups")) {
      return { status: LegacyConfirmationStatus.Unsupported };
    }
    if (!("confirmedGroups" in data) || !Array.isArray(data.confirmedGroups)) {
      return { status: LegacyConfirmationStatus.Invalid };
    }
    const unique = new Set<LegacyProfileFieldGroup>();
    for (const item of data.confirmedGroups) {
      if (typeof item !== "string") {
        return { status: LegacyConfirmationStatus.Invalid };
      }
      unique.add(toLegacyProfileFieldGroup(item));
    }
    return {
      status: LegacyConfirmationStatus.Valid,
      record: Object.freeze({
        version: 1,
        confirmedGroups: Object.freeze([...unique].sort()),
      }),
    };
  }
  catch {
    return { status: LegacyConfirmationStatus.Invalid };
  }
}
