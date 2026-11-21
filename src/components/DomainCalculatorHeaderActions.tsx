import {
  type JSX,
} from "preact";
import {
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
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
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
 * Standardized minimal "Sync Life Profile" + "Reset" header action bar for domain calculators.
 * Keeps utility actions visually calm so primary results remain the focal point.
 */
export default function DomainCalculatorHeaderActions({
  onSyncLifeProfile,
  onResetDefaults,
  syncTooltip,
  inactiveInLifeProfileMessage,
}: DomainCalculatorHeaderActionsProps): JSX.Element {
  const hydrated = useHydrated();
  const [syncNotice, setSyncNotice] = useState<{
    readonly message: string;
    readonly isWarning: boolean;
  } | null>(null);

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
        <Button
          variant={ButtonVariant.Ghost}
          size={ButtonSize.Sm}
          disabled={!hydrated}
          onClick={handleReset}
        >
          <ResetDefaultsIcon size={14} />
          <span>Reset</span>
        </Button>
        <Button
          variant={ButtonVariant.Secondary}
          size={ButtonSize.Sm}
          disabled={!hydrated}
          onClick={handleSync}
          title={syncTooltip}
        >
          <SyncProfileActionIcon size={14} />
          <span>Sync Life Profile</span>
        </Button>
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
