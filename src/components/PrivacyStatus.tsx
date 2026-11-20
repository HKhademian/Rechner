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

/** Compact privacy and offline controls in one popup. */
export default function PrivacyStatus(): JSX.Element {
  const [offlineState, setOfflineState] = useState<OfflineState>(OfflineState.Checking);
  const [dataNotice, setDataNotice] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);

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
    const closeWhenOutside = (event: Event): void => {
      if (!(event.target instanceof Node)) {
        return;
      }
      const details = detailsRef.current;
      if (details?.open && !details.contains(event.target)) {
        details.open = false;
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      const details = detailsRef.current;
      if (details?.open) {
        details.open = false;
        details.querySelector("summary")?.focus();
      }
    };

    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    document.addEventListener("pointerdown", closeWhenOutside);
    document.addEventListener("focusin", closeWhenOutside);
    document.addEventListener("keydown", closeOnEscape);
    navigator.serviceWorker?.addEventListener("controllerchange", updateConnection);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(sitePath("/privacy-sw.js"), { scope: sitePath("/") })
        .then(updateConnection)
        .catch(() => setOfflineState(navigator.onLine ? OfflineState.Limited : OfflineState.Offline));
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      document.removeEventListener("pointerdown", closeWhenOutside);
      document.removeEventListener("focusin", closeWhenOutside);
      document.removeEventListener("keydown", closeOnEscape);
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

  const [pendingBackup, setPendingBackup] = useState<{ readonly raw: string;
    readonly preview: BackupImportPreview } | undefined>();
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
      setPendingBackup({ raw: contents,
        preview });
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

  return <details className="privacy-status" ref={detailsRef}>
    <summary aria-label="Privacy and offline settings">
      <PrivacyShieldIcon className="privacy-status__icon" size={16} />
      <span>Offline</span>
    </summary>
    <div className="privacy-status__panel">
      <p className="privacy-status__assurance">No tracking · No cookies · No profiling</p>
      <p>Calculations stay in your browser · no data server</p>
      <StorageModeControl />
      <div className="privacy-status__data-actions" role="group" aria-label="Manage all calculator data">
        <button type="button" onClick={clearData} aria-label="Clear all data" title="Clear all data"><DeleteActionIcon size={16} /><span>Clear</span></button>
        <button type="button" onClick={exportData} title="Export all data"><ExportDataIcon size={16} /><span>Export all</span></button>
        <button type="button" onClick={() => fileRef.current?.click()} title="Import a backup"><ImportDataIcon size={16} /><span>Import</span></button>
        <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={importData} />
      </div>
      {pendingBackup && <div role="region" aria-label="Backup import preview">
        <p><strong>Backup preview:</strong> {pendingBackup.preview.incomingKeyCount} entries ({pendingBackup.preview.overwrittenKeyCount} will overwrite existing data, {pendingBackup.preview.preservedKeyCount} preserved from current browser).</p>
        <p>People: +{pendingBackup.preview.peopleDiff.added} / ~{pendingBackup.preview.peopleDiff.changed} / −{pendingBackup.preview.peopleDiff.removed} · Timeline: +{pendingBackup.preview.timelineDiff.added} / ~{pendingBackup.preview.timelineDiff.changed} / −{pendingBackup.preview.timelineDiff.removed}</p>
        {pendingBackup.preview.duplicatePersonNames.length > 0 && <p role="status">Duplicate person names in backup: {pendingBackup.preview.duplicatePersonNames.join(", ")}</p>}
        {pendingBackup.preview.incomingTimelineConflicts > 0 && <p role="status">Incoming timeline has {pendingBackup.preview.incomingTimelineConflicts} conflicts or ambiguities to review after import.</p>}
        <div className="privacy-status__data-actions">
          <button type="button" onClick={confirmImport}>Confirm import</button>
          <button type="button" onClick={() => setPendingBackup(undefined)}>Cancel</button>
        </div>
      </div>}
      {dataNotice && <p role="status">{dataNotice}</p>}
      {showOfflineSection && <div className="privacy-status__offline">
        <p className="privacy-status__offline-status">
          <span className={`privacy-status__dot privacy-status__dot--${offlineState}`} aria-hidden="true" />
          <span>Offline cache · {offlineLabel} · first visit online</span>
        </p>
        <button className="privacy-status__offline-action" type="button" onClick={prepareOffline} disabled={offlineState === OfflineState.Preparing || offlineState === OfflineState.Offline}>
          {offlineState === OfflineState.Preparing ? "Preparing…" : offlineState === OfflineState.Prepared ? "Offline ready" : "Prepare offline"}
        </button>
      </div>}
    </div>
  </details>;
}
