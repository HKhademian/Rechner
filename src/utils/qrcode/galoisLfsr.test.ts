import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  packByteModeCodewords,
} from "#utils/qrcode/bitPacker";
import {
  buildGeneratorDivisor,
  computeReedSolomonParity,
  encodeAndInterleaveBlocks,
  gfMultiply,
} from "#utils/qrcode/galoisLfsr";
import {
  QR_MAX_VERSION,
  QR_MIN_VERSION,
  blockPlanForVersion,
  toQrVersion,
} from "#utils/qrcode/spec";

function evaluatePoly(coeffs: Uint8Array, x: number): number {
  let acc = 0;
  for (let i = 0; i < coeffs.length; i += 1) {
    acc = gfMultiply(acc, x) ^ coeffs[i];
  }
  return acc;
}

describe("GF(2^8) arithmetic and Reed–Solomon LFSR encoder", () => {
  it("satisfies finite-field multiplication axioms modulo 0x11D", () => {
    assert.equal(gfMultiply(0, 0xab), 0);
    assert.equal(gfMultiply(1, 0xab), 0xab);
    assert.equal(gfMultiply(2, 0x80), 0x1d);
    assert.equal(gfMultiply(0x53, 0xca), gfMultiply(0xca, 0x53));
    assert.equal(
      gfMultiply(0x57, 0x12 ^ 0x45),
      gfMultiply(0x57, 0x12) ^ gfMultiply(0x57, 0x45),
    );
  });

  it("produces zero algebraic syndromes across all generator roots for Versions 1..13", () => {
    for (let v = QR_MIN_VERSION; v <= QR_MAX_VERSION; v += 1) {
      const version = toQrVersion(v);
      const plan = blockPlanForVersion(version);
      const divisor = buildGeneratorDivisor(plan.ecBytesPerBlock);

      const sampleInput = new Uint8Array(plan.maxBytePayload);
      for (let i = 0; i < sampleInput.length; i += 1) {
        sampleInput[i] = (i * 37 + v * 13) & 0xff;
      }
      const dataCodewords = packByteModeCodewords(sampleInput, version);

      let offset = 0;
      for (let b = 0; b < plan.blockCount; b += 1) {
        const len = b < plan.shortBlockCount
          ? plan.shortBlockDataBytes
          : plan.shortBlockDataBytes + 1;
        const blockData = dataCodewords.subarray(offset, offset + len);
        offset += len;

        const parity = computeReedSolomonParity(blockData, divisor);
        const fullBlock = new Uint8Array(len + parity.length);
        fullBlock.set(blockData, 0);
        fullBlock.set(parity, len);

        let root = 1;
        for (let r = 0; r < plan.ecBytesPerBlock; r += 1) {
          assert.equal(
            evaluatePoly(fullBlock, root),
            0,
            `Non-zero RS syndrome at V${v} block ${b} root index ${r}`,
          );
          root = gfMultiply(root, 0x02);
        }
      }
    }
  });

  it("interleaves short and long data blocks followed by parity columns on V8 and V13", () => {
    for (const v of [8, 13]) {
      const version = toQrVersion(v);
      const plan = blockPlanForVersion(version);
      const data = new Uint8Array(plan.totalDataBytes);
      for (let i = 0; i < data.length; i += 1) {
        data[i] = (i + 1) & 0xff;
      }

      const interleaved = encodeAndInterleaveBlocks(data, version);
      assert.equal(interleaved.length, plan.totalCodewords);

      // Column 0 collects byte 0 of every block in sequence.
      let expectedOffset = 0;
      for (let b = 0; b < plan.blockCount; b += 1) {
        assert.equal(interleaved[b], data[expectedOffset]);
        const len = b < plan.shortBlockCount
          ? plan.shortBlockDataBytes
          : plan.shortBlockDataBytes + 1;
        expectedOffset += len;
      }

      // Final data columns only include long blocks (skipping short blocks).
      const tailDataStart = plan.totalDataBytes - plan.longBlockCount;
      for (let l = 0; l < plan.longBlockCount; l += 1) {
        const longBlockIndex = plan.shortBlockCount + l;
        let longEndOffset = 0;
        for (let b = 0; b <= longBlockIndex; b += 1) {
          longEndOffset += b < plan.shortBlockCount
            ? plan.shortBlockDataBytes
            : plan.shortBlockDataBytes + 1;
        }
        assert.equal(interleaved[tailDataStart + l], data[longEndOffset - 1]);
      }
    }
  });
});
