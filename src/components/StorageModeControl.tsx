import {
  useEffect,
  useState,
} from "preact/hooks";
import type {
  JSX,
} from "preact";
import {
  type AppId,
} from "#/apps/appDefinition.ts";
import {
  clearPersistentAppData,
  getStorageMode,
  hasPersistentAppData,
  setStorageMode,
  StorageMode,
  toStorageMode,
} from "#engine/storage/appStorage";

const modeDescriptions: Readonly<Record<StorageMode, string>> = {
  [StorageMode.Memory]: "Data stays in memory and is cleared when you leave or reload this page.",
  [StorageMode.Session]: "Data stays in this browser tab and is cleared when the tab closes.",
  [StorageMode.Persistent]: "Data is saved in this browser on this device until you clear it.",
};

export default function StorageModeControl({ app }: { app: AppId }): JSX.Element {
  const [mode, setMode] = useState<StorageMode>(StorageMode.Memory);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");
  const [hasOldData, setHasOldData] = useState(false);

  useEffect(() => {
    setMode(getStorageMode(app));
    setHasOldData(hasPersistentAppData(app));
    setHydrated(true);
  }, [app]);

  const changeMode = (event: JSX.TargetedEvent<HTMLSelectElement>): void => {
    const nextMode = toStorageMode(event.currentTarget.value);
    if (nextMode === mode) {
      return;
    }
    const acknowledged = nextMode === StorageMode.Persistent
      ? window.confirm("Save this calculator's inputs in local storage on this device? The data stays in this browser profile and is not sent to Rechner. Choose OK to acknowledge and save.")
      : mode === StorageMode.Persistent
        ? window.confirm("Switching away from saved storage will move this calculator's data to the selected mode and remove its Rechner-owned local-storage data.")
        : hasPersistentAppData(app)
          ? window.confirm("Older Rechner data for this calculator is still saved on this device. Switching modes will remove that persistent data.")
          : true;
    if (!acknowledged) {
      event.currentTarget.value = mode;
      return;
    }
    if (!setStorageMode(app, nextMode, acknowledged)) {
      event.currentTarget.value = mode;
      setNotice("The browser blocked this storage choice. Your data remains available on this page.");
      return;
    }
    setNotice("");
    setMode(nextMode);
    setHasOldData(hasPersistentAppData(app));
    if (nextMode !== StorageMode.Memory) {
      window.location.reload();
    }
  };

  const clearOldData = (): void => {
    if (!window.confirm("Delete saved Rechner data for this calculator from this browser?")) {
      return;
    }
    if (clearPersistentAppData(app)) {
      setHasOldData(false);
      setNotice("Older saved data was removed from this browser.");
    }
    else {
      setNotice("The browser blocked removal of older saved data.");
    }
  };

  return <div className="storage-mode-control">
    <label htmlFor={`storage-mode-${app}`}>This calculator's data</label>
    <select
      id={`storage-mode-${app}`}
      value={hydrated ? mode : StorageMode.Memory}
      onChange={changeMode}
      aria-describedby={`storage-mode-description-${app}`}
    >
      <option value={StorageMode.Memory}>This page only</option>
      <option value={StorageMode.Session}>This tab</option>
      <option value={StorageMode.Persistent}>Save on this device</option>
    </select>
    <small id={`storage-mode-description-${app}`}>
      {modeDescriptions[hydrated ? mode : StorageMode.Memory]}
    </small>
    {notice && <small role="status">{notice}</small>}
    {hydrated && hasOldData && mode !== StorageMode.Persistent && <small className="storage-mode-control__old-data">
      Earlier saved data is present on this device but is not used in this mode.
      <button type="button" onClick={clearOldData}>Delete it</button>
    </small>}
  </div>;
}
