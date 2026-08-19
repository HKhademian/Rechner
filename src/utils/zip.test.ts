import {
  describe,
  it,
} from "node:test";
import assert from "node:assert/strict";
import {
  type ZipEntry,
  computeCrc32,
  getCrcTable,
  dateToDosDateTime,
  createZipArchive,
  parseZipArchive,
  extractZipArchive,
  extractZipTextArchive,
  ZIP_SIGNATURES,
} from "#utils/zip";

describe("PKZIP 2.0 Archiver and Parser Utility (src/utils/zip.ts)", () => {
  describe("CRC-32 Checksum Engine", () => {
    it("initializes a 256-element lookup table and memoizes it", () => {
      const table1 = getCrcTable();
      const table2 = getCrcTable();
      assert.equal(table1.length, 256);
      assert.strictEqual(table1, table2);
    });

    it("computes standard IEEE 802.3 CRC-32 test vectors accurately", () => {
      const encoder = new TextEncoder();

      // Empty payload
      assert.equal(computeCrc32(new Uint8Array(0)), 0);

      // Standard ASCII test vector "123456789" -> 0xcbf43926 (3421648262)
      const testVec = encoder.encode("123456789");
      assert.equal(computeCrc32(testVec), 0xcbf43926);

      // Known short strings
      const elterngeldBytes = encoder.encode("Elterngeld");
      assert.ok(computeCrc32(elterngeldBytes) > 0);
    });
  });

  describe("MS-DOS Date & Time Encoding", () => {
    it("converts JavaScript Date objects to standard 16-bit DOS time and date integers", () => {
      const date = new Date(2026, 4, 15, 14, 30, 20); // 2026-05-15 14:30:20
      const { dosTime, dosDate } = dateToDosDateTime(date);

      assert.ok(typeof dosTime === "number");
      assert.ok(typeof dosDate === "number");
      assert.ok(dosTime >= 0 && dosTime <= 0xffff);
      assert.ok(dosDate >= 0 && dosDate <= 0xffff);
    });

    it("handles pre-1980 dates by clamping DOS year to 0", () => {
      const oldDate = new Date(1970, 0, 1);
      const { dosDate } = dateToDosDateTime(oldDate);
      assert.ok(dosDate >= 0);
    });
  });

  describe("Archive Creation (createZipArchive)", () => {
    it("packages a record map of text files into a valid ZIP archive", () => {
      const files: Record<string, string> = {
        "readme.txt": "Hello German Elterngeld Simulator!",
        "config.json": JSON.stringify({ version: "1.0.0",
          active: true }),
        "data/ledger.csv": "Month;Amount\nM1;1800\nM2;1800",
      };

      const zipBytes = createZipArchive(files);
      assert.ok(zipBytes instanceof Uint8Array);
      assert.ok(zipBytes.length > 200);

      // Validate Local File Header signature
      const view = new DataView(zipBytes.buffer);
      assert.equal(view.getUint32(0, true), ZIP_SIGNATURES.LocalFileHeader);

      // Validate End of Central Directory signature
      const eocdSig = view.getUint32(zipBytes.length - 22, true);
      assert.equal(eocdSig, ZIP_SIGNATURES.EndOfCentralDirectory);

      // Validate entry count
      const totalEntries = view.getUint16(zipBytes.length - 22 + 8, true);
      assert.equal(totalEntries, 3);
    });

    it("packages an array of ZipEntry descriptors with binary payloads and custom timestamps", () => {
      const binaryPayload = new Uint8Array([
        0xde, 0xad, 0xbe, 0xef, 0x01, 0x02, 0x03,
      ]);
      const entries: ZipEntry[] = [
        {
          name: "binary.dat",
          content: binaryPayload,
          date: new Date(2026, 0, 1),
        },
        {
          name: "notes.md",
          content: "# Institutional Audit Notes",
        },
      ];

      const zipBytes = createZipArchive(entries);
      assert.ok(zipBytes instanceof Uint8Array);
      assert.ok(zipBytes.length > 100);
    });

    it("normalizes Windows backslashes in file paths to standard Unix forward slashes", () => {
      const files = {
        "folder\\subfolder\\report.txt": "Content inside subfolder",
      };
      const zipBytes = createZipArchive(files);
      const parsed = parseZipArchive(zipBytes);

      assert.equal(parsed.length, 1);
      assert.equal(parsed[0].name, "folder/subfolder/report.txt");
    });

    it("creates an empty archive when given an empty map or array", () => {
      const zipBytes = createZipArchive({});
      assert.equal(zipBytes.length, 22); // Minimum EOCD size
      const parsed = parseZipArchive(zipBytes);
      assert.equal(parsed.length, 0);
    });

    it("throws a TypeError when given invalid entry formats", () => {
      // @ts-expect-error Testing runtime parameter validation
      assert.throws(() => createZipArchive(null), TypeError);
      // @ts-expect-error Testing runtime parameter validation
      assert.throws(() => createZipArchive([{ invalid: true }]), TypeError);
    });
  });

  describe("Archive Extraction and Roundtrip Parsing (parseZipArchive, extractZipArchive, extractZipTextArchive)", () => {
    it("roundtrips string and binary files with 100% byte fidelity", () => {
      const binaryData = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90]);
      const originalFiles: Record<string, string | Uint8Array> = {
        "simulation_report.txt":
          "Executive summary report of statutory benefits.",
        "config/settings.json": JSON.stringify({
          taxClass: "III",
          gross: 4500,
        }),
        "assets/blob.bin": binaryData,
      };

      const zipBytes = createZipArchive(originalFiles);

      // Parse detailed entries
      const entries = parseZipArchive(zipBytes);
      assert.equal(entries.length, 3);

      const reportEntry = entries.find(
        (e) => e.name === "simulation_report.txt",
      );
      assert.ok(reportEntry);
      assert.equal(
        new TextDecoder().decode(reportEntry.data),
        "Executive summary report of statutory benefits.",
      );
      assert.equal(reportEntry.compressionMethod, 0);

      // Extract raw byte map
      const extractedBytes = extractZipArchive(zipBytes);
      assert.deepEqual(extractedBytes["assets/blob.bin"], binaryData);

      // Extract text map
      const extractedText = extractZipTextArchive(zipBytes);
      assert.equal(
        extractedText["simulation_report.txt"],
        "Executive summary report of statutory benefits.",
      );
      assert.equal(
        extractedText["config/settings.json"],
        JSON.stringify({ taxClass: "III",
          gross: 4500 }),
      );
    });

    it("throws an error for truncated or invalid zip buffers", () => {
      assert.throws(
        () => parseZipArchive(new Uint8Array(10)),
        /smaller than the minimum 22-byte EOCD record/,
      );

      const fakeBuffer = new Uint8Array(30);
      assert.throws(
        () => parseZipArchive(fakeBuffer),
        /End of Central Directory signature not found/,
      );
    });

    it("detects and throws on CRC-32 checksum corruption", () => {
      const originalFiles = {
        "file.txt": "Important financial data.",
      };
      const zipBytes = createZipArchive(originalFiles);

      // Corrupt a byte in the payload area
      // Local header is 30 bytes + name length (8) = 38 bytes start of content
      zipBytes[38] = zipBytes[38] ^ 0xff;

      assert.throws(
        () => parseZipArchive(zipBytes),
        /CRC-32 checksum mismatch/,
      );
    });
  });
});
