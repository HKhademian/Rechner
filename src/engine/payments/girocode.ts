import {
  type Brand,
} from "#engine/types";
import {
  QrErrorCorrection,
  encodeQrUtf8,
} from "#utils/qrcode";

export const EPC_SERVICE_TAG = "BCD";
export const EPC_VERSION = "002";
export const EPC_CHARACTER_SET_UTF8 = "1";
export const EPC_IDENTIFICATION_SCT = "SCT";
export const EPC_MAX_PAYLOAD_BYTES = 331;
export const EPC_MAX_NAME_LENGTH = 70;
export const EPC_MAX_IBAN_LENGTH = 34;
export const EPC_MAX_PURPOSE_LENGTH = 4;
export const EPC_MAX_STRUCTURED_REF_LENGTH = 35;
export const EPC_MAX_UNSTRUCTURED_REF_LENGTH = 140;
export const EPC_MIN_AMOUNT = 0.01;
export const EPC_MAX_AMOUNT = 999999999.99;

export const GiroCodeCharsetMode = {
  Utf8: "utf8",
  AsciiTransliterated: "ascii",
} as const;
export type GiroCodeCharsetMode = (typeof GiroCodeCharsetMode)[keyof typeof GiroCodeCharsetMode];

export function toGiroCodeCharsetMode(value: string): GiroCodeCharsetMode {
  if (!Object.values(GiroCodeCharsetMode).includes(value as GiroCodeCharsetMode)) {
    throw new TypeError(`Unknown GiroCode charset mode: ${value}`);
  }
  return value as GiroCodeCharsetMode;
}

export const RemittanceKind = {
  Unstructured: "unstructured",
  Structured: "structured",
} as const;
export type RemittanceKind = (typeof RemittanceKind)[keyof typeof RemittanceKind];

export function toRemittanceKind(value: string): RemittanceKind {
  if (!Object.values(RemittanceKind).includes(value as RemittanceKind)) {
    throw new TypeError(`Unknown remittance kind: ${value}`);
  }
  return value as RemittanceKind;
}

export const IbanValidationStatus = {
  Empty: "empty",
  Valid: "valid",
  InvalidFormat: "invalid_format",
  InvalidChecksum: "invalid_checksum",
} as const;
export type IbanValidationStatus = (typeof IbanValidationStatus)[keyof typeof IbanValidationStatus];

export const BicValidationStatus = {
  Empty: "empty",
  Valid: "valid",
  InvalidFormat: "invalid_format",
} as const;
export type BicValidationStatus = (typeof BicValidationStatus)[keyof typeof BicValidationStatus];

export const AmountValidationStatus = {
  Empty: "empty",
  Valid: "valid",
  Invalid: "invalid",
} as const;
export type AmountValidationStatus = (typeof AmountValidationStatus)[keyof typeof AmountValidationStatus];

export const StructuredRefValidationStatus = {
  Empty: "empty",
  Valid: "valid",
  InvalidFormat: "invalid_format",
  InvalidChecksum: "invalid_checksum",
} as const;
export type StructuredRefValidationStatus = (typeof StructuredRefValidationStatus)[keyof typeof StructuredRefValidationStatus];

export type BeneficiaryName = Brand<string, "BeneficiaryName">;
export type SepaIban = Brand<string, "SepaIban">;
export type SepaBic = Brand<string, "SepaBic">;
export type SepaTransferAmount = Brand<number, "SepaTransferAmount">;
export type PurposeCode = Brand<string, "PurposeCode">;
export type UnstructuredRemittance = Brand<string, "UnstructuredRemittance">;
export type StructuredCreditorReference = Brand<string, "StructuredCreditorReference">;
export type EpcPayload = Brand<string, "EpcPayload">;

const SEPA_IBAN_COUNTRY_LENGTHS: Readonly<Record<string, number>> = {
  AT: 20,
  BE: 16,
  BG: 22,
  CH: 21,
  CY: 28,
  CZ: 24,
  DE: 22,
  DK: 18,
  EE: 20,
  ES: 24,
  FI: 18,
  FR: 27,
  GB: 22,
  GR: 27,
  HR: 21,
  HU: 28,
  IE: 22,
  IS: 26,
  IT: 27,
  LI: 21,
  LT: 20,
  LU: 20,
  LV: 21,
  MC: 27,
  MT: 31,
  NL: 18,
  NO: 15,
  PL: 28,
  PT: 25,
  RO: 24,
  SE: 24,
  SI: 19,
  SK: 24,
};

function sanitizeSingleLine(value: string): string {
  return value.replace(/[\r\n\t]+/g, " ").trim();
}

export function transliterateGermanToAscii(value: string): string {
  return value
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/Ä/g, "Ae")
    .replace(/Ö/g, "Oe")
    .replace(/Ü/g, "Ue")
    .replace(/ß/g, "ss");
}

export function computeMod97Remainder(rearrangedAlphanumeric: string): number {
  let remainder = 0;
  for (let i = 0; i < rearrangedAlphanumeric.length; i += 1) {
    const code = rearrangedAlphanumeric.charCodeAt(i);
    if (code >= 65 && code <= 90) {
      const numericPair = code - 55;
      remainder = (remainder * 100 + numericPair) % 97;
    }
    else if (code >= 48 && code <= 57) {
      remainder = (remainder * 10 + (code - 48)) % 97;
    }
    else {
      return -1;
    }
  }
  return remainder;
}

export function formatIbanSpaced(rawIban: string): string {
  const compact = rawIban.replace(/\s+/g, "").toUpperCase();
  if (compact.length === 0) {
    return "";
  }
  return compact.replace(/(.{4})/g, "$1 ").trim();
}

export interface IbanValidationResult {
  readonly status: IbanValidationStatus;
  readonly normalized: string;
  readonly spaced: string;
  readonly iban?: SepaIban;
}

export function validateIban(rawIban: string): IbanValidationResult {
  const normalized = rawIban.replace(/\s+/g, "").toUpperCase();
  const spaced = formatIbanSpaced(normalized);
  if (normalized.length === 0) {
    return {
      status: IbanValidationStatus.Empty,
      normalized,
      spaced,
    };
  }
  if (!/^[A-Z]{2}[0-9]{2}[A-Z0-9]{11,30}$/.test(normalized)) {
    return {
      status: IbanValidationStatus.InvalidFormat,
      normalized,
      spaced,
    };
  }
  const countryCode = normalized.slice(0, 2);
  const expectedLength = SEPA_IBAN_COUNTRY_LENGTHS[countryCode];
  if (expectedLength !== undefined && normalized.length !== expectedLength) {
    return {
      status: IbanValidationStatus.InvalidFormat,
      normalized,
      spaced,
    };
  }
  const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
  if (computeMod97Remainder(rearranged) !== 1) {
    return {
      status: IbanValidationStatus.InvalidChecksum,
      normalized,
      spaced,
    };
  }
  return {
    status: IbanValidationStatus.Valid,
    normalized,
    spaced,
    iban: normalized as SepaIban,
  };
}

export function toSepaIban(value: string): SepaIban {
  const result = validateIban(value);
  if (!result.iban) {
    throw new TypeError(`Invalid SEPA IBAN (${result.status}): ${value}`);
  }
  return result.iban;
}

export interface BicValidationResult {
  readonly status: BicValidationStatus;
  readonly normalized: string;
  readonly bic?: SepaBic;
}

export function validateBic(rawBic: string): BicValidationResult {
  const normalized = rawBic.replace(/\s+/g, "").toUpperCase();
  if (normalized.length === 0) {
    return {
      status: BicValidationStatus.Empty,
      normalized,
    };
  }
  if (!/^[A-Z]{4}[A-Z]{2}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(normalized)) {
    return {
      status: BicValidationStatus.InvalidFormat,
      normalized,
    };
  }
  return {
    status: BicValidationStatus.Valid,
    normalized,
    bic: normalized as SepaBic,
  };
}

export function toSepaBic(value: string): SepaBic {
  const result = validateBic(value);
  if (!result.bic) {
    throw new TypeError(`Invalid SEPA BIC: ${value}`);
  }
  return result.bic;
}

export function toBeneficiaryName(value: string): BeneficiaryName {
  const cleaned = sanitizeSingleLine(value);
  if (cleaned.length === 0 || cleaned.length > EPC_MAX_NAME_LENGTH) {
    throw new TypeError(`Beneficiary name must be 1..${EPC_MAX_NAME_LENGTH} characters.`);
  }
  return cleaned as BeneficiaryName;
}

export function toPurposeCode(value: string): PurposeCode {
  const cleaned = value.trim().toUpperCase();
  if (!/^[A-Z0-9]{1,4}$/.test(cleaned)) {
    throw new TypeError(`Purpose code must be 1..${EPC_MAX_PURPOSE_LENGTH} alphanumeric characters.`);
  }
  return cleaned as PurposeCode;
}

export function toUnstructuredRemittance(value: string): UnstructuredRemittance {
  const cleaned = sanitizeSingleLine(value);
  if (cleaned.length > EPC_MAX_UNSTRUCTURED_REF_LENGTH) {
    throw new TypeError(`Unstructured remittance must be at most ${EPC_MAX_UNSTRUCTURED_REF_LENGTH} characters.`);
  }
  return cleaned as UnstructuredRemittance;
}

export interface StructuredRefValidationResult {
  readonly status: StructuredRefValidationStatus;
  readonly normalized: string;
  readonly reference?: StructuredCreditorReference;
}

export function validateStructuredRef(rawRef: string): StructuredRefValidationResult {
  const normalized = sanitizeSingleLine(rawRef).replace(/\s+/g, "").toUpperCase();
  if (normalized.length === 0) {
    return {
      status: StructuredRefValidationStatus.Empty,
      normalized,
    };
  }
  if (normalized.length > EPC_MAX_STRUCTURED_REF_LENGTH || !/^[A-Z0-9-]+$/.test(normalized)) {
    return {
      status: StructuredRefValidationStatus.InvalidFormat,
      normalized,
    };
  }
  if (normalized.startsWith("RF")) {
    if (!/^RF[0-9]{2}[A-Z0-9]{1,21}$/.test(normalized)) {
      return {
        status: StructuredRefValidationStatus.InvalidFormat,
        normalized,
      };
    }
    const rearranged = `${normalized.slice(4)}${normalized.slice(0, 4)}`;
    if (computeMod97Remainder(rearranged) !== 1) {
      return {
        status: StructuredRefValidationStatus.InvalidChecksum,
        normalized,
      };
    }
  }
  return {
    status: StructuredRefValidationStatus.Valid,
    normalized,
    reference: normalized as StructuredCreditorReference,
  };
}

export function toStructuredCreditorReference(value: string): StructuredCreditorReference {
  const result = validateStructuredRef(value);
  if (!result.reference) {
    throw new TypeError(`Invalid structured creditor reference (${result.status}): ${value}`);
  }
  return result.reference;
}

export interface AmountValidationResult {
  readonly status: AmountValidationStatus;
  readonly amount?: SepaTransferAmount;
  readonly formattedEpc: string;
  readonly formattedDisplay: string;
}

export function toSepaTransferAmount(value: number): SepaTransferAmount {
  if (!Number.isFinite(value)) {
    throw new TypeError("Transfer amount must be finite.");
  }
  const rounded = Math.round(value * 100) / 100;
  if (rounded < EPC_MIN_AMOUNT || rounded > EPC_MAX_AMOUNT) {
    throw new TypeError(`Transfer amount must be between ${EPC_MIN_AMOUNT} and ${EPC_MAX_AMOUNT} EUR.`);
  }
  return rounded as SepaTransferAmount;
}

export function parseTransferAmount(rawAmount: string): AmountValidationResult {
  const trimmed = rawAmount.trim().replace(/\s+/g, "");
  if (trimmed.length === 0) {
    return {
      status: AmountValidationStatus.Empty,
      formattedEpc: "",
      formattedDisplay: "Open amount",
    };
  }

  let normalized = trimmed;
  const hasComma = normalized.includes(",");
  const hasDot = normalized.includes(".");
  if (hasComma && hasDot) {
    const lastComma = normalized.lastIndexOf(",");
    const lastDot = normalized.lastIndexOf(".");
    if (lastComma > lastDot) {
      normalized = normalized.replace(/\./g, "").replace(",", ".");
    }
    else {
      normalized = normalized.replace(/,/g, "");
    }
  }
  else if (hasComma) {
    normalized = normalized.replace(",", ".");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) {
    return {
      status: AmountValidationStatus.Invalid,
      formattedEpc: "",
      formattedDisplay: "Invalid amount",
    };
  }

  const parsed = Number(normalized);
  if (!Number.isFinite(parsed) || parsed < EPC_MIN_AMOUNT || parsed > EPC_MAX_AMOUNT) {
    return {
      status: AmountValidationStatus.Invalid,
      formattedEpc: "",
      formattedDisplay: "Invalid amount",
    };
  }

  const amount = toSepaTransferAmount(parsed);
  return {
    status: AmountValidationStatus.Valid,
    amount,
    formattedEpc: `EUR${amount.toFixed(2)}`,
    formattedDisplay: `${amount.toLocaleString("de-DE", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} EUR`,
  };
}

export interface GiroCodeDraft {
  readonly beneficiaryName: string;
  readonly iban: string;
  readonly bic: string;
  readonly amount: string;
  readonly purposeCode: string;
  readonly remittanceKind: RemittanceKind;
  readonly unstructuredReference: string;
  readonly structuredReference: string;
  readonly charsetMode: GiroCodeCharsetMode;
}

export interface GiroCodeBuildResult {
  readonly isReady: boolean;
  readonly payload: EpcPayload | null;
  readonly previewLines: readonly string[];
  readonly utf8ByteLength: number;
  readonly maxByteLength: number;
  readonly ibanValidation: IbanValidationResult;
  readonly bicValidation: BicValidationResult;
  readonly amountValidation: AmountValidationResult;
  readonly structuredRefValidation: StructuredRefValidationResult;
  readonly errors: readonly string[];
}

export function buildEpcPayload(draft: GiroCodeDraft): GiroCodeBuildResult {
  const errors: string[] = [];

  const rawName = sanitizeSingleLine(draft.beneficiaryName);
  const encodedName = draft.charsetMode === GiroCodeCharsetMode.AsciiTransliterated
    ? transliterateGermanToAscii(rawName)
    : rawName;
  const effectiveName = encodedName.slice(0, EPC_MAX_NAME_LENGTH);
  if (effectiveName.length === 0) {
    errors.push("Beneficiary name is required.");
  }
  else if (encodedName.length > EPC_MAX_NAME_LENGTH) {
    errors.push(`Beneficiary name exceeds ${EPC_MAX_NAME_LENGTH} characters after encoding.`);
  }

  const ibanValidation = validateIban(draft.iban);
  if (ibanValidation.status === IbanValidationStatus.Empty) {
    errors.push("Recipient IBAN is required.");
  }
  else if (ibanValidation.status === IbanValidationStatus.InvalidFormat) {
    errors.push("IBAN format is invalid for SEPA.");
  }
  else if (ibanValidation.status === IbanValidationStatus.InvalidChecksum) {
    errors.push("IBAN fails ISO 13616 MOD-97 check digits.");
  }

  const bicValidation = validateBic(draft.bic);
  if (bicValidation.status === BicValidationStatus.InvalidFormat) {
    errors.push("BIC must be 8 or 11 alphanumeric SWIFT characters.");
  }

  const amountValidation = parseTransferAmount(draft.amount);
  if (amountValidation.status === AmountValidationStatus.Invalid) {
    errors.push("Amount must be between 0.01 and 999,999,999.99 EUR with up to 2 decimals.");
  }

  const purposeNormalized = draft.purposeCode.trim().toUpperCase();
  if (purposeNormalized.length > 0 && !/^[A-Z0-9]{1,4}$/.test(purposeNormalized)) {
    errors.push(`Purpose code must be 1..${EPC_MAX_PURPOSE_LENGTH} alphanumeric characters.`);
  }

  const structuredRefValidation = validateStructuredRef(draft.structuredReference);
  let line10Structured = "";
  let line11Unstructured = "";

  if (draft.remittanceKind === RemittanceKind.Structured) {
    if (structuredRefValidation.status === StructuredRefValidationStatus.InvalidFormat) {
      errors.push("Structured reference must be 1..35 characters (ISO 11649 RF format).");
    }
    else if (structuredRefValidation.status === StructuredRefValidationStatus.InvalidChecksum) {
      errors.push("ISO 11649 RF reference fails MOD-97 check digits.");
    }
    line10Structured = structuredRefValidation.normalized.slice(0, EPC_MAX_STRUCTURED_REF_LENGTH);
  }
  else {
    const rawUnstructured = sanitizeSingleLine(draft.unstructuredReference);
    const encodedUnstructured = draft.charsetMode === GiroCodeCharsetMode.AsciiTransliterated
      ? transliterateGermanToAscii(rawUnstructured)
      : rawUnstructured;
    if (encodedUnstructured.length > EPC_MAX_UNSTRUCTURED_REF_LENGTH) {
      errors.push(`Reference exceeds ${EPC_MAX_UNSTRUCTURED_REF_LENGTH} characters after encoding.`);
    }
    line11Unstructured = encodedUnstructured.slice(0, EPC_MAX_UNSTRUCTURED_REF_LENGTH);
  }

  const lines: readonly string[] = [
    EPC_SERVICE_TAG,
    EPC_VERSION,
    EPC_CHARACTER_SET_UTF8,
    EPC_IDENTIFICATION_SCT,
    bicValidation.normalized,
    effectiveName,
    ibanValidation.normalized,
    amountValidation.formattedEpc,
    purposeNormalized.slice(0, EPC_MAX_PURPOSE_LENGTH),
    line10Structured,
    line11Unstructured,
  ];

  const rawJoined = lines.join("\n");
  const utf8ByteLength = new TextEncoder().encode(rawJoined).length;
  if (utf8ByteLength > EPC_MAX_PAYLOAD_BYTES) {
    errors.push(`EPC069-12 payload (${utf8ByteLength} bytes) exceeds the ${EPC_MAX_PAYLOAD_BYTES}-byte limit.`);
  }

  const isReady = errors.length === 0;
  return {
    isReady,
    payload: isReady ? (rawJoined as EpcPayload) : null,
    previewLines: lines,
    utf8ByteLength,
    maxByteLength: EPC_MAX_PAYLOAD_BYTES,
    ibanValidation,
    bicValidation,
    amountValidation,
    structuredRefValidation,
    errors,
  };
}

export interface GiroCodeQrMatrix {
  readonly moduleCount: number;
  isDark(row: number, col: number): boolean;
}

export function encodeUtf8Bytes(text: string): number[] {
  return Array.from(new TextEncoder().encode(text));
}

export function createGiroCodeQrMatrix(payload: EpcPayload): GiroCodeQrMatrix {
  return encodeQrUtf8(payload, {
    errorCorrection: QrErrorCorrection.M,
  });
}
