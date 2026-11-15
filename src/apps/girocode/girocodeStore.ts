import {
  computed,
  signal,
} from "@preact/signals";
import {
  AppId,
} from "#/apps/appDefinition.ts";
import {
  type GiroCodeBuildResult,
  type GiroCodeCharsetMode,
  type GiroCodeDraft,
  type RemittanceKind,
  buildEpcPayload,
  GiroCodeCharsetMode as CharsetModes,
  RemittanceKind as RemittanceKinds,
  toGiroCodeCharsetMode,
  toRemittanceKind,
} from "#engine/payments/girocode";
import {
  browserAppStorage,
} from "#engine/storage/appStorage";

const DRAFT_STORAGE_KEY = "draft";
const giroCodeStorage = browserAppStorage(AppId.GiroCode);

export const EMPTY_GIROCODE_DRAFT: GiroCodeDraft = {
  beneficiaryName: "",
  iban: "",
  bic: "",
  amount: "",
  purposeCode: "",
  remittanceKind: RemittanceKinds.Unstructured,
  unstructuredReference: "",
  structuredReference: "",
  charsetMode: CharsetModes.Utf8,
};

export const EMPTY_GIROCODE_BUILD: GiroCodeBuildResult = buildEpcPayload(EMPTY_GIROCODE_DRAFT);

export const SAMPLE_GIROCODE_DRAFT: GiroCodeDraft = {
  beneficiaryName: "Musterfirma GmbH",
  iban: "DE89 3704 0044 0532 0130 00",
  bic: "COBADEFFXXX",
  amount: "125.00",
  purposeCode: "",
  remittanceKind: RemittanceKinds.Unstructured,
  unstructuredReference: "Sample invoice 2026-001",
  structuredReference: "",
  charsetMode: CharsetModes.Utf8,
};

function sanitizeStoredString(value: unknown, maxLength: number): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.slice(0, maxLength);
}

function parseStoredDraft(raw: string | null): GiroCodeDraft {
  if (!raw) {
    return EMPTY_GIROCODE_DRAFT;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return EMPTY_GIROCODE_DRAFT;
    }
    const candidate = parsed as Record<string, unknown>;
    let remittanceKind: RemittanceKind = RemittanceKinds.Unstructured;
    if (typeof candidate.remittanceKind === "string") {
      try {
        remittanceKind = toRemittanceKind(candidate.remittanceKind);
      }
      catch {
        remittanceKind = RemittanceKinds.Unstructured;
      }
    }
    let charsetMode: GiroCodeCharsetMode = CharsetModes.Utf8;
    if (typeof candidate.charsetMode === "string") {
      try {
        charsetMode = toGiroCodeCharsetMode(candidate.charsetMode);
      }
      catch {
        charsetMode = CharsetModes.Utf8;
      }
    }
    return {
      beneficiaryName: sanitizeStoredString(candidate.beneficiaryName, 140),
      iban: sanitizeStoredString(candidate.iban, 50),
      bic: sanitizeStoredString(candidate.bic, 20),
      amount: sanitizeStoredString(candidate.amount, 30),
      purposeCode: sanitizeStoredString(candidate.purposeCode, 10),
      remittanceKind,
      unstructuredReference: sanitizeStoredString(candidate.unstructuredReference, 280),
      structuredReference: sanitizeStoredString(candidate.structuredReference, 70),
      charsetMode,
    };
  }
  catch {
    return EMPTY_GIROCODE_DRAFT;
  }
}

function persistDraft(next: GiroCodeDraft): void {
  giroCodeStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(next));
}

export const giroCodeDraft = signal<GiroCodeDraft>(parseStoredDraft(giroCodeStorage.getItem(DRAFT_STORAGE_KEY)));

export const giroCodeBuild = computed<GiroCodeBuildResult>(() => buildEpcPayload(giroCodeDraft.value));

export function updateGiroCodeField<K extends keyof GiroCodeDraft>(field: K, value: GiroCodeDraft[K]): void {
  const next: GiroCodeDraft = {
    ...giroCodeDraft.value,
    [field]: value,
  };
  giroCodeDraft.value = next;
  persistDraft(next);
}

export function loadSampleGiroCodeDraft(): void {
  giroCodeDraft.value = SAMPLE_GIROCODE_DRAFT;
  persistDraft(SAMPLE_GIROCODE_DRAFT);
}

export function clearGiroCodeDraft(): void {
  giroCodeDraft.value = EMPTY_GIROCODE_DRAFT;
  persistDraft(EMPTY_GIROCODE_DRAFT);
}
