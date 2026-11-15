import {
  type QrVersion,
  blockPlanForVersion,
} from "#utils/qrcode/spec";

const GF256_REDUCTION_POLY = 0x11d;
const GF256_GENERATOR_ALPHA = 0x02;

/**
 * Multiplies two bytes in GF(2^8) modulo primitive polynomial 0x11D (x^8 + x^4 + x^3 + x^2 + 1)
 * using bitwise carryless shift-and-XOR with zero lookup tables.
 */
export function gfMultiply(a: number, b: number): number {
  let product = 0;
  for (let bit = 7; bit >= 0; bit -= 1) {
    product = (product << 1) ^ ((product >>> 7) * GF256_REDUCTION_POLY);
    product ^= ((b >>> bit) & 1) * a;
  }
  return product;
}

/**
 * Constructs the non-leading coefficients of the Reed–Solomon generator polynomial
 * product_{i=0..degree-1}(x + alpha^i) over GF(2^8).
 */
export function buildGeneratorDivisor(degree: number): Uint8Array {
  if (!Number.isInteger(degree) || degree < 1 || degree > 255) {
    throw new TypeError(`Reed–Solomon generator degree must be 1..255, got ${degree}`);
  }
  const coeffs = new Uint8Array(degree + 1);
  coeffs[0] = 1;
  let root = 1;
  for (let i = 0; i < degree; i += 1) {
    for (let j = i + 1; j >= 1; j -= 1) {
      coeffs[j] ^= gfMultiply(coeffs[j - 1], root);
    }
    root = gfMultiply(root, GF256_GENERATOR_ALPHA);
  }
  return coeffs.slice(1);
}

/**
 * Computes Reed–Solomon error-correction parity bytes for {@link data} via a linear feedback
 * shift register over {@link divisor}.
 */
export function computeReedSolomonParity(
  data: Uint8Array,
  divisor: Uint8Array,
): Uint8Array {
  const parity = new Uint8Array(divisor.length);
  for (let i = 0; i < data.length; i += 1) {
    const feedback = data[i] ^ parity[0];
    parity.copyWithin(0, 1);
    parity[parity.length - 1] = 0;
    for (let j = 0; j < divisor.length; j += 1) {
      parity[j] ^= gfMultiply(divisor[j], feedback);
    }
  }
  return parity;
}

/**
 * Splits {@link dataCodewords} into ISO/IEC 18004 Level M Reed–Solomon blocks, computes LFSR
 * parity bytes for each block, and interleaves data then parity bytes across blocks.
 */
export function encodeAndInterleaveBlocks(
  dataCodewords: Uint8Array,
  version: QrVersion,
): Uint8Array {
  const plan = blockPlanForVersion(version);
  if (dataCodewords.length !== plan.totalDataBytes) {
    throw new RangeError(
      `Expected ${plan.totalDataBytes} data codewords for Version ${version}, got ${dataCodewords.length}.`,
    );
  }

  const divisor = buildGeneratorDivisor(plan.ecBytesPerBlock);
  const dataBlocks: Uint8Array[] = [];
  const ecBlocks: Uint8Array[] = [];

  let offset = 0;
  for (let b = 0; b < plan.blockCount; b += 1) {
    const blockDataLen = b < plan.shortBlockCount
      ? plan.shortBlockDataBytes
      : plan.shortBlockDataBytes + 1;
    const blockData = dataCodewords.subarray(offset, offset + blockDataLen);
    offset += blockDataLen;
    dataBlocks.push(blockData);
    ecBlocks.push(computeReedSolomonParity(blockData, divisor));
  }

  const out = new Uint8Array(plan.totalCodewords);
  let cursor = 0;
  const maxDataLen = plan.shortBlockDataBytes + (plan.longBlockCount > 0 ? 1 : 0);

  for (let col = 0; col < maxDataLen; col += 1) {
    for (let b = 0; b < plan.blockCount; b += 1) {
      const block = dataBlocks[b];
      if (col < block.length) {
        out[cursor] = block[col];
        cursor += 1;
      }
    }
  }

  for (let col = 0; col < plan.ecBytesPerBlock; col += 1) {
    for (let b = 0; b < plan.blockCount; b += 1) {
      out[cursor] = ecBlocks[b][col];
      cursor += 1;
    }
  }

  return out;
}
