const sourceCommit = import.meta.env?.PUBLIC_SOURCE_COMMIT ?? "unknown";

export const buildInfo = Object.freeze({
  schemaVersion: 1,
  repository: "HKhademian/Rechner",
  commit: sourceCommit,
  shortCommit: sourceCommit.slice(0, 12),
});
