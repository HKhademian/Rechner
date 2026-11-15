import {
  type QrVersion,
  QR_BYTE_MODE_INDICATOR,
  blockPlanForVersion,
} from "#utils/qrcode/spec";

const PAD_CODEWORD_EVEN = 0xec;
const PAD_CODEWORD_ODD = 0x11;

/**
 * Frames raw bytes into an ISO/IEC 18004 8-bit Byte-mode data codeword sequence:
 * 4-bit mode (0100) + 8/16-bit byte count + payload + clipped 0000 terminator + 0xEC/0x11 padding.
 */
export function packByteModeCodewords(
  bytes: Uint8Array,
  version: QrVersion,
): Uint8Array {
  const plan = blockPlanForVersion(version);
  if (bytes.length > plan.maxBytePayload) {
    throw new RangeError(
      `Payload length (${bytes.length} bytes) exceeds Version ${version} Level M capacity (${plan.maxBytePayload} bytes).`,
    );
  }

  const out = new Uint8Array(plan.totalDataBytes);
  const totalBits = plan.totalDataBytes * 8;
  let bitCursor = 0;

  const appendBits = (value: number, width: number): void => {
    for (let shift = width - 1; shift >= 0; shift -= 1) {
      if (((value >>> shift) & 1) !== 0) {
        out[bitCursor >>> 3] |= 0x80 >>> (bitCursor & 7);
      }
      bitCursor += 1;
    }
  };

  appendBits(QR_BYTE_MODE_INDICATOR, 4);
  appendBits(bytes.length, plan.byteLengthBits);
  for (let i = 0; i < bytes.length; i += 1) {
    appendBits(bytes[i], 8);
  }

  // Zero-initialized trailing bits absorb up to 4 terminator bits and byte alignment.
  bitCursor = Math.min(totalBits, bitCursor + 4);
  bitCursor = (bitCursor + 7) & ~7;

  let padIndex = bitCursor >>> 3;
  let useOddPad = false;
  while (padIndex < plan.totalDataBytes) {
    out[padIndex] = useOddPad ? PAD_CODEWORD_ODD : PAD_CODEWORD_EVEN;
    useOddPad = !useOddPad;
    padIndex += 1;
  }

  return out;
}
