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
  getStorageMode,
  setStorageMode,
  StorageMode,
} from "#engine/storage/appStorage";

const modeLabels: Readonly<Record<StorageMode, string>> = {
  [StorageMode.Memory]: "Page",
  [StorageMode.Session]: "Tab",
  [StorageMode.Persistent]: "Device",
};

const modeAccessibleLabels: Readonly<Record<StorageMode, string>> = {
  [StorageMode.Memory]: "Keep data only on this page",
  [StorageMode.Session]: "Keep data in this browser tab",
  [StorageMode.Persistent]: "Save data in this browser on this device",
};

export default function StorageModeControl({ app }: { app: AppId }): JSX.Element {
  const [mode, setMode] = useState<StorageMode>(StorageMode.Memory);
  const [pendingMode, setPendingMode] = useState<StorageMode | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    setMode(getStorageMode(app));
    setHydrated(true);
  }, [app]);

  const applyMode = (): void => {
    if (!pendingMode) {
      return;
    }
    const acknowledge = pendingMode === StorageMode.Persistent;
    if (!setStorageMode(app, pendingMode, acknowledge)) {
      setNotice("Storage unavailable · data kept");
      setPendingMode(null);
      return;
    }
    setMode(pendingMode);
    setPendingMode(null);
    setNotice("");
    if (pendingMode !== StorageMode.Memory) {
      window.location.reload();
    }
  };

  const pendingNotice = pendingMode === StorageMode.Persistent
    ? "Save on this device · clear manually?"
    : pendingMode === StorageMode.Session
      ? "Keep in this tab · clear device copy?"
      : "Keep on this page · clear saved copies?";

  return <section className="storage-mode-control" aria-label="Calculator data storage">
    <div className="storage-mode-control__buttons" role="group" aria-label="Choose where calculator data is kept">
      {Object.values(StorageMode).map((option) => <button
        key={option}
        type="button"
        aria-label={modeAccessibleLabels[option]}
        title={modeAccessibleLabels[option]}
        aria-pressed={hydrated && mode === option}
        disabled={!hydrated}
        onClick={() => {
          setNotice("");
          setPendingMode(option === mode ? null : option);
        }}
      >{modeLabels[option]}</button>)}
    </div>
    {pendingMode && <div className="storage-mode-control__notice" role="status">
      <span>{pendingNotice}</span>
      <div>
        <button type="button" onClick={applyMode}>
          {pendingMode === StorageMode.Persistent ? "Accept & save" : "Apply"}
        </button>
        <button type="button" onClick={() => setPendingMode(null)}>Cancel</button>
      </div>
    </div>}
    {notice && <small className="storage-mode-control__error" role="status">{notice}</small>}
  </section>;
}
