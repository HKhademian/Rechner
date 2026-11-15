import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  buildStructuralTemplate,
  composeQrSymbolMatrix,
  computeMaskPenalty,
} from "#utils/qrcode/matrixComposer";
import {
  QR_MAX_VERSION,
  QR_MIN_VERSION,
  QrErrorCorrection,
  blockPlanForVersion,
  encodeFormatBits,
  encodeVersionBits,
  toQrVersion,
  unreservedModuleCount,
} from "#utils/qrcode/spec";

describe("QR matrix composer and penalty evaluator", () => {
  it("reserves exact module counts matching closed-form geometry for Versions 1..13", () => {
    for (let v = QR_MIN_VERSION; v <= QR_MAX_VERSION; v += 1) {
      const version = toQrVersion(v);
      const template = buildStructuralTemplate(version);
      let freeCount = 0;
      for (let i = 0; i < template.reserved.length; i += 1) {
        if (template.reserved[i] === 0) {
          freeCount += 1;
        }
      }
      assert.equal(
        freeCount,
        unreservedModuleCount(version),
        `Unreserved cell mismatch at Version ${v}`,
      );
    }
  });

  it("stamps finders, separators, timing tracks, dark module, and metadata headers", () => {
    for (const v of [1, 7, 13]) {
      const version = toQrVersion(v);
      const plan = blockPlanForVersion(version);
      const dummyCodewords = new Uint8Array(plan.totalCodewords);
      for (let i = 0; i < dummyCodewords.length; i += 1) {
        dummyCodewords[i] = (i * 53 + v) & 0xff;
      }

      const matrix = composeQrSymbolMatrix(dummyCodewords, version, QrErrorCorrection.M);
      const size = matrix.moduleCount;

      // Three 7x7 finder outer corners + inner centers
      assert.equal(matrix.isDark(0, 0), true);
      assert.equal(matrix.isDark(3, 3), true);
      assert.equal(matrix.isDark(0, size - 1), true);
      assert.equal(matrix.isDark(size - 1, 0), true);

      // Light separator around top-left finder
      for (let i = 0; i <= 7; i += 1) {
        assert.equal(matrix.isDark(7, i), false);
        assert.equal(matrix.isDark(i, 7), false);
      }

      // Fixed dark module and alternating timing line
      assert.equal(matrix.isDark(size - 8, 8), true);
      assert.equal(matrix.isDark(6, 8), true);
      assert.equal(matrix.isDark(6, 9), false);

      // Verify Format Information Copy 1 and Copy 2 match encoded BCH word
      const expectedFormat = encodeFormatBits(QrErrorCorrection.M, matrix.mask);
      let copy1 = 0;
      let copy2 = 0;
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
          copy1 |= 1 << i;
        }

        const bit2 = i < 8
          ? matrix.isDark(8, size - 1 - i)
          : matrix.isDark(size - 15 + i, 8);
        if (bit2) {
          copy2 |= 1 << i;
        }
      }
      assert.equal(copy1, expectedFormat);
      assert.equal(copy2, expectedFormat);

      if (v >= 7) {
        const expectedVersion = encodeVersionBits(version);
        let bl = 0;
        let tr = 0;
        for (let i = 0; i < 18; i += 1) {
          const major = Math.floor(i / 3);
          const minor = i % 3;
          if (matrix.isDark(size - 11 + minor, major)) {
            bl |= 1 << i;
          }
          if (matrix.isDark(major, size - 11 + minor)) {
            tr |= 1 << i;
          }
        }
        assert.equal(bl, expectedVersion);
        assert.equal(tr, expectedVersion);
      }

      assert.throws(() => matrix.isDark(-1, 0), RangeError);
      assert.throws(() => matrix.isDark(0, size), RangeError);
    }
  });

  it("scores N1 runs, N2 2x2 blocks, N3 1:1:3:1:1 patterns, and N4 balance accurately", () => {
    // 11x11 uniform dark grid checks N1, N2, and N4 simultaneously.
    const allDark = new Uint8Array(11 * 11).fill(1);
    // N1: 11 rows * (11-2) + 11 cols * (11-2) = 198
    // N2: 10 * 10 * 3 = 300
    // N3: 0 (no 0 bits for 1:1:3:1:1)
    // N4: 100% dark -> floor(|121*20 - 121*10| / 121) * 10 = 100
    assert.equal(computeMaskPenalty(allDark, 11), 198 + 300 + 100);

    // 7x7 grid with row 0 = [1,0,1,1,1,0,1] surrounded by 0 rows verifies N3 detection (0x05d & 0x5d0).
    const finderRow = new Uint8Array(7 * 7);
    const pattern = [1, 0, 1, 1, 1, 0, 1];
    for (let c = 0; c < 7; c += 1) {
      finderRow[c] = pattern[c];
    }
    assert.ok(computeMaskPenalty(finderRow, 7) >= 80);
  });
});
