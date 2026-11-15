/**
 * Cleanroom ISO/IEC 18004 QR Code Generator Facade (Byte Mode, Error Correction M, Versions 1..13).
 *
 * Domain-agnostic standalone library providing UTF-8 and raw-byte symbol matrix encoding.
 */

import {
  packByteModeCodewords,
} from "#utils/qrcode/bitPacker";
import {
  encodeAndInterleaveBlocks,
} from "#utils/qrcode/galoisLfsr";
import {
  type QrSymbolMatrix,
  composeQrSymbolMatrix,
} from "#utils/qrcode/matrixComposer";
import {
  type QrBrand,
  type QrGridSize,
  type QrVersion,
  QR_MAX_BYTE_PAYLOAD_M,
  QrErrorCorrection,
  QrMaskId,
  selectVersionForByteLength,
  toQrErrorCorrection,
  toQrGridSize,
  toQrVersion,
} from "#utils/qrcode/spec";

export {
  type QrBrand,
  type QrGridSize,
  type QrSymbolMatrix,
  type QrVersion,
  QR_MAX_BYTE_PAYLOAD_M,
  QrErrorCorrection,
  QrMaskId,
  toQrErrorCorrection,
  toQrGridSize,
  toQrVersion,
};

/** Encoding options accepted by {@link encodeQrBytes} and {@link encodeQrUtf8}. */
export interface QrEncodeOptions {
  readonly errorCorrection?: QrErrorCorrection;
}

/** Encodes raw bytes into an immutable QR Code symbol matrix using 8-bit Byte mode. */
export function encodeQrBytes(
  bytes: Uint8Array,
  options?: QrEncodeOptions,
): QrSymbolMatrix {
  const errorCorrection = options?.errorCorrection !== undefined
    ? toQrErrorCorrection(options.errorCorrection)
    : QrErrorCorrection.M;
  const version = selectVersionForByteLength(bytes.length);
  const dataCodewords = packByteModeCodewords(bytes, version);
  const interleavedCodewords = encodeAndInterleaveBlocks(dataCodewords, version);
  return composeQrSymbolMatrix(interleavedCodewords, version, errorCorrection);
}

/** Encodes a UTF-8 string into an immutable QR Code symbol matrix using 8-bit Byte mode. */
export function encodeQrUtf8(
  text: string,
  options?: QrEncodeOptions,
): QrSymbolMatrix {
  const utf8Bytes = new TextEncoder().encode(text);
  return encodeQrBytes(utf8Bytes, options);
}
