import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type EpcPayload,
  AmountValidationStatus,
  BicValidationStatus,
  buildEpcPayload,
  createGiroCodeQrMatrix,
  encodeUtf8Bytes,
  EPC_MAX_PAYLOAD_BYTES,
  formatIbanSpaced,
  GiroCodeCharsetMode,
  IbanValidationStatus,
  parseTransferAmount,
  RemittanceKind,
  StructuredRefValidationStatus,
  toBeneficiaryName,
  toGiroCodeCharsetMode,
  toPurposeCode,
  toRemittanceKind,
  toSepaBic,
  toSepaIban,
  toSepaTransferAmount,
  toStructuredCreditorReference,
  toUnstructuredRemittance,
  transliterateGermanToAscii,
  validateBic,
  validateIban,
  validateStructuredRef,
} from "#engine/payments/girocode";

describe("EPC069-12 GiroCode domain engine", () => {
  it("validates const enum guards and throws TypeError on unknown values", () => {
    assert.equal(toGiroCodeCharsetMode("utf8"), GiroCodeCharsetMode.Utf8);
    assert.equal(toGiroCodeCharsetMode("ascii"), GiroCodeCharsetMode.AsciiTransliterated);
    assert.throws(() => toGiroCodeCharsetMode("latin1"), TypeError);

    assert.equal(toRemittanceKind("unstructured"), RemittanceKind.Unstructured);
    assert.equal(toRemittanceKind("structured"), RemittanceKind.Structured);
    assert.throws(() => toRemittanceKind("other"), TypeError);
  });

  it("enforces branded constructors and range constraints", () => {
    assert.equal(toBeneficiaryName("  Musterfirma GmbH  "), "Musterfirma GmbH");
    assert.throws(() => toBeneficiaryName("   "), TypeError);
    assert.throws(() => toBeneficiaryName("A".repeat(71)), TypeError);

    assert.equal(toSepaIban("DE89 3704 0044 0532 0130 00"), "DE89370400440532013000");
    assert.throws(() => toSepaIban("DE00370400440532013000"), TypeError);

    assert.equal(toSepaBic("cobadeffxxx"), "COBADEFFXXX");
    assert.throws(() => toSepaBic("INVALID"), TypeError);

    assert.equal(toSepaTransferAmount(125.5), 125.5);
    assert.throws(() => toSepaTransferAmount(0), TypeError);
    assert.throws(() => toSepaTransferAmount(-10), TypeError);

    assert.equal(toPurposeCode(" char "), "CHAR");
    assert.throws(() => toPurposeCode("TOOLONG"), TypeError);

    assert.equal(toUnstructuredRemittance("Invoice 2026-001"), "Invoice 2026-001");
    assert.throws(() => toUnstructuredRemittance("X".repeat(141)), TypeError);

    assert.equal(toStructuredCreditorReference("RF18 5390 0754 7034"), "RF18539007547034");
    assert.throws(() => toStructuredCreditorReference("RF00539007547034"), TypeError);
  });

  it("validates SEPA IBAN formats and ISO 13616 MOD-97 check digits", () => {
    const validDe = validateIban("de89 3704 0044 0532 0130 00");
    assert.equal(validDe.status, IbanValidationStatus.Valid);
    assert.equal(validDe.normalized, "DE89370400440532013000");
    assert.equal(validDe.spaced, "DE89 3704 0044 0532 0130 00");

    assert.equal(validateIban("AT61 1904 3002 3457 3201").status, IbanValidationStatus.Valid);
    assert.equal(validateIban("FR14 2004 1010 0505 0001 3M02 606").status, IbanValidationStatus.Valid);
    assert.equal(validateIban("DE88 3704 0044 0532 0130 00").status, IbanValidationStatus.InvalidChecksum);
    assert.equal(validateIban("DE89 3704 0044").status, IbanValidationStatus.InvalidFormat);
    assert.equal(validateIban("   ").status, IbanValidationStatus.Empty);
    assert.equal(formatIbanSpaced("de89370400440532013000"), "DE89 3704 0044 0532 0130 00");
  });

  it("validates optional BIC and parses European/dot transfer amounts", () => {
    assert.equal(validateBic("").status, BicValidationStatus.Empty);
    assert.equal(validateBic("COBADEFF").status, BicValidationStatus.Valid);
    assert.equal(validateBic("COBADEFFXXX").status, BicValidationStatus.Valid);
    assert.equal(validateBic("1234").status, BicValidationStatus.InvalidFormat);

    assert.equal(parseTransferAmount("").status, AmountValidationStatus.Empty);
    const commaAmount = parseTransferAmount("1.234,50");
    assert.equal(commaAmount.status, AmountValidationStatus.Valid);
    assert.equal(commaAmount.formattedEpc, "EUR1234.50");

    const dotAmount = parseTransferAmount("49.9");
    assert.equal(dotAmount.status, AmountValidationStatus.Valid);
    assert.equal(dotAmount.formattedEpc, "EUR49.90");

    assert.equal(parseTransferAmount("0.00").status, AmountValidationStatus.Invalid);
    assert.equal(parseTransferAmount("12.345").status, AmountValidationStatus.Invalid);
  });

  it("validates ISO 11649 RF structured references", () => {
    assert.equal(validateStructuredRef("").status, StructuredRefValidationStatus.Empty);
    assert.equal(validateStructuredRef("RF18539007547034").status, StructuredRefValidationStatus.Valid);
    assert.equal(validateStructuredRef("RF19539007547034").status, StructuredRefValidationStatus.InvalidChecksum);
    assert.equal(validateStructuredRef("RF1").status, StructuredRefValidationStatus.InvalidFormat);
  });

  it("builds a compliant 11-line EPC069-12 V002 payload and supports ASCII transliteration", () => {
    const utf8Build = buildEpcPayload({
      beneficiaryName: "Bäcker Müller & Söhne GmbH",
      iban: "DE89 3704 0044 0532 0130 00",
      bic: "COBADEFFXXX",
      amount: "125,50",
      purposeCode: "",
      remittanceKind: RemittanceKind.Unstructured,
      unstructuredReference: "Rechnung Nr. 42 — Straße",
      structuredReference: "RF18539007547034",
      charsetMode: GiroCodeCharsetMode.Utf8,
    });

    assert.equal(utf8Build.isReady, true);
    assert.ok(utf8Build.payload !== null);
    assert.deepEqual(utf8Build.previewLines, [
      "BCD",
      "002",
      "1",
      "SCT",
      "COBADEFFXXX",
      "Bäcker Müller & Söhne GmbH",
      "DE89370400440532013000",
      "EUR125.50",
      "",
      "",
      "Rechnung Nr. 42 — Straße",
    ]);

    const asciiBuild = buildEpcPayload({
      beneficiaryName: "Bäcker Müller & Söhne GmbH",
      iban: "DE89370400440532013000",
      bic: "",
      amount: "",
      purposeCode: "CHAR",
      remittanceKind: RemittanceKind.Structured,
      unstructuredReference: "Ignored when structured",
      structuredReference: "RF18 5390 0754 7034",
      charsetMode: GiroCodeCharsetMode.AsciiTransliterated,
    });

    assert.equal(asciiBuild.isReady, true);
    assert.deepEqual(asciiBuild.previewLines, [
      "BCD",
      "002",
      "1",
      "SCT",
      "",
      "Baecker Mueller & Soehne GmbH",
      "DE89370400440532013000",
      "",
      "CHAR",
      "RF18539007547034",
      "",
    ]);
    assert.equal(transliterateGermanToAscii("äöüÄÖÜß"), "aeoeueAeOeUess");
  });

  it("rejects payloads exceeding the 331-byte EPC069-12 QR limit", () => {
    const oversized = buildEpcPayload({
      beneficiaryName: "Ä".repeat(68),
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      amount: "999999999.99",
      purposeCode: "CHAR",
      remittanceKind: RemittanceKind.Unstructured,
      unstructuredReference: "Ü".repeat(138),
      structuredReference: "",
      charsetMode: GiroCodeCharsetMode.Utf8,
    });

    assert.equal(oversized.isReady, false);
    assert.equal(oversized.payload, null);
    assert.ok(oversized.utf8ByteLength > EPC_MAX_PAYLOAD_BYTES);
    assert.ok(oversized.errors.some((message) => message.includes("331-byte")));
  });

  it("encodes UTF-8 bytes accurately and generates a scannable Level M QR matrix", () => {
    assert.deepEqual(encodeUtf8Bytes("ü"), [0xc3, 0xbc]);

    const result = buildEpcPayload({
      beneficiaryName: "Bäcker Müller & Söhne GmbH",
      iban: "DE89 3704 0044 0532 0130 00",
      bic: "COBADEFFXXX",
      amount: "125.00",
      purposeCode: "",
      remittanceKind: RemittanceKind.Unstructured,
      unstructuredReference: "Rechnung 2026-001 — Straße",
      structuredReference: "",
      charsetMode: GiroCodeCharsetMode.Utf8,
    });

    assert.equal(result.isReady, true);
    assert.ok(result.payload !== null);
    const matrix = createGiroCodeQrMatrix(result.payload);
    assert.ok(matrix.moduleCount >= 21);
    assert.equal(matrix.isDark(0, 0), true);
    assert.equal(matrix.isDark(0, matrix.moduleCount - 1), true);
    assert.equal(matrix.isDark(matrix.moduleCount - 1, 0), true);
    assert.equal(matrix.isDark(matrix.moduleCount - 8, 8), true);

    const maxPayload = buildEpcPayload({
      beneficiaryName: "A".repeat(70),
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      amount: "999999999.99",
      purposeCode: "CHAR",
      remittanceKind: RemittanceKind.Unstructured,
      unstructuredReference: "X".repeat(140),
      structuredReference: "",
      charsetMode: GiroCodeCharsetMode.Utf8,
    });
    assert.equal(maxPayload.isReady, true);
    assert.ok(maxPayload.payload !== null);
    assert.ok(maxPayload.utf8ByteLength <= EPC_MAX_PAYLOAD_BYTES);
    const largeMatrix = createGiroCodeQrMatrix(maxPayload.payload);
    assert.ok(largeMatrix.moduleCount <= 69);

    const exactCeilingPayload = buildEpcPayload({
      beneficiaryName: "B".repeat(70),
      iban: "DE89370400440532013000",
      bic: "COBADEFFXXX",
      amount: "999999999.99",
      purposeCode: "CHAR",
      remittanceKind: RemittanceKind.Unstructured,
      unstructuredReference: "Z".repeat(140),
      structuredReference: "",
      charsetMode: GiroCodeCharsetMode.Utf8,
    });
    assert.equal(exactCeilingPayload.isReady, true);
    assert.ok(exactCeilingPayload.payload !== null);
    const padded331 = `${exactCeilingPayload.payload}${"Y".repeat(
      EPC_MAX_PAYLOAD_BYTES - exactCeilingPayload.utf8ByteLength,
    )}`;
    const maxMatrix = createGiroCodeQrMatrix(padded331 as EpcPayload);
    assert.equal(maxMatrix.moduleCount, 69);
    assert.equal(maxMatrix.isDark(maxMatrix.moduleCount - 8, 8), true);
  });
});
