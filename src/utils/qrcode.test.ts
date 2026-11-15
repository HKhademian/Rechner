import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  type QrSymbolMatrix,
  QR_MAX_BYTE_PAYLOAD_M,
  QrErrorCorrection,
  encodeQrBytes,
  encodeQrUtf8,
  toQrVersion,
} from "#utils/qrcode";
import {
  gfMultiply,
} from "#utils/qrcode/galoisLfsr";
import {
  buildStructuralTemplate,
  shouldInvertModule,
} from "#utils/qrcode/matrixComposer";
import {
  QR_BYTE_MODE_INDICATOR,
  blockPlanForVersion,
  toQrMaskId,
} from "#utils/qrcode/spec";

function bchSyndrome(
  value: number,
  generator: number,
  degree: number,
): number {
  let rem = value;
  for (let bit = 17; bit >= degree; bit -= 1) {
    if (((rem >>> bit) & 1) !== 0) {
      rem ^= generator << (bit - degree);
    }
  }
  return rem;
}

function evaluatePoly(coeffs: Uint8Array, x: number): number {
  let acc = 0;
  for (let i = 0; i < coeffs.length; i += 1) {
    acc = gfMultiply(acc, x) ^ coeffs[i];
  }
  return acc;
}

function decodeCleanroomQrMatrixToUtf8(matrix: QrSymbolMatrix): string {
  const size = matrix.moduleCount;
  let formatCopy1 = 0;
  let formatCopy2 = 0;
  for (let i = 0; i < 15; i += 1) {
    const bit1 = i < 6
      ? matrix.isDark(i, 8)
      : i === 6
        ? matrix.isDark(7, 8)
        : i === 7
          ? matrix.isDark(8, 8)
          : i === 8
            ? matrix.isDark(8, 7)
            : matrix.isDark(8, 14 - i);
    if (bit1) {
      formatCopy1 |= 1 << i;
    }

    const bit2 = i < 8
      ? matrix.isDark(8, size - 1 - i)
      : matrix.isDark(size - 15 + i, 8);
    if (bit2) {
      formatCopy2 |= 1 << i;
    }
  }
  assert.equal(formatCopy1, formatCopy2);
  const unmaskedFormat = formatCopy1 ^ 0x5412;
  assert.equal(bchSyndrome(unmaskedFormat, 0x537, 10), 0);

  const formatData5 = unmaskedFormat >>> 10;
  const ecBits = (formatData5 >>> 3) & 0b11;
  assert.equal(ecBits, 0b00, "Expected Level M indicator (0b00)");
  const mask = toQrMaskId(formatData5 & 0b111);

  if (matrix.version >= 7) {
    let versionBitsBl = 0;
    let versionBitsTr = 0;
    for (let i = 0; i < 18; i += 1) {
      const major = Math.floor(i / 3);
      const minor = i % 3;
      if (matrix.isDark(size - 11 + minor, major)) {
        versionBitsBl |= 1 << i;
      }
      if (matrix.isDark(major, size - 11 + minor)) {
        versionBitsTr |= 1 << i;
      }
    }
    assert.equal(versionBitsBl, versionBitsTr);
    assert.equal(bchSyndrome(versionBitsBl, 0x1f25, 12), 0);
    assert.equal(versionBitsBl >>> 12, matrix.version);
  }

  const template = buildStructuralTemplate(matrix.version);
  const plan = blockPlanForVersion(matrix.version);
  const rawCodewords = new Uint8Array(plan.totalCodewords);
  let bitCursor = 0;
  let goingUp = true;

  for (let rightCol = size - 1; rightCol > 0; rightCol -= 2) {
    if (rightCol === 6) {
      rightCol -= 1;
    }
    for (let step = 0; step < size; step += 1) {
      const row = goingUp ? size - 1 - step : step;
      for (let offset = 0; offset < 2; offset += 1) {
        const col = rightCol - offset;
        if (template.reserved[row * size + col] !== 0) {
          continue;
        }
        if (bitCursor < plan.totalCodewords * 8) {
          const inverted = shouldInvertModule(mask, row, col);
          const bit = matrix.isDark(row, col) !== inverted ? 1 : 0;
          if (bit === 1) {
            rawCodewords[bitCursor >>> 3] |= 0x80 >>> (bitCursor & 7);
          }
        }
        bitCursor += 1;
      }
    }
    goingUp = !goingUp;
  }

  // De-interleave data and EC blocks and prove zero Reed–Solomon syndromes
  const blocks: Uint8Array[] = [];
  for (let b = 0; b < plan.blockCount; b += 1) {
    const dataLen = b < plan.shortBlockCount
      ? plan.shortBlockDataBytes
      : plan.shortBlockDataBytes + 1;
    blocks.push(new Uint8Array(dataLen + plan.ecBytesPerBlock));
  }

  let cursor = 0;
  const maxDataLen = plan.shortBlockDataBytes + (plan.longBlockCount > 0 ? 1 : 0);
  for (let col = 0; col < maxDataLen; col += 1) {
    for (let b = 0; b < plan.blockCount; b += 1) {
      const dataLen = blocks[b].length - plan.ecBytesPerBlock;
      if (col < dataLen) {
        blocks[b][col] = rawCodewords[cursor];
        cursor += 1;
      }
    }
  }
  for (let col = 0; col < plan.ecBytesPerBlock; col += 1) {
    for (let b = 0; b < plan.blockCount; b += 1) {
      const dataLen = blocks[b].length - plan.ecBytesPerBlock;
      blocks[b][dataLen + col] = rawCodewords[cursor];
      cursor += 1;
    }
  }

  const dataStream = new Uint8Array(plan.totalDataBytes);
  let dataOffset = 0;
  for (let b = 0; b < plan.blockCount; b += 1) {
    let root = 1;
    for (let r = 0; r < plan.ecBytesPerBlock; r += 1) {
      assert.equal(evaluatePoly(blocks[b], root), 0);
      root = gfMultiply(root, 0x02);
    }
    const dataLen = blocks[b].length - plan.ecBytesPerBlock;
    dataStream.set(blocks[b].subarray(0, dataLen), dataOffset);
    dataOffset += dataLen;
  }

  let readBit = 0;
  const readBits = (width: number): number => {
    let value = 0;
    for (let i = 0; i < width; i += 1) {
      const bit = (dataStream[readBit >>> 3] >>> (7 - (readBit & 7))) & 1;
      value = (value << 1) | bit;
      readBit += 1;
    }
    return value;
  };

  assert.equal(readBits(4), QR_BYTE_MODE_INDICATOR);
  const byteLength = readBits(plan.byteLengthBits);
  const decodedBytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i += 1) {
    decodedBytes[i] = readBits(8);
  }
  const terminatorWidth = Math.min(4, plan.totalDataBytes * 8 - readBit);
  assert.equal(readBits(terminatorWidth), 0);

  return new TextDecoder("utf-8", { fatal: true }).decode(decodedBytes);
}

describe("Standalone #utils/qrcode encoder round-trip specification verification", () => {
  it("round-trips empty, ASCII, German UTF-8, version boundaries, and 331-byte maximum payloads", () => {
    const cases: readonly { readonly text: string;
      readonly expectedVersion: number }[] = [
      {
        text: "",
        expectedVersion: 1,
      },
      {
        text: "BCD",
        expectedVersion: 1,
      },
      {
        text: "Bäcker Müller & Söhne — 125,50 €",
        expectedVersion: 3,
      },
      {
        text: "A".repeat(106),
        expectedVersion: 6,
      },
      {
        text: "A".repeat(107),
        expectedVersion: 7,
      },
      {
        text: "B".repeat(180),
        expectedVersion: 9,
      },
      {
        text: "B".repeat(181),
        expectedVersion: 10,
      },
      {
        text: `BCD\n002\n1\nSCT\nCOBADEFFXXX\n${"Ä".repeat(2)}cker\nDE89370400440532013000\nEUR125.50\nCHAR\n\n`.padEnd(QR_MAX_BYTE_PAYLOAD_M - 2, "X"),
        expectedVersion: 13,
      },
    ];

    for (const sample of cases) {
      const matrix = encodeQrUtf8(sample.text, { errorCorrection: QrErrorCorrection.M });
      assert.equal(matrix.version, toQrVersion(sample.expectedVersion));
      assert.equal(matrix.moduleCount, 4 * sample.expectedVersion + 17);
      assert.equal(decodeCleanroomQrMatrixToUtf8(matrix), sample.text);
    }
  });

  it("rejects payloads exceeding 331 bytes and invalid error correction values", () => {
    assert.throws(
      () => encodeQrBytes(new Uint8Array(QR_MAX_BYTE_PAYLOAD_M + 1)),
      RangeError,
    );
    assert.throws(
      () => encodeQrUtf8("ü".repeat(166)),
      RangeError,
    );
    assert.throws(
      () => encodeQrUtf8("test", { errorCorrection: "H" as QrErrorCorrection }),
      TypeError,
    );
  });
});
