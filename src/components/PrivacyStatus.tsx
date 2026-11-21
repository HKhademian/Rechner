import "./PrivacyStatus.css";
import {
  useEffect,
  useRef,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import {
  sitePath,
} from "#/apps/appDefinition.ts";
import {
  DeleteActionIcon,
  ExportDataIcon,
  ImportDataIcon,
  PrivacyShieldIcon,
} from "#components/Icons";
import {
  Button,
  ButtonSize,
  ButtonVariant,
} from "#components/ui/Button";
import {
  PopoverAlign,
  PopoverMenu,
} from "#components/ui/PopoverMenu";
import {
  type BackupImportPreview,
  clearAllData,
  exportAllData,
  importAllData,
  inspectBackupImport,
} from "#engine/storage/appStorage";
import StorageModeControl from "#components/StorageModeControl";

export const OfflineState = {
  Checking: "checking",
  Active: "active",
  Prepared: "prepared",
  Limited: "limited",
  Offline: "offline",
  Preparing: "preparing",
} as const;
type OfflineState = (typeof OfflineState)[keyof typeof OfflineState];
const showOfflineSection = false;

/** Compact privacy, storage, and local backup controls in one popover. */
export default function PrivacyStatus(): JSX.Element {
  const [offlineState, setOfflineState] = useState<OfflineState>(OfflineState.Checking);
  const [dataNotice, setDataNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const updateConnection = (): void => {
      if (!navigator.onLine) {
        setOfflineState(OfflineState.Offline);
      }
      else if (navigator.serviceWorker?.controller) {
        setOfflineState((current) => current === OfflineState.Prepared ? current : OfflineState.Active);
      }
      else {
        setOfflineState(OfflineState.Limited);
      }
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    navigator.serviceWorker?.addEventListener("controllerchange", updateConnection);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(sitePath("/privacy-sw.js"), { scope: sitePath("/") })
        .then(updateConnection)
        .catch(() => setOfflineState(navigator.onLine ? OfflineState.Limited : OfflineState.Offline));
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      navigator.serviceWorker?.removeEventListener("controllerchange", updateConnection);
    };
  }, []);

  const prepareOffline = async (): Promise<void> => {
    if (!navigator.onLine || !("serviceWorker" in navigator)) {
      setOfflineState(OfflineState.Offline);
      return;
    }
    setOfflineState(OfflineState.Preparing);
    try {
      const registration = await navigator.serviceWorker.ready;
      const worker = registration.active;
      if (!worker) {
        setOfflineState(OfflineState.Limited);
        return;
      }
      const channel = new MessageChannel();
      channel.port1.onmessage = (event: MessageEvent<{ ok: boolean }>): void => {
        setOfflineState(event.data.ok ? OfflineState.Prepared : OfflineState.Limited);
        channel.port1.close();
      };
      worker.postMessage({ type: "PREPARE_RECHNER_OFFLINE" }, [channel.port2]);
    }
    catch {
      setOfflineState(OfflineState.Limited);
    }
  };

  const exportData = (): void => {
    try {
      const blob = new Blob([exportAllData()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "rechner-backup.json";
      link.click();
      URL.revokeObjectURL(url);
      setDataNotice("Backup downloaded.");
    }
    catch {
      setDataNotice("Could not export data.");
    }
  };

  const [pendingBackup, setPendingBackup] = useState<{
    readonly raw: string;
    readonly preview: BackupImportPreview;
  } | undefined>();
  const importData = async (event: Event): Promise<void> => {
    const input = event.currentTarget;
    if (!(input instanceof HTMLInputElement) || !input.files?.[0]) {
      return;
    }
    const file = input.files[0];
    input.value = "";
    try {
      const contents = await file.text();
      const preview = inspectBackupImport(contents);
      if (!preview.valid) {
        setPendingBackup(undefined);
        setDataNotice(preview.error ?? "Could not import this backup. Check the file and browser storage.");
        return;
      }
      setPendingBackup({
        raw: contents,
        preview,
      });
      setDataNotice("");
    }
    catch {
      setPendingBackup(undefined);
      setDataNotice("Could not read this backup file.");
    }
  };

  const confirmImport = (): void => {
    if (!pendingBackup) {
      return;
    }
    try {
      importAllData(pendingBackup.raw);
      window.location.reload();
    }
    catch {
      setDataNotice("Could not import this backup. Check the file and browser storage.");
      setPendingBackup(undefined);
    }
  };

  const clearData = (): void => {
    if (!window.confirm("Clear data for all calculators and shared settings? This cannot be undone.")) {
      return;
    }
    try {
      clearAllData();
      window.location.reload();
    }
    catch {
      setDataNotice("Could not clear data.");
    }
  };

  const offlineLabel = offlineState === OfflineState.Prepared
    ? "ready"
    : offlineState === OfflineState.Offline
      ? "currently offline"
      : offlineState === OfflineState.Preparing
        ? "preparing"
        : offlineState === OfflineState.Limited
          ? "needs setup"
          : offlineState === OfflineState.Active
            ? "cache worker active"
            : "checking";

  return (
    <PopoverMenu
      className="privacy-status"
      panelClassName="privacy-status__panel"
      align={PopoverAlign.Right}
      summaryAriaLabel="Privacy and offline settings"
      panelAriaLabel="Privacy, storage mode, and backup controls"
      summary={(
        <>
          <PrivacyShieldIcon className="privacy-status__icon" size={15} />
          <span className="privacy-status__summary-label">Privacy</span>
        </>
      )}
    >
      <p className="privacy-status__assurance">No tracking · No cookies · Local only</p>
      <p>Calculations stay in your browser with no data server.</p>
      <StorageModeControl />
      <div className="privacy-status__data-actions" role="group" aria-label="Manage all calculator data">
        <Button size={ButtonSize.Sm} variant={ButtonVariant.Danger} onClick={clearData} ariaLabel="Clear all data" title="Clear all data">
          <DeleteActionIcon size={14} />
          <span>Clear</span>
        </Button>
        <Button size={ButtonSize.Sm} onClick={exportData} title="Export all data">
          <ExportDataIcon size={14} />
          <span>Export</span>
        </Button>
        <Button size={ButtonSize.Sm} onClick={() => fileRef.current?.click()} title="Import a backup">
          <ImportDataIcon size={14} />
          <span>Import</span>
        </Button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importData} />
      </div>
      {pendingBackup && (
        <div role="region" aria-label="Backup import preview" className="privacy-status__preview">
          <p>
            <strong>Backup preview:</strong> {pendingBackup.preview.incomingKeyCount} entries ({pendingBackup.preview.overwrittenKeyCount} overwrite, {pendingBackup.preview.preservedKeyCount} preserved).
          </p>
          <p>
            People: +{pendingBackup.preview.peopleDiff.added} / ~{pendingBackup.preview.peopleDiff.changed} / −{pendingBackup.preview.peopleDiff.removed} · Timeline: +{pendingBackup.preview.timelineDiff.added} / ~{pendingBackup.preview.timelineDiff.changed} / −{pendingBackup.preview.timelineDiff.removed}
          </p>
          {pendingBackup.preview.duplicatePersonNames.length > 0 && (
            <p role="status">Duplicate person names in backup: {pendingBackup.preview.duplicatePersonNames.join(", ")}</p>
          )}
          {pendingBackup.preview.incomingTimelineConflicts > 0 && (
            <p role="status">Incoming timeline has {pendingBackup.preview.incomingTimelineConflicts} conflicts or ambiguities to review after import.</p>
          )}
          <div className="privacy-status__data-actions">
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Primary} onClick={confirmImport}>Confirm import</Button>
            <Button size={ButtonSize.Sm} variant={ButtonVariant.Ghost} onClick={() => setPendingBackup(undefined)}>Cancel</Button>
          </div>
        </div>
      )}
      {dataNotice && <p role="status">{dataNotice}</p>}
      {showOfflineSection && (
        <div className="privacy-status__offline">
          <p className="privacy-status__offline-status">
            <span className={`privacy-status__dot privacy-status__dot--${offlineState}`} aria-hidden="true" />
            <span>Offline cache · {offlineLabel} · first visit online</span>
          </p>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Tint}
            className="privacy-status__offline-action"
            onClick={prepareOffline}
            disabled={offlineState === OfflineState.Preparing || offlineState === OfflineState.Offline}
          >
            {offlineState === OfflineState.Preparing ? "Preparing…" : offlineState === OfflineState.Prepared ? "Offline ready" : "Prepare offline"}
          </Button>
        </div>
      )}
    </PopoverMenu>
  );
}
