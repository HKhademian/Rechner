import {
  type QrModuleScale,
  type QrQuietZone,
  toQrModuleScale,
  toQrQuietZone,
} from "#utils/qrcode/spec";

export {
  type QrModuleScale,
  type QrQuietZone,
  toQrModuleScale,
  toQrQuietZone,
};

/** Minimal 2D canvas drawing context required to rasterize QR symbol matrices. */
export interface QrCanvasContext2D {
  fillStyle: string;
  fillRect(
    x: number,
    y: number,
    width: number,
    height: number,
  ): void;
}

/** Target canvas surface supporting both DOM HTMLCanvasElement and headless test doubles. */
export interface QrCanvasTarget {
  width: number;
  height: number;
  getContext(contextId: "2d"): CanvasRenderingContext2D | QrCanvasContext2D | null;
}

/** Minimal QR matrix surface accepted by {@link paintQrSymbolToCanvas}. */
export interface QrMatrixSource {
  readonly moduleCount: number;
  isDark(row: number, col: number): boolean;
}

/** Rasterization styling and scale options for {@link paintQrSymbolToCanvas}. */
export interface QrCanvasPaintOptions {
  readonly scale: QrModuleScale;
  readonly quietZone?: QrQuietZone;
  readonly lightColor: string;
  readonly darkColor: string;
}

/** Resulting pixel and module dimensions produced by {@link paintQrSymbolToCanvas}. */
export interface QrCanvasPaintMetrics {
  readonly moduleCount: number;
  readonly quietZone: QrQuietZone;
  readonly totalModules: number;
  readonly pixelSize: number;
}

const DEFAULT_QUIET_ZONE = toQrQuietZone(4);

/**
 * Resizes {@link canvas} to include the quiet zone and paints all modules of {@link matrix}.
 */
export function paintQrSymbolToCanvas(
  canvas: QrCanvasTarget,
  matrix: QrMatrixSource,
  options: QrCanvasPaintOptions,
): QrCanvasPaintMetrics {
  const quietZone = options.quietZone ?? DEFAULT_QUIET_ZONE;
  const totalModules = matrix.moduleCount + quietZone * 2;
  const pixelSize = totalModules * options.scale;

  canvas.width = pixelSize;
  canvas.height = pixelSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return {
      moduleCount: matrix.moduleCount,
      quietZone,
      totalModules,
      pixelSize,
    };
  }

  ctx.fillStyle = options.lightColor;
  ctx.fillRect(0, 0, pixelSize, pixelSize);
  ctx.fillStyle = options.darkColor;

  for (let row = 0; row < matrix.moduleCount; row += 1) {
    for (let col = 0; col < matrix.moduleCount; col += 1) {
      if (matrix.isDark(row, col)) {
        ctx.fillRect(
          (col + quietZone) * options.scale,
          (row + quietZone) * options.scale,
          options.scale,
          options.scale,
        );
      }
    }
  }

  return {
    moduleCount: matrix.moduleCount,
    quietZone,
    totalModules,
    pixelSize,
  };
}
