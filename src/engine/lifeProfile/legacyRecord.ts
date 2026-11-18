import {
  createDefaultUnifiedLifeProfile,
} from "#engine/lifeProfile/types";

export const LegacyRecordStatus = {
  Missing: "missing",
  Supported: "supported",
  Invalid: "invalid",
  Unsupported: "unsupported",
} as const;
export type LegacyRecordStatus = (typeof LegacyRecordStatus)[keyof typeof LegacyRecordStatus];

/** Inspect before parsing, because the legacy parser fills defaults and always returns version 1. */
export function inspectLegacyRecord(raw: string | null): LegacyRecordStatus {
  if (raw === null) {
    return LegacyRecordStatus.Missing;
  }
  try {
    const data: unknown = JSON.parse(raw);
    if (typeof data !== "object" || data === null || Array.isArray(data)) {
      return LegacyRecordStatus.Invalid;
    }
    if ("version" in data && data.version !== 1) {
      return LegacyRecordStatus.Unsupported;
    }
    const keys = Object.keys(createDefaultUnifiedLifeProfile());
    if (Object.keys(data).some((key) => !keys.includes(key))) {
      return LegacyRecordStatus.Unsupported;
    }
    return LegacyRecordStatus.Supported;
  }
  catch {
    return LegacyRecordStatus.Invalid;
  }
}
