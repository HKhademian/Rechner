import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  packByteModeCodewords,
} from "#utils/qrcode/bitPacker";
import {
  toQrVersion,
} from "#utils/qrcode/spec";

describe("QR Byte-mode bitstream packer", () => {
  it("frames a single ASCII byte in Version 1 with 0000 terminator and alternating padding", () => {
    const packed = packByteModeCodewords(new Uint8Array([0x41]), toQrVersion(1));
    assert.equal(packed.length, 16);
    assert.deepEqual(
      Array.from(packed.slice(0, 8)),
      [0x40, 0x14, 0x10, 0xec, 0x11, 0xec, 0x11, 0xec],
    );
  });

  it("fits exact Version 1 capacity (14 bytes) with zero pad codewords", () => {
    const payload = new Uint8Array(14).fill(0x5a);
    const packed = packByteModeCodewords(payload, toQrVersion(1));
    assert.equal(packed.length, 16);
    assert.equal(packed[0], 0x40);
    assert.equal(packed[1], 0xe5);
    assert.equal(packed[15], 0xa0);
  });

  it("uses 16-bit byte length header from Version 10 onward and fills Version 13 exact 331-byte cap", () => {
    const v10Bytes = new Uint8Array(181).fill(0x33);
    const v10Packed = packByteModeCodewords(v10Bytes, toQrVersion(10));
    assert.equal(v10Packed[0], 0x40);
    assert.equal(v10Packed[1], 0x0b);
    assert.equal(v10Packed[2], 0x53);

    const v13Bytes = new Uint8Array(331).fill(0x7e);
    const v13Packed = packByteModeCodewords(v13Bytes, toQrVersion(13));
    assert.equal(v13Packed.length, 334);
    // 0b0100 (mode) + 0x014b (331 in 16 bits): nibbles 4, 0, 1, 4, b
    assert.equal(v13Packed[0], 0x40);
    assert.equal(v13Packed[1], 0x14);
    assert.equal(v13Packed[2], 0xb7);
    assert.equal(v13Packed[333], 0xe0);
  });

  it("throws RangeError when payload exceeds version capacity", () => {
    assert.throws(
      () => packByteModeCodewords(new Uint8Array(15), toQrVersion(1)),
      RangeError,
    );
  });
});
