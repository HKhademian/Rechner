import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";
import {
  signal,
  computed,
  effect,
} from "@preact/signals";
import {
  DEFAULT_TAX_YEAR,
  createTaxRules,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
} from "#engine/types";
import profiles from "../data/taxRules.json" with { type: "json" };

export const verifiedTaxYears = Object.freeze(Object.keys(profiles).map(Number));

/** Only published profiles can be selected. Legacy arbitrary tariff edits are retired. */
export function parseVerifiedTaxYear(value: unknown) {
  if (typeof value !== "number" || !verifiedTaxYears.includes(value)) {
    throw new TypeError("Select a published payroll year.");
  }
  return toFullCalendarYear(value);
}

const netPayStorage = browserAppStorage(AppId.NetPay);

function loadYear() {
  try {
    return typeof window === "undefined" ? DEFAULT_TAX_YEAR
      : parseVerifiedTaxYear(JSON.parse(netPayStorage.getItem("payroll_taxYear") ?? "null"));
  }
  catch {
    return DEFAULT_TAX_YEAR;
  }
}

export const selectedTaxYear = signal(loadYear());
export const selectedTaxRules = computed(() => createTaxRules(selectedTaxYear.value));
if (typeof window !== "undefined") {
  effect(() => {
    netPayStorage.setItem("payroll_taxYear", JSON.stringify(selectedTaxYear.value));
  });
}
export function resetConfig(): void {
  selectedTaxYear.value = DEFAULT_TAX_YEAR;
}
