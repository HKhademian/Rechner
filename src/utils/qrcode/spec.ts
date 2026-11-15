/**
 * ISO/IEC 18004 QR Code Model 2 Specification Constants, Nominal Types, and Closed-Form Geometry.
 *
 * Scoped to 8-bit Byte mode, Error Correction Level M, and Versions 1..13 (up to 331 UTF-8 bytes).
 */

declare const _QR_BRAND: unique symbol;

/** Nominal brand wrapper ensuring compile-time separation of QR domain primitives. */
export type QrBrand<Base, Tag extends string> = Base & {
  readonly [_QR_BRAND]: Tag;
};

export const QR_MIN_VERSION = 1;
export const QR_MAX_VERSION = 13;
export const QR_BYTE_MODE_INDICATOR = 0b0100;
export const QR_MAX_BYTE_PAYLOAD_M = 331;

/** ISO/IEC 18004 Error Correction Level supported by this minimal encoder. */
export const QrErrorCorrection = {
  M: "M",
} as const;
export type QrErrorCorrection = (typeof QrErrorCorrection)[keyof typeof QrErrorCorrection];

/** Validates and narrows an error correction string to {@link QrErrorCorrection}. */
export function toQrErrorCorrection(value: string): QrErrorCorrection {
  if (!Object.values(QrErrorCorrection).includes(value as QrErrorCorrection)) {
    throw new TypeError(`Unsupported QR error correction level: ${value}`);
  }
  return value as QrErrorCorrection;
}

/** ISO/IEC 18004 data mask pattern identifiers (0..7). */
export const QrMaskId = {
  Mask0: 0,
  Mask1: 1,
  Mask2: 2,
  Mask3: 3,
  Mask4: 4,
  Mask5: 5,
  Mask6: 6,
  Mask7: 7,
} as const;
export type QrMaskId = (typeof QrMaskId)[keyof typeof QrMaskId];

/** Ordered tuple of all 8 ISO/IEC 18004 mask candidates. */
export const ALL_QR_MASK_IDS: readonly QrMaskId[] = [
  QrMaskId.Mask0,
  QrMaskId.Mask1,
  QrMaskId.Mask2,
  QrMaskId.Mask3,
  QrMaskId.Mask4,
  QrMaskId.Mask5,
  QrMaskId.Mask6,
  QrMaskId.Mask7,
];

/** Validates and narrows a mask pattern integer (0..7) to {@link QrMaskId}. */
export function toQrMaskId(value: number): QrMaskId {
  if (!Number.isInteger(value) || value < 0 || value > 7) {
    throw new TypeError(`QR mask ID must be an integer 0..7, got ${value}`);
  }
  return value as QrMaskId;
}

export type QrVersion = QrBrand<number, "QrVersion">;
export type QrGridSize = QrBrand<number, "QrGridSize">;
export type QrModuleScale = QrBrand<number, "QrModuleScale">;
export type QrQuietZone = QrBrand<number, "QrQuietZone">;

/** Validates and constructs a branded {@link QrVersion} within 1..13. */
export function toQrVersion(value: number): QrVersion {
  if (!Number.isInteger(value) || value < QR_MIN_VERSION || value > QR_MAX_VERSION) {
    throw new TypeError(`QR version must be an integer ${QR_MIN_VERSION}..${QR_MAX_VERSION}, got ${value}`);
  }
  return value as QrVersion;
}

/** Validates and constructs a branded {@link QrGridSize} matching 4V + 17 for V in 1..13. */
export function toQrGridSize(value: number): QrGridSize {
  if (!Number.isInteger(value) || value < 21 || value > 69 || (value - 17) % 4 !== 0) {
    throw new TypeError(`QR grid size must equal 4V + 17 for V in 1..13, got ${value}`);
  }
  return value as QrGridSize;
}

/** Validates and constructs a branded raster module scale (1..64 pixels per module). */
export function toQrModuleScale(value: number): QrModuleScale {
  if (!Number.isInteger(value) || value < 1 || value > 64) {
    throw new TypeError(`QR module scale must be an integer 1..64, got ${value}`);
  }
  return value as QrModuleScale;
}

/** Validates and constructs a branded quiet-zone width (0..16 modules per side). */
export function toQrQuietZone(value: number): QrQuietZone {
  if (!Number.isInteger(value) || value < 0 || value > 16) {
    throw new TypeError(`QR quiet zone must be an integer 0..16, got ${value}`);
  }
  return value as QrQuietZone;
}

/** Computes symbol side length N = 4V + 17. */
export function gridSizeForVersion(version: QrVersion): QrGridSize {
  return toQrGridSize(4 * version + 17);
}

/**
 * Computes alignment track center coordinates for Versions 1..13 without a lookup table.
 * Matches ISO/IEC 18004 Annex E: [] for V1, [6, N-7] for V2..V6, [6, (N-1)/2, N-7] for V7..V13.
 */
export function alignmentTracksForVersion(version: QrVersion): readonly number[] {
  if (version === 1) {
    return [];
  }
  const farTrack = 4 * version + 10;
  if (version <= 6) {
    return [6, farTrack];
  }
  return [6, 2 * version + 8, farTrack];
}

/**
 * Counts unreserved data/EC/remainder module cells for a given version using closed-form geometry:
 * 3 corners (192) + format/dark module (31) + timing lines + alignment patterns + version info.
 */
export function unreservedModuleCount(version: QrVersion): number {
  const size = 4 * version + 17;
  const finderAndFormatCells = 223;
  const timingCells = 2 * (size - 16);
  const alignmentCells = version === 1 ? 0 : version <= 6 ? 25 : 140;
  const versionInfoCells = version >= 7 ? 36 : 0;
  return size * size - finderAndFormatCells - timingCells - alignmentCells - versionInfoCells;
}

// ISO/IEC 18004 Table 9 Error Correction Level M parameters for Versions 1..13.
const EC_BYTES_PER_BLOCK_M = [10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22] as const;
const BLOCK_COUNT_M = [1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9] as const;

/** Reed–Solomon block structure and Byte-mode capacity plan for a single QR version. */
export interface QrVersionBlockPlan {
  readonly version: QrVersion;
  readonly totalCodewords: number;
  readonly ecBytesPerBlock: number;
  readonly blockCount: number;
  readonly totalDataBytes: number;
  readonly shortBlockDataBytes: number;
  readonly shortBlockCount: number;
  readonly longBlockCount: number;
  readonly byteLengthBits: 8 | 16;
  readonly maxBytePayload: number;
}

/** Derives the Level M Reed–Solomon block layout and Byte-mode capacity for {@link version}. */
export function blockPlanForVersion(version: QrVersion): QrVersionBlockPlan {
  const totalCodewords = Math.floor(unreservedModuleCount(version) / 8);
  const index = version - 1;
  const ecBytesPerBlock = EC_BYTES_PER_BLOCK_M[index];
  const blockCount = BLOCK_COUNT_M[index];
  const totalDataBytes = totalCodewords - blockCount * ecBytesPerBlock;
  const shortBlockDataBytes = Math.floor(totalDataBytes / blockCount);
  const longBlockCount = totalDataBytes % blockCount;
  const shortBlockCount = blockCount - longBlockCount;
  const byteLengthBits: 8 | 16 = version <= 9 ? 8 : 16;
  const maxBytePayload = Math.floor((totalDataBytes * 8 - 4 - byteLengthBits) / 8);

  return {
    version,
    totalCodewords,
    ecBytesPerBlock,
    blockCount,
    totalDataBytes,
    shortBlockDataBytes,
    shortBlockCount,
    longBlockCount,
    byteLengthBits,
    maxBytePayload,
  };
}

/** Selects the smallest QR version in 1..13 capable of encoding {@link byteLength} bytes at Level M. */
export function selectVersionForByteLength(byteLength: number): QrVersion {
  if (!Number.isInteger(byteLength) || byteLength < 0) {
    throw new TypeError(`QR payload byte length must be a non-negative integer, got ${byteLength}`);
  }
  for (let candidate = QR_MIN_VERSION; candidate <= QR_MAX_VERSION; candidate += 1) {
    const version = toQrVersion(candidate);
    if (byteLength <= blockPlanForVersion(version).maxBytePayload) {
      return version;
    }
  }
  throw new RangeError(
    `QR byte payload (${byteLength} bytes) exceeds Version ${QR_MAX_VERSION} Level M limit (${QR_MAX_BYTE_PAYLOAD_M} bytes).`,
  );
}

/** Polynomial long-division remainder in GF(2) for BCH error-correction headers. */
function computeBchRemainder(
  value: number,
  generator: number,
  generatorDegree: number,
): number {
  let remainder = value;
  for (let bit = 17; bit >= generatorDegree; bit -= 1) {
    if (((remainder >>> bit) & 1) !== 0) {
      remainder ^= generator << (bit - generatorDegree);
    }
  }
  return remainder;
}

const BCH_FORMAT_GENERATOR = 0x537;
const BCH_FORMAT_XOR_MASK = 0x5412;
const BCH_VERSION_GENERATOR = 0x1f25;

/**
 * Computes the 15-bit masked BCH(15,5) format word (generator 0x537, mask 0x5412).
 * Level M carries 2-bit EC indicator 0b00 per ISO/IEC 18004 Table 12.
 */
export function encodeFormatBits(
  _ec: QrErrorCorrection,
  mask: QrMaskId,
): number {
  const ecIndicator = 0b00;
  const payload5 = (ecIndicator << 3) | mask;
  const shifted = payload5 << 10;
  return (shifted | computeBchRemainder(shifted, BCH_FORMAT_GENERATOR, 10)) ^ BCH_FORMAT_XOR_MASK;
}

/** Computes the 18-bit BCH(18,6) version word (generator 0x1F25) for Versions 7..13. */
export function encodeVersionBits(version: QrVersion): number {
  if (version < 7) {
    throw new TypeError(`Version info bits only apply to QR versions >= 7, got ${version}`);
  }
  const shifted = version << 12;
  return shifted | computeBchRemainder(shifted, BCH_VERSION_GENERATOR, 12);
}
