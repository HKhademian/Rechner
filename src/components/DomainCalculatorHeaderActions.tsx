import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  lifeProfilePath,
} from "#/apps/appDefinition.ts";
import {
  EligibilityConfirmedIcon,
  ResetDefaultsIcon,
  SyncProfileActionIcon,
} from "#components/Icons";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";

export interface DomainCalculatorHeaderActionsProps {
  readonly onSyncLifeProfile: () => void;
  readonly onResetDefaults: () => void;
  readonly syncTooltip: string;
  readonly inactiveInLifeProfileMessage?: string;
}

/**
 * Standardized "Sync Life Profile" + "Reset Defaults" header action bar for Track 3 calculators.
 * Provides consistent button labeling matching Net Pay, Parental Leave, and `/profile/`,
 * plus immediate accessible confirmation feedback when synced.
 */
export default function DomainCalculatorHeaderActions({
  onSyncLifeProfile,
  onResetDefaults,
  syncTooltip,
  inactiveInLifeProfileMessage,
}: DomainCalculatorHeaderActionsProps): JSX.Element {
  const [hydrated, setHydrated] = useState(false);
  const [syncNotice, setSyncNotice] = useState<{
    readonly message: string;
    readonly isWarning: boolean;
  } | null>(null);

  useEffect(() => setHydrated(true), []);

  const handleSync = (): void => {
    onSyncLifeProfile();
    const year = unifiedLifeProfile.value.planningYear;
    if (inactiveInLifeProfileMessage) {
      setSyncNotice({
        message: `Synced ${year} Life Profile (${inactiveInLifeProfileMessage})`,
        isWarning: true,
      });
      return;
    }
    setSyncNotice({
      message: `Synced from ${year} Life Profile`,
      isWarning: false,
    });
  };

  const handleReset = (): void => {
    onResetDefaults();
    setSyncNotice(null);
  };

  return (
    <div className="domain-calc-header__actions-group">
      <div className="domain-calc-header__actions">
        <button
          type="button"
          className="domain-calc-btn domain-calc-btn--primary"
          disabled={!hydrated}
          onClick={handleSync}
          title={syncTooltip}
        >
          <SyncProfileActionIcon size={15} />
          <span>Sync Life Profile</span>
        </button>
        <button
          type="button"
          className="domain-calc-btn"
          disabled={!hydrated}
          onClick={handleReset}
        >
          <ResetDefaultsIcon size={14} />
          <span>Reset Defaults</span>
        </button>
      </div>
      {syncNotice && (
        <p
          className={`domain-calc-sync-feedback${syncNotice.isWarning ? " domain-calc-sync-feedback--warn" : ""}`}
          role="status"
          aria-live="polite"
        >
          <EligibilityConfirmedIcon size={14} />
          <span>{syncNotice.message}</span>
          <a href={lifeProfilePath()}>Edit Profile</a>
        </p>
      )}
    </div>
  );
}
