/**
 * Zero-Dependency Pure TypeScript PKZIP 2.0 Archive Packager & Parser.
 *
 * Implements standard PKWARE ZIP File Format Specification (STORE method 0, uncompressed)
 * with complete CRC-32 checksum calculation, central directory indexing, and End of Central
 * Directory (EOCD) serialization and parsing.
 *
 * Conforms to institutional deterministic byte packing with no external runtime dependencies.
 */

/**
 * Supported file content types for archive packaging.
 */
export type ZipFileContent = string | Uint8Array;

/**
 * Input descriptor for an individual file entry in a ZIP archive.
 */
export interface ZipEntry {
  /** Relative file path within the ZIP archive (e.g. 'docs/readme.txt'). */
  readonly name: string;
  /** File payload data as UTF-8 string or raw byte array. */
  readonly content: ZipFileContent;
  /** Optional file modification timestamp. */
  readonly date?: Date;
}

/**
 * Extracted file entry parsed from a ZIP archive binary.
 */
export interface ParsedZipEntry {
  /** Relative file path stored in the archive header. */
  readonly name: string;
  /** Uncompressed file byte payload. */
  readonly data: Uint8Array;
  /** Uncompressed payload size in bytes. */
  readonly uncompressedSize: number;
  /** Compressed payload size in bytes. */
  readonly compressedSize: number;
  /** CRC-32 checksum recorded in the archive header. */
  readonly crc32: number;
  /** Compression method code (0 = STORE). */
  readonly compressionMethod: number;
}

/**
 * Standard PKZIP Magic Header Signatures (32-bit Little-Endian).
 */
export const ZIP_SIGNATURES = {
  LocalFileHeader: 0x02895b50,
  CentralDirectoryHeader: 0x02014b50,
  EndOfCentralDirectory: 0x06054b50,
} as const;

/**
 * Memoized CRC-32 lookup table (polynomial 0xEDB88320).
 */
let crc32LookupTable: Uint32Array | null = null;

/**
 * Retrieves or initializes the 256-entry CRC-32 lookup table.
 *
 * @returns 256-element Uint32Array lookup table.
 */
export function getCrcTable(): Uint32Array {
  if (crc32LookupTable) {
    return crc32LookupTable;
  }

  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) {
        c = 0xedb88320 ^ (c >>> 1);
      }
      else {
        c = c >>> 1;
      }
    }
    table[n] = c >>> 0;
  }

  crc32LookupTable = table;
  return table;
}

/**
 * Computes standard IEEE 802.3 CRC-32 checksum for a byte array.
 *
 * @param bytes - Input byte array.
 * @returns Unsigned 32-bit integer checksum.
 */
export function computeCrc32(bytes: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0 ^ -1;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

/**
 * Converts a JavaScript Date into MS-DOS 16-bit packed date and time formats.
 *
 * @param date - Source date object.
 * @returns Object containing 16-bit dosTime and dosDate integers.
 */
export function dateToDosDateTime(date: Date = new Date()): {
  dosTime: number;
  dosDate: number;
} {
  const year = date.getFullYear();
  const dosYear = year < 1980 ? 0 : year - 1980;
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = Math.floor(date.getSeconds() / 2);

  const dosTime = (hours << 11) | (minutes << 5) | seconds;
  const dosDate = (dosYear << 9) | (month << 5) | day;

  return {
    dosTime,
    dosDate,
  };
}

/**
 * Normalizes input files into an array of structured ZipEntry objects.
 *
 * @param input - Map of filenames to contents or an array of ZipEntry descriptors.
 * @returns Array of ZipEntry descriptors.
 */
function normalizeZipEntries(
  input: Record<string, ZipFileContent> | readonly ZipEntry[],
): ZipEntry[] {
  if (Array.isArray(input)) {
    return input.map((entry) => {
      if (!entry || typeof entry.name !== "string") {
        throw new TypeError("Each ZipEntry must contain a valid string 'name'.");
      }
      return {
        name: entry.name.replace(/\\/g, "/"),
        content: entry.content ?? new Uint8Array(0),
        date: entry.date,
      };
    });
  }

  if (typeof input === "object" && input !== null) {
    return Object.entries(input).map(([filename, content]) => {
      return {
        name: filename.replace(/\\/g, "/"),
        content: content ?? new Uint8Array(0),
      };
    });
  }

  throw new TypeError(
    "ZIP input must be a Record<string, string | Uint8Array> or an array of ZipEntry objects.",
  );
}

/**
 * Encodes string or binary content into a Uint8Array byte sequence.
 *
 * @param content - Text string or Uint8Array.
 * @param encoder - TextEncoder instance.
 * @returns Byte array.
 */
function toUint8Array(content: ZipFileContent, encoder: TextEncoder): Uint8Array {
  if (typeof content === "string") {
    return encoder.encode(content);
  }
  if (content instanceof Uint8Array) {
    return content;
  }
  throw new TypeError("ZIP file content must be a string or Uint8Array.");
}

/**
 * Pure TypeScript Zero-Dependency PKZIP Archive Packager.
 * Bundles multiple files into a standard, fully compliant uncompressed (STORE) ZIP binary.
 *
 * @param files - Map of internal archive file paths to contents, or an array of ZipEntry objects.
 * @returns Uint8Array containing the complete binary ZIP archive.
 */
export function createZipArchive(
  files: Record<string, ZipFileContent> | readonly ZipEntry[],
): Uint8Array {
  const entries = normalizeZipEntries(files);
  const encoder = new TextEncoder();

  const fileRecords: {
    nameBytes: Uint8Array;
    contentBytes: Uint8Array;
    crc: number;
    offset: number;
    dosTime: number;
    dosDate: number;
  }[] = [];

  let currentOffset = 0;
  const localHeadersAndData: Uint8Array[] = [];

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const contentBytes = toUint8Array(entry.content, encoder);
    const crc = computeCrc32(contentBytes);
    const {
      dosTime, dosDate, 
    } = dateToDosDateTime(entry.date);
    const offset = currentOffset;

    fileRecords.push({
      nameBytes,
      contentBytes,
      crc,
      offset,
      dosTime,
      dosDate,
    });

    // Local file header (30 bytes fixed + filename + content data)
    const localHeader = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const view = new DataView(localHeader.buffer);

    view.setUint32(0, ZIP_SIGNATURES.LocalFileHeader, true); // Local file header signature
    view.setUint16(4, 10, true); // Version needed to extract (1.0)
    view.setUint16(6, 0x0800, true); // General purpose bit flag (Bit 11 = UTF-8 encoding for filename)
    view.setUint16(8, 0, true); // Compression method (0 = STORE / uncompressed)
    view.setUint16(10, dosTime, true); // Last modification file time
    view.setUint16(12, dosDate, true); // Last modification file date
    view.setUint32(14, crc, true); // CRC-32 checksum
    view.setUint32(18, contentBytes.length, true); // Compressed size
    view.setUint32(22, contentBytes.length, true); // Uncompressed size
    view.setUint16(26, nameBytes.length, true); // Filename length
    view.setUint16(28, 0, true); // Extra field length

    localHeader.set(nameBytes, 30);
    localHeader.set(contentBytes, 30 + nameBytes.length);

    localHeadersAndData.push(localHeader);
    currentOffset += localHeader.length;
  }

  // Central Directory Records (46 bytes fixed + filename)
  const centralDirRecords: Uint8Array[] = [];
  const centralDirStartOffset = currentOffset;
  let centralDirSize = 0;

  for (const record of fileRecords) {
    const centralRecord = new Uint8Array(46 + record.nameBytes.length);
    const view = new DataView(centralRecord.buffer);

    view.setUint32(0, ZIP_SIGNATURES.CentralDirectoryHeader, true); // Central directory header signature
    view.setUint16(4, 20, true); // Version made by (2.0)
    view.setUint16(6, 10, true); // Version needed to extract (1.0)
    view.setUint16(8, 0x0800, true); // General purpose bit flag (UTF-8)
    view.setUint16(10, 0, true); // Compression method (0 = STORE)
    view.setUint16(12, record.dosTime, true); // Last mod file time
    view.setUint16(14, record.dosDate, true); // Last mod file date
    view.setUint32(16, record.crc, true); // CRC-32 checksum
    view.setUint32(20, record.contentBytes.length, true); // Compressed size
    view.setUint32(24, record.contentBytes.length, true); // Uncompressed size
    view.setUint16(28, record.nameBytes.length, true); // Filename length
    view.setUint16(30, 0, true); // Extra field length
    view.setUint16(32, 0, true); // File comment length
    view.setUint16(34, 0, true); // Disk number start
    view.setUint16(36, 0, true); // Internal file attributes
    view.setUint32(38, 0, true); // External file attributes
    view.setUint32(42, record.offset, true); // Relative offset of local file header

    centralRecord.set(record.nameBytes, 46);
    centralDirRecords.push(centralRecord);
    centralDirSize += centralRecord.length;
  }

  // End of Central Directory Record (22 bytes fixed)
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);

  eocdView.setUint32(0, ZIP_SIGNATURES.EndOfCentralDirectory, true); // End of central dir signature
  eocdView.setUint16(4, 0, true); // Number of this disk
  eocdView.setUint16(6, 0, true); // Disk where central directory starts
  eocdView.setUint16(8, fileRecords.length, true); // Total entries on this disk
  eocdView.setUint16(10, fileRecords.length, true); // Total entries in central directory
  eocdView.setUint32(12, centralDirSize, true); // Size of central directory
  eocdView.setUint32(16, centralDirStartOffset, true); // Offset of start of central directory
  eocdView.setUint16(20, 0, true); // ZIP comment length

  // Concatenate all chunks into final binary payload
  const totalLength = currentOffset + centralDirSize + eocd.length;
  const result = new Uint8Array(totalLength);
  let pos = 0;

  for (const chunk of localHeadersAndData) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  for (const chunk of centralDirRecords) {
    result.set(chunk, pos);
    pos += chunk.length;
  }

  result.set(eocd, pos);
  return result;
}

/**
 * Parses and extracts all file entries from an uncompressed (STORE) ZIP archive binary.
 *
 * @param zipBuffer - Binary ZIP file buffer.
 * @returns Array of parsed ZIP file entries.
 * @throws {Error} if the archive is truncated, corrupted, or unsupported.
 */
export function parseZipArchive(zipBuffer: Uint8Array): ParsedZipEntry[] {
  if (zipBuffer.length < 22) {
    throw new Error("Invalid ZIP buffer: size is smaller than the minimum 22-byte EOCD record.");
  }

  const decoder = new TextDecoder("utf-8");
  const view = new DataView(zipBuffer.buffer, zipBuffer.byteOffset, zipBuffer.byteLength);

  // Scan backwards from end to find End of Central Directory signature (0x06054b50)
  let eocdOffset = -1;
  const maxCommentLength = Math.min(65535, zipBuffer.length - 22);
  for (let i = zipBuffer.length - 22; i >= zipBuffer.length - 22 - maxCommentLength; i--) {
    if (view.getUint32(i, true) === ZIP_SIGNATURES.EndOfCentralDirectory) {
      eocdOffset = i;
      break;
    }
  }

  if (eocdOffset === -1) {
    throw new Error("Invalid ZIP archive: End of Central Directory signature not found.");
  }

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirSize = view.getUint32(eocdOffset + 12, true);
  const centralDirOffset = view.getUint32(eocdOffset + 16, true);

  if (centralDirOffset + centralDirSize > eocdOffset) {
    throw new Error("Corrupted ZIP archive: Central Directory overlaps or exceeds EOCD offset.");
  }

  const entries: ParsedZipEntry[] = [];
  let cdPos = centralDirOffset;

  for (let i = 0; i < totalEntries; i++) {
    if (cdPos + 46 > zipBuffer.length) {
      throw new Error(`Corrupted ZIP archive: Truncated Central Directory header at entry ${i}.`);
    }

    const cdSig = view.getUint32(cdPos, true);
    if (cdSig !== ZIP_SIGNATURES.CentralDirectoryHeader) {
      throw new Error(
        `Invalid Central Directory header signature 0x${cdSig.toString(16)} at offset ${cdPos}.`,
      );
    }

    const compressionMethod = view.getUint16(cdPos + 10, true);
    const crc32 = view.getUint32(cdPos + 16, true);
    const compressedSize = view.getUint32(cdPos + 20, true);
    const uncompressedSize = view.getUint32(cdPos + 24, true);
    const filenameLen = view.getUint16(cdPos + 28, true);
    const extraLen = view.getUint16(cdPos + 30, true);
    const commentLen = view.getUint16(cdPos + 32, true);
    const localHeaderOffset = view.getUint32(cdPos + 42, true);

    const nameBytes = zipBuffer.subarray(cdPos + 46, cdPos + 46 + filenameLen);
    const filename = decoder.decode(nameBytes);

    cdPos += 46 + filenameLen + extraLen + commentLen;

    // Validate and read Local File Header
    if (localHeaderOffset + 30 > zipBuffer.length) {
      throw new Error(`Corrupted ZIP archive: Truncated Local File Header for '${filename}'.`);
    }

    const localSig = view.getUint32(localHeaderOffset, true);
    if (localSig !== ZIP_SIGNATURES.LocalFileHeader) {
      throw new Error(
        `Invalid Local File Header signature 0x${localSig.toString(16)} for '${filename}'.`,
      );
    }

    const localNameLen = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLen = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLen + localExtraLen;

    if (dataOffset + compressedSize > zipBuffer.length) {
      throw new Error(`Corrupted ZIP archive: File payload out of bounds for '${filename}'.`);
    }

    const data = zipBuffer.slice(dataOffset, dataOffset + compressedSize);

    // Verify CRC-32 checksum if uncompressed STORE method
    if (compressionMethod === 0) {
      const computedCrc = computeCrc32(data);
      if (computedCrc !== crc32) {
        throw new Error(
          `CRC-32 checksum mismatch for '${filename}': expected 0x${crc32.toString(16)}, got 0x${computedCrc.toString(16)}.`,
        );
      }
    }

    entries.push({
      name: filename,
      data,
      uncompressedSize,
      compressedSize,
      crc32,
      compressionMethod,
    });
  }

  return entries;
}

/**
 * Extracts all files from a ZIP archive binary into a filename-to-Uint8Array map.
 *
 * @param zipBuffer - Binary ZIP file buffer.
 * @returns Map of archive relative filenames to their decompressed byte arrays.
 */
export function extractZipArchive(zipBuffer: Uint8Array): Record<string, Uint8Array> {
  const parsed = parseZipArchive(zipBuffer);
  const result: Record<string, Uint8Array> = {};
  for (const entry of parsed) {
    result[entry.name] = entry.data;
  }
  return result;
}

/**
 * Extracts all text files from a ZIP archive binary into a filename-to-string map.
 *
 * @param zipBuffer - Binary ZIP file buffer.
 * @returns Map of archive relative filenames to their decoded UTF-8 string contents.
 */
export function extractZipTextArchive(zipBuffer: Uint8Array): Record<string, string> {
  const parsed = parseZipArchive(zipBuffer);
  const decoder = new TextDecoder("utf-8");
  const result: Record<string, string> = {};
  for (const entry of parsed) {
    result[entry.name] = decoder.decode(entry.data);
  }
  return result;
}
