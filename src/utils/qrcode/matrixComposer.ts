import {
  type QrErrorCorrection,
  type QrGridSize,
  type QrVersion,
  ALL_QR_MASK_IDS,
  alignmentTracksForVersion,
  encodeFormatBits,
  encodeVersionBits,
  gridSizeForVersion,
  QrMaskId,
} from "#utils/qrcode/spec";

/** Immutable QR Code symbol matrix produced by {@link composeQrSymbolMatrix}. */
export interface QrSymbolMatrix {
  readonly version: QrVersion;
  readonly size: QrGridSize;
  readonly moduleCount: number;
  readonly mask: QrMaskId;
  isDark(row: number, col: number): boolean;
}

/** Flat two-plane structural grid containing fixed function patterns and reservation flags. */
export interface QrStructuralTemplate {
  readonly size: QrGridSize;
  readonly reserved: Uint8Array;
  readonly modules: Uint8Array;
}

/** ISO/IEC 18004 Table 10 mask polarity predicate for unreserved data/EC cells. */
export function shouldInvertModule(
  mask: QrMaskId,
  row: number,
  col: number,
): boolean {
  switch (mask) {
    case 0:
      return (row + col) % 2 === 0;
    case 1:
      return row % 2 === 0;
    case 2:
      return col % 3 === 0;
    case 3:
      return (row + col) % 3 === 0;
    case 4:
      return (Math.floor(row / 2) + Math.floor(col / 3)) % 2 === 0;
    case 5:
      return ((row * col) % 2) + ((row * col) % 3) === 0;
    case 6:
      return (((row * col) % 2) + ((row * col) % 3)) % 2 === 0;
    case 7:
      return (((row + col) % 2) + ((row * col) % 3)) % 2 === 0;
  }
}

function setCell(
  reserved: Uint8Array,
  modules: Uint8Array,
  size: number,
  row: number,
  col: number,
  dark: boolean,
): void {
  const index = row * size + col;
  reserved[index] = 1;
  modules[index] = dark ? 1 : 0;
}

function stampFinderWithSeparator(
  reserved: Uint8Array,
  modules: Uint8Array,
  size: number,
  topRow: number,
  leftCol: number,
): void {
  for (let dr = -1; dr <= 7; dr += 1) {
    const row = topRow + dr;
    if (row < 0 || row >= size) {
      continue;
    }
    for (let dc = -1; dc <= 7; dc += 1) {
      const col = leftCol + dc;
      if (col < 0 || col >= size) {
        continue;
      }
      const dist = Math.max(Math.abs(dr - 3), Math.abs(dc - 3));
      setCell(reserved, modules, size, row, col, dist !== 2 && dist !== 4);
    }
  }
}

function stampAlignmentSquares(
  reserved: Uint8Array,
  modules: Uint8Array,
  size: number,
  version: QrVersion,
): void {
  const tracks = alignmentTracksForVersion(version);
  for (const rowCenter of tracks) {
    for (const colCenter of tracks) {
      const overlapsFinder =
        (rowCenter === 6 && colCenter === 6) ||
        (rowCenter === 6 && colCenter === size - 7) ||
        (rowCenter === size - 7 && colCenter === 6);
      if (overlapsFinder) {
        continue;
      }
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          const dist = Math.max(Math.abs(dr), Math.abs(dc));
          setCell(reserved, modules, size, rowCenter + dr, colCenter + dc, dist !== 1);
        }
      }
    }
  }
}

function reserveFormatAndVersionSlots(
  reserved: Uint8Array,
  size: number,
  version: QrVersion,
): void {
  for (let i = 0; i <= 8; i += 1) {
    if (i !== 6) {
      reserved[i * size + 8] = 1;
      reserved[8 * size + i] = 1;
    }
  }
  for (let i = 0; i < 8; i += 1) {
    reserved[8 * size + (size - 1 - i)] = 1;
  }
  for (let i = 0; i < 7; i += 1) {
    reserved[(size - 1 - i) * size + 8] = 1;
  }

  if (version >= 7) {
    for (let a = 0; a < 6; a += 1) {
      for (let b = 0; b < 3; b += 1) {
        reserved[(size - 11 + b) * size + a] = 1;
        reserved[a * size + (size - 11 + b)] = 1;
      }
    }
  }
}

/**
 * Constructs a reusable structural grid containing finders, separators, alignment patterns,
 * timing lines, dark module, and reserved format/version metadata slots.
 */
export function buildStructuralTemplate(version: QrVersion): QrStructuralTemplate {
  const size = gridSizeForVersion(version);
  const cellCount = size * size;
  const reserved = new Uint8Array(cellCount);
  const modules = new Uint8Array(cellCount);

  stampFinderWithSeparator(reserved, modules, size, 0, 0);
  stampFinderWithSeparator(reserved, modules, size, 0, size - 7);
  stampFinderWithSeparator(reserved, modules, size, size - 7, 0);
  stampAlignmentSquares(reserved, modules, size, version);

  for (let i = 8; i <= size - 9; i += 1) {
    const dark = i % 2 === 0;
    if (reserved[6 * size + i] === 0) {
      setCell(reserved, modules, size, 6, i, dark);
    }
    if (reserved[i * size + 6] === 0) {
      setCell(reserved, modules, size, i, 6, dark);
    }
  }

  setCell(reserved, modules, size, size - 8, 8, true);
  reserveFormatAndVersionSlots(reserved, size, version);

  return {
    size,
    reserved,
    modules,
  };
}

function stampMetadataBits(
  modules: Uint8Array,
  size: number,
  version: QrVersion,
  ec: QrErrorCorrection,
  mask: QrMaskId,
): void {
  const formatBits = encodeFormatBits(ec, mask);
  for (let i = 0; i < 15; i += 1) {
    const bit = (formatBits >>> i) & 1;

    // Copy 1 around top-left finder
    if (i < 6) {
      modules[i * size + 8] = bit;
    }
    else if (i === 6) {
      modules[7 * size + 8] = bit;
    }
    else if (i === 7) {
      modules[8 * size + 8] = bit;
    }
    else if (i === 8) {
      modules[8 * size + 7] = bit;
    }
    else {
      modules[8 * size + (14 - i)] = bit;
    }

    // Copy 2 across top-right and bottom-left finders
    if (i < 8) {
      modules[8 * size + (size - 1 - i)] = bit;
    }
    else {
      modules[(size - 15 + i) * size + 8] = bit;
    }
  }

  if (version >= 7) {
    const versionBits = encodeVersionBits(version);
    for (let i = 0; i < 18; i += 1) {
      const bit = (versionBits >>> i) & 1;
      const major = Math.floor(i / 3);
      const minor = i % 3;
      modules[(size - 11 + minor) * size + major] = bit;
      modules[major * size + (size - 11 + minor)] = bit;
    }
  }
}

function writeBoustrophedonPayload(
  modules: Uint8Array,
  reserved: Uint8Array,
  size: number,
  codewords: Uint8Array,
  mask: QrMaskId,
): void {
  const totalPayloadBits = codewords.length * 8;
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
        const idx = row * size + col;
        if (reserved[idx] !== 0) {
          continue;
        }
        let bit = bitCursor < totalPayloadBits
          ? (codewords[bitCursor >>> 3] >>> (7 - (bitCursor & 7))) & 1
          : 0;
        bitCursor += 1;
        if (shouldInvertModule(mask, row, col)) {
          bit ^= 1;
        }
        modules[idx] = bit;
      }
    }
    goingUp = !goingUp;
  }
}

function scoreLineRunsAndFinderPatterns(
  modules: Uint8Array,
  size: number,
  readAlongAxis: boolean,
): number {
  let score = 0;
  for (let outer = 0; outer < size; outer += 1) {
    let runColor = -1;
    let runLength = 0;
    let window11 = 0;

    for (let inner = 0; inner < size + 4; inner += 1) {
      const cell = inner < size
        ? modules[readAlongAxis ? outer * size + inner : inner * size + outer]
        : 0;

      if (inner < size) {
        if (cell === runColor) {
          runLength += 1;
        }
        else {
          if (runLength >= 5) {
            score += runLength - 2;
          }
          runColor = cell;
          runLength = 1;
        }
      }

      window11 = ((window11 << 1) & 0x7ff) | cell;
      if (inner >= 6 && (window11 === 0x05d || window11 === 0x5d0)) {
        score += 40;
      }
    }

    if (runLength >= 5) {
      score += runLength - 2;
    }
  }
  return score;
}

/** Computes the ISO/IEC 18004 N1–N4 penalty score for a candidate symbol plane. */
export function computeMaskPenalty(
  modules: Uint8Array,
  size: number,
): number {
  let penalty =
    scoreLineRunsAndFinderPatterns(modules, size, true) +
    scoreLineRunsAndFinderPatterns(modules, size, false);

  let darkCount = 0;
  for (let row = 0; row < size; row += 1) {
    const rowOffset = row * size;
    for (let col = 0; col < size; col += 1) {
      const cell = modules[rowOffset + col];
      darkCount += cell;
      if (row + 1 < size && col + 1 < size) {
        const sum2x2 =
          cell +
          modules[rowOffset + col + 1] +
          modules[(row + 1) * size + col] +
          modules[(row + 1) * size + col + 1];
        if (sum2x2 === 0 || sum2x2 === 4) {
          penalty += 3;
        }
      }
    }
  }

  const totalCells = size * size;
  penalty += Math.floor(Math.abs(darkCount * 20 - totalCells * 10) / totalCells) * 10;
  return penalty;
}

/**
 * Composes an immutable QR Code symbol matrix by placing interleaved codewords across a shared
 * structural template, evaluating all 8 masks, and writing BCH metadata for the optimal mask.
 */
export function composeQrSymbolMatrix(
  codewords: Uint8Array,
  version: QrVersion,
  ec: QrErrorCorrection,
): QrSymbolMatrix {
  const template = buildStructuralTemplate(version);
  const {
    size,
    reserved,
    modules: baseModules,
  } = template;

  let bestMask: QrMaskId = QrMaskId.Mask0;
  let bestModules = new Uint8Array(0);
  let bestPenalty = Number.POSITIVE_INFINITY;

  for (const mask of ALL_QR_MASK_IDS) {
    const candidate = baseModules.slice();
    writeBoustrophedonPayload(candidate, reserved, size, codewords, mask);
    stampMetadataBits(candidate, size, version, ec, mask);
    const penalty = computeMaskPenalty(candidate, size);
    if (penalty < bestPenalty) {
      bestPenalty = penalty;
      bestMask = mask;
      bestModules = candidate;
    }
  }

  const finalModules = bestModules;
  const finalMask = bestMask;

  return {
    version,
    size,
    moduleCount: size,
    mask: finalMask,
    isDark(row: number, col: number): boolean {
      if (!Number.isInteger(row) || !Number.isInteger(col) || row < 0 || row >= size || col < 0 || col >= size) {
        throw new RangeError(`QR matrix coordinate (${row}, ${col}) out of bounds for ${size}x${size}.`);
      }
      return finalModules[row * size + col] === 1;
    },
  };
}
