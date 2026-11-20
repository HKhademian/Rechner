import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  getAllParameterDefinitions,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  type ResolvedParameterValue,
  ParameterDomain,
} from "#engine/parameters/types";
import {
  type FullCalendarYear,
} from "#engine/types";

/**
 * Typed Form Projection Profile identifiers allowing each calculator form
 * to highlight only its primary domains while projecting defaults for out-of-focus domains.
 */
export const FormProjectionProfileId = {
  FullCatalog: "full_catalog",
  NetPayFocus: "net_pay_focus",
  ParentalLeaveFocus: "parental_leave_focus",
  GiroCodeFocus: "girocode_focus",
  VisaFocus: "visa_focus",
  CompanyCarFocus: "company_car_focus",
  SolarEnergyFocus: "solar_energy_focus",
  HousingFocus: "housing_focus",
  KitaFocus: "kita_focus",
  MinijobMidijobFocus: "minijob_midijob_focus",
  CommuterAllowanceFocus: "commuter_allowance_focus",
} as const;
export type FormProjectionProfileId = (typeof FormProjectionProfileId)[keyof typeof FormProjectionProfileId];

const FORM_PROJECTION_PROFILE_ID_SET: ReadonlySet<string> = new Set<string>(
  Object.values(FormProjectionProfileId),
);

/** Runtime type guard validating a `FormProjectionProfileId`. */
export function isFormProjectionProfileId(value: string): value is FormProjectionProfileId {
  return FORM_PROJECTION_PROFILE_ID_SET.has(value);
}

/** Validated runtime constructor for `FormProjectionProfileId` per Rule 11. */
export function toFormProjectionProfileId(value: string): FormProjectionProfileId {
  if (!isFormProjectionProfileId(value)) {
    throw new TypeError(`Unknown FormProjectionProfileId: "${value}"`);
  }
  return value;
}

/**
 * Projection configuration mapping a calculator app to its focused vs. default-projected domains.
 */
export interface FormProjectionProfile {
  readonly id: FormProjectionProfileId;
  readonly appId: AppId;
  readonly label: string;
  readonly description: string;
  readonly focusedDomains: readonly ParameterDomain[];
  readonly projectedOutDomains: readonly ParameterDomain[];
}

/**
 * Result of projecting the unified Parameter Registry through a calculator's `FormProjectionProfile`.
 */
export interface ProjectedParameterView {
  readonly profile: FormProjectionProfile;
  readonly focusedParameters: readonly ResolvedParameterValue[];
  readonly projectedOutParameters: readonly ResolvedParameterValue[];
  readonly totalCount: number;
}

const ALL_DOMAINS: readonly ParameterDomain[] = Object.freeze(Object.values(ParameterDomain));

function createProjectionProfile(config: {
  readonly id: FormProjectionProfileId;
  readonly appId: AppId;
  readonly label: string;
  readonly description: string;
  readonly focusedDomains: readonly ParameterDomain[];
}): FormProjectionProfile {
  const focusedSet = new Set<ParameterDomain>(config.focusedDomains);
  const projectedOutDomains = ALL_DOMAINS.filter((domain) => !focusedSet.has(domain));
  return Object.freeze({
    id: config.id,
    appId: config.appId,
    label: config.label,
    description: config.description,
    focusedDomains: Object.freeze([...config.focusedDomains]),
    projectedOutDomains: Object.freeze(projectedOutDomains),
  });
}

/**
 * Central frozen registry of per-calculator Form Projection Profiles.
 * Out-of-focus domains project year-resolved statutory defaults cleanly while keeping
 * the single unified Parameter Storage accessible on demand.
 */
export const FORM_PROJECTION_PROFILES: Readonly<Record<FormProjectionProfileId, FormProjectionProfile>> = Object.freeze({
  [FormProjectionProfileId.FullCatalog]: createProjectionProfile({
    id: FormProjectionProfileId.FullCatalog,
    appId: AppId.Catalog,
    label: "All Rules",
    description: "Shows all tax, benefit, and planning rules.",
    focusedDomains: ALL_DOMAINS,
  }),
  [FormProjectionProfileId.NetPayFocus]: createProjectionProfile({
    id: FormProjectionProfileId.NetPayFocus,
    appId: AppId.NetPay,
    label: "Net Pay",
    description: "Shows income tax, social security, and child allowance rules.",
    focusedDomains: [
      ParameterDomain.IncomeTax,
      ParameterDomain.SocialSecurity,
      ParameterDomain.FamilyBenefits,
    ],
  }),
  [FormProjectionProfileId.ParentalLeaveFocus]: createProjectionProfile({
    id: FormProjectionProfileId.ParentalLeaveFocus,
    appId: AppId.ParentalLeave,
    label: "Parental Leave",
    description: "Shows parental allowance, maternity, and leave planning rules.",
    focusedDomains: [
      ParameterDomain.ParentalAllowance,
      ParameterDomain.MaternityProtection,
      ParameterDomain.FamilyBenefits,
      ParameterDomain.SocialSecurity,
      ParameterDomain.PlanningAssumptions,
    ],
  }),
  [FormProjectionProfileId.GiroCodeFocus]: createProjectionProfile({
    id: FormProjectionProfileId.GiroCodeFocus,
    appId: AppId.GiroCode,
    label: "Payments",
    description: "Uses default tax and benefit rules.",
    focusedDomains: [],
  }),
  [FormProjectionProfileId.VisaFocus]: createProjectionProfile({
    id: FormProjectionProfileId.VisaFocus,
    appId: AppId.Visa,
    label: "Visa & Blue Card",
    description: "Shows Blue Card salary limits, residency timelines, and Opportunity Card rules.",
    focusedDomains: [
      ParameterDomain.VisaResidence,
      ParameterDomain.PlanningAssumptions,
    ],
  }),
  [FormProjectionProfileId.CompanyCarFocus]: createProjectionProfile({
    id: FormProjectionProfileId.CompanyCarFocus,
    appId: AppId.CompanyCar,
    label: "Company Car",
    description: "Shows company car tax rates, EV price caps, and commute rules.",
    focusedDomains: [
      ParameterDomain.CompanyCar,
      ParameterDomain.IncomeTax,
      ParameterDomain.SocialSecurity,
    ],
  }),
  [FormProjectionProfileId.SolarEnergyFocus]: createProjectionProfile({
    id: FormProjectionProfileId.SolarEnergyFocus,
    appId: AppId.SolarEnergy,
    label: "Solar",
    description: "Shows feed-in tariffs, zero-VAT rules, and grid price assumptions.",
    focusedDomains: [
      ParameterDomain.SolarEnergy,
    ],
  }),
  [FormProjectionProfileId.HousingFocus]: createProjectionProfile({
    id: FormProjectionProfileId.HousingFocus,
    appId: AppId.Housing,
    label: "Home Purchase",
    description: "Shows KfW 300 limits, renovation tax credits, and closing cost assumptions.",
    focusedDomains: [
      ParameterDomain.HousingProperty,
      ParameterDomain.FamilyBenefits,
    ],
  }),
  [FormProjectionProfileId.KitaFocus]: createProjectionProfile({
    id: FormProjectionProfileId.KitaFocus,
    appId: AppId.Kita,
    label: "Kita & Childcare",
    description: "Shows § 10 EStG childcare deduction limits and income tax tariff rules.",
    focusedDomains: [
      ParameterDomain.FamilyBenefits,
      ParameterDomain.IncomeTax,
    ],
  }),
  [FormProjectionProfileId.MinijobMidijobFocus]: createProjectionProfile({
    id: FormProjectionProfileId.MinijobMidijobFocus,
    appId: AppId.MinijobMidijob,
    label: "Minijob & Midijob",
    description: "Shows SGB IV employment thresholds, transition-zone factor inputs, and social security rates.",
    focusedDomains: [
      ParameterDomain.SocialSecurity,
      ParameterDomain.IncomeTax,
    ],
  }),
  [FormProjectionProfileId.CommuterAllowanceFocus]: createProjectionProfile({
    id: FormProjectionProfileId.CommuterAllowanceFocus,
    appId: AppId.CommuterAllowance,
    label: "Commuter & JobTicket",
    description: "Shows employee work-expense allowance and income tax tariff rules.",
    focusedDomains: [
      ParameterDomain.IncomeTax,
    ],
  }),
});

/** Looks up a `FormProjectionProfile` by `FormProjectionProfileId`. */
export function getFormProjectionProfile(
  profileId: FormProjectionProfileId,
): FormProjectionProfile {
  return FORM_PROJECTION_PROFILES[profileId];
}

/** Maps a calculator `AppId` to its default `FormProjectionProfile`. */
export function getProjectionProfileForApp(
  appId: AppId,
): FormProjectionProfile {
  switch (appId) {
    case AppId.NetPay:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.NetPayFocus];
    case AppId.ParentalLeave:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.ParentalLeaveFocus];
    case AppId.GiroCode:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.GiroCodeFocus];
    case AppId.Visa:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.VisaFocus];
    case AppId.CompanyCar:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.CompanyCarFocus];
    case AppId.SolarEnergy:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.SolarEnergyFocus];
    case AppId.Housing:
    case AppId.Mortgage:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.HousingFocus];
    case AppId.Kita:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.KitaFocus];
    case AppId.MinijobMidijob:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.MinijobMidijobFocus];
    case AppId.CommuterAllowance:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.CommuterAllowanceFocus];
    case AppId.PermanentResidency:
    case AppId.Citizenship:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.VisaFocus];
    case AppId.FamilyMilestones:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.ParentalLeaveFocus];
    case AppId.ChildcarePlanner:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.KitaFocus];
    case AppId.TaxClassSwitch:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.NetPayFocus];
    case AppId.AssetAffordability:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.HousingFocus];
    case AppId.ExpensePlanner:
    case AppId.ResignationRunway:
    case AppId.TravelPlanner:
    case AppId.PlanningDashboard:
    case AppId.Catalog:
      return FORM_PROJECTION_PROFILES[FormProjectionProfileId.FullCatalog];
  }
}

/**
 * Projects all parameters from the central registry for `profileId`, resolving focused domains
 * with active user overrides while projecting baseline year defaults for out-of-focus domains.
 */
export function projectParametersForProfile(
  profileId: FormProjectionProfileId,
  year: FullCalendarYear,
  overrides: Readonly<Partial<Record<ParameterId, number>>> = {},
): ProjectedParameterView {
  const profile = getFormProjectionProfile(profileId);
  const focusedSet = new Set<ParameterDomain>(profile.focusedDomains);
  const focusedParameters: ResolvedParameterValue[] = [];
  const projectedOutParameters: ResolvedParameterValue[] = [];

  for (const def of getAllParameterDefinitions()) {
    if (focusedSet.has(def.domain)) {
      focusedParameters.push(resolveParameterForYear(def.id, year, overrides));
    }
    else {
      projectedOutParameters.push(resolveParameterForYear(def.id, year));
    }
  }

  return Object.freeze({
    profile,
    focusedParameters: Object.freeze(focusedParameters),
    projectedOutParameters: Object.freeze(projectedOutParameters),
    totalCount: focusedParameters.length + projectedOutParameters.length,
  });
}
