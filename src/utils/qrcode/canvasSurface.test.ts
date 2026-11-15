import assert from "node:assert/strict";
import {
  describe,
  it,
} from "node:test";
import {
  encodeQrUtf8,
} from "#utils/qrcode";
import {
  type QrCanvasContext2D,
  type QrCanvasTarget,
  paintQrSymbolToCanvas,
  toQrModuleScale,
  toQrQuietZone,
} from "#utils/qrcode/canvasSurface";

interface RecordedFillRect {
  readonly color: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

function createFakeCanvas(withContext: boolean): {
  readonly canvas: QrCanvasTarget;
  readonly ops: RecordedFillRect[];
} {
  const ops: RecordedFillRect[] = [];
  const ctx: QrCanvasContext2D = {
    fillStyle: "",
    fillRect(x: number, y: number, width: number, height: number): void {
      ops.push({
        color: ctx.fillStyle,
        x,
        y,
        width,
        height,
      });
    },
  };
  const canvas: QrCanvasTarget = {
    width: 0,
    height: 0,
    getContext(): QrCanvasContext2D | null {
      return withContext ? ctx : null;
    },
  };
  return {
    canvas,
    ops,
  };
}

describe("QR 2D canvas surface painter", () => {
  it("resizes canvas with quiet zone and paints dark modules accurately", () => {
    const matrix = encodeQrUtf8("BCD\n002\n1\nSCT");
    const {
      canvas,
      ops,
    } = createFakeCanvas(true);

    const metrics = paintQrSymbolToCanvas(canvas, matrix, {
      scale: toQrModuleScale(10),
      lightColor: "#ffffff",
      darkColor: "#0f172a",
    });

    assert.equal(metrics.moduleCount, matrix.moduleCount);
    assert.equal(metrics.quietZone, 4);
    assert.equal(metrics.totalModules, matrix.moduleCount + 8);
    assert.equal(metrics.pixelSize, (matrix.moduleCount + 8) * 10);
    assert.equal(canvas.width, metrics.pixelSize);
    assert.equal(canvas.height, metrics.pixelSize);

    assert.deepEqual(ops[0], {
      color: "#ffffff",
      x: 0,
      y: 0,
      width: metrics.pixelSize,
      height: metrics.pixelSize,
    });

    let darkCount = 0;
    for (let r = 0; r < matrix.moduleCount; r += 1) {
      for (let c = 0; c < matrix.moduleCount; c += 1) {
        if (matrix.isDark(r, c)) {
          darkCount += 1;
        }
      }
    }
    assert.equal(ops.length, 1 + darkCount);

    // Top-left finder module (0, 0) must be offset by quiet zone * scale (40, 40)
    assert.deepEqual(ops[1], {
      color: "#0f172a",
      x: 40,
      y: 40,
      width: 10,
      height: 10,
    });
  });

  it("supports custom quiet zones and returns metrics safely when 2D context is unavailable", () => {
    const matrix = encodeQrUtf8("DE89370400440532013000");
    const {
      canvas,
      ops,
    } = createFakeCanvas(false);

    const metrics = paintQrSymbolToCanvas(canvas, matrix, {
      scale: toQrModuleScale(8),
      quietZone: toQrQuietZone(2),
      lightColor: "#ffffff",
      darkColor: "#0f172a",
    });

    assert.equal(metrics.totalModules, matrix.moduleCount + 4);
    assert.equal(metrics.pixelSize, (matrix.moduleCount + 4) * 8);
    assert.equal(canvas.width, metrics.pixelSize);
    assert.equal(ops.length, 0);
  });
});
