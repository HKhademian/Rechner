import {
  computed,
  signal,
} from "@preact/signals";
import {
  type UnifiedLifeEvaluationResult,
  evaluateUnifiedLifeProfile,
} from "#engine/lifeProfile/engine";
import {
  clearUnifiedLifeProfile,
  readUnifiedLifeProfile,
  writeUnifiedLifeProfile,
} from "#engine/lifeProfile/storage";
import {
  type UnifiedLifeProfile,
  LIFE_PROFILE_STORAGE_KEY,
  createDefaultUnifiedLifeProfile,
  parseUnifiedLifeProfile,
} from "#engine/lifeProfile/types";
import {
  activeStatutoryContext,
  setParameterYear,
} from "#store/parameterStore";

/**
 * Reactive Unified Life Profile store shared safely across the home catalog and
 * every standalone calculator without creating store-to-store couplings.
 */
export const unifiedLifeProfile = signal<UnifiedLifeProfile>(readUnifiedLifeProfile());

/** Derived cross-domain statutory assessment computed from the shared profile and context. */
export const unifiedLifeOverview = computed<UnifiedLifeEvaluationResult>(() =>
  evaluateUnifiedLifeProfile(unifiedLifeProfile.value, activeStatutoryContext.value));

export function updateLifeProfileField<K extends keyof UnifiedLifeProfile>(
  field: K,
  value: UnifiedLifeProfile[K],
): void {
  const next = parseUnifiedLifeProfile({
    ...unifiedLifeProfile.value,
    [field]: value,
  });
  unifiedLifeProfile.value = next;
  if (field === "planningYear") {
    setParameterYear(next.planningYear);
  }
  writeUnifiedLifeProfile(next);
}

export function replaceUnifiedLifeProfile(nextProfile: UnifiedLifeProfile): void {
  const sanitized = parseUnifiedLifeProfile(nextProfile);
  unifiedLifeProfile.value = sanitized;
  setParameterYear(sanitized.planningYear);
  writeUnifiedLifeProfile(sanitized);
}

export function resetUnifiedLifeProfile(): void {
  const defaults = createDefaultUnifiedLifeProfile();
  unifiedLifeProfile.value = defaults;
  clearUnifiedLifeProfile();
}

export function reloadUnifiedLifeProfileFromStorage(): void {
  unifiedLifeProfile.value = readUnifiedLifeProfile();
}

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key === LIFE_PROFILE_STORAGE_KEY || event.key === null) {
      reloadUnifiedLifeProfileFromStorage();
    }
  });
}
