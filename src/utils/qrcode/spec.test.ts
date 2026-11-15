import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  QR_MAX_BYTE_PAYLOAD_M,
  QrErrorCorrection,
  QrMaskId,
  alignmentTracksForVersion,
  blockPlanForVersion,
  encodeFormatBits,
  encodeVersionBits,
  gridSizeForVersion,
  selectVersionForByteLength,
  toQrErrorCorrection,
  toQrGridSize,
  toQrMaskId,
  toQrModuleScale,
  toQrQuietZone,
  toQrVersion,
  unreservedModuleCount,
} from "#utils/qrcode/spec";

describe("ISO/IEC 18004 specification primitives and geometry", () => {
  it("enforces const enum guards and branded domain constructors", () => {
    assert.equal(toQrErrorCorrection("M"), QrErrorCorrection.M);
    assert.throws(() => toQrErrorCorrection("L"), TypeError);

    assert.equal(toQrMaskId(0), QrMaskId.Mask0);
    assert.equal(toQrMaskId(7), QrMaskId.Mask7);
    assert.throws(() => toQrMaskId(-1), TypeError);
    assert.throws(() => toQrMaskId(8), TypeError);
    assert.throws(() => toQrMaskId(1.5), TypeError);

    assert.equal(toQrVersion(1), 1);
    assert.equal(toQrVersion(13), 13);
    assert.throws(() => toQrVersion(0), TypeError);
    assert.throws(() => toQrVersion(14), TypeError);

    assert.equal(toQrGridSize(21), 21);
    assert.equal(toQrGridSize(69), 69);
    assert.throws(() => toQrGridSize(22), TypeError);
    assert.throws(() => toQrGridSize(73), TypeError);

    assert.equal(toQrModuleScale(10), 10);
    assert.throws(() => toQrModuleScale(0), TypeError);
    assert.throws(() => toQrModuleScale(65), TypeError);

    assert.equal(toQrQuietZone(4), 4);
    assert.equal(toQrQuietZone(0), 0);
    assert.throws(() => toQrQuietZone(-1), TypeError);
    assert.throws(() => toQrQuietZone(17), TypeError);
  });

  it("derives grid dimensions and closed-form alignment tracks for Versions 1..13", () => {
    assert.equal(gridSizeForVersion(toQrVersion(1)), 21);
    assert.equal(gridSizeForVersion(toQrVersion(7)), 45);
    assert.equal(gridSizeForVersion(toQrVersion(13)), 69);

    assert.deepEqual(alignmentTracksForVersion(toQrVersion(1)), []);
    assert.deepEqual(alignmentTracksForVersion(toQrVersion(2)), [6, 18]);
    assert.deepEqual(alignmentTracksForVersion(toQrVersion(6)), [6, 34]);
    assert.deepEqual(alignmentTracksForVersion(toQrVersion(7)), [6, 22, 38]);
    assert.deepEqual(alignmentTracksForVersion(toQrVersion(13)), [6, 34, 62]);
  });

  it("computes Level M codeword plans and Byte-mode capacity boundaries across V1..V13", () => {
    const v1 = blockPlanForVersion(toQrVersion(1));
    assert.equal(unreservedModuleCount(toQrVersion(1)), 208);
    assert.equal(v1.totalCodewords, 26);
    assert.equal(v1.totalDataBytes, 16);
    assert.equal(v1.maxBytePayload, 14);
    assert.equal(v1.byteLengthBits, 8);

    const v6 = blockPlanForVersion(toQrVersion(6));
    assert.equal(v6.maxBytePayload, 106);

    const v7 = blockPlanForVersion(toQrVersion(7));
    assert.equal(v7.totalCodewords, 196);
    assert.equal(v7.totalDataBytes, 124);
    assert.equal(v7.maxBytePayload, 122);

    const v8 = blockPlanForVersion(toQrVersion(8));
    assert.equal(v8.shortBlockCount, 2);
    assert.equal(v8.shortBlockDataBytes, 38);
    assert.equal(v8.longBlockCount, 2);
    assert.equal(v8.totalDataBytes, 154);

    const v9 = blockPlanForVersion(toQrVersion(9));
    assert.equal(v9.maxBytePayload, 180);
    assert.equal(v9.byteLengthBits, 8);

    const v10 = blockPlanForVersion(toQrVersion(10));
    assert.equal(v10.byteLengthBits, 16);
    assert.equal(v10.maxBytePayload, 213);

    const v13 = blockPlanForVersion(toQrVersion(13));
    assert.equal(v13.totalCodewords, 532);
    assert.equal(v13.shortBlockCount, 8);
    assert.equal(v13.shortBlockDataBytes, 37);
    assert.equal(v13.longBlockCount, 1);
    assert.equal(v13.totalDataBytes, 334);
    assert.equal(v13.maxBytePayload, QR_MAX_BYTE_PAYLOAD_M);

    assert.equal(selectVersionForByteLength(0), 1);
    assert.equal(selectVersionForByteLength(14), 1);
    assert.equal(selectVersionForByteLength(15), 2);
    assert.equal(selectVersionForByteLength(106), 6);
    assert.equal(selectVersionForByteLength(107), 7);
    assert.equal(selectVersionForByteLength(180), 9);
    assert.equal(selectVersionForByteLength(181), 10);
    assert.equal(selectVersionForByteLength(331), 13);
    assert.throws(() => selectVersionForByteLength(-1), TypeError);
    assert.throws(() => selectVersionForByteLength(332), RangeError);
  });

  it("matches ISO/IEC 18004 BCH(15,5) format and BCH(18,6) version reference vectors", () => {
    assert.equal(encodeFormatBits(QrErrorCorrection.M, QrMaskId.Mask0), 0x5412);
    assert.equal(encodeFormatBits(QrErrorCorrection.M, QrMaskId.Mask2), 0x5e7c);
    assert.equal(encodeVersionBits(toQrVersion(7)), 0x07c94);
    assert.throws(() => encodeVersionBits(toQrVersion(6)), TypeError);
  });
});
