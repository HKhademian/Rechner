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
  type AppId,
  sitePath,
} from "#/apps/appDefinition.ts";
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

/** Compact privacy settings and a separate action for preparing offline use. */
export default function PrivacyStatus({ app }: { app?: AppId }): JSX.Element {
  const [offlineState, setOfflineState] = useState<OfflineState>(OfflineState.Checking);
  const privacyRef = useRef<HTMLDetailsElement>(null);
  const offlineRef = useRef<HTMLDetailsElement>(null);

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
      for (const details of [privacyRef.current, offlineRef.current]) {
        if (details?.open && !details.contains(event.target)) {
          details.open = false;
        }
      }
    };
    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key !== "Escape") {
        return;
      }
      for (const details of [privacyRef.current, offlineRef.current]) {
        if (details?.open) {
          details.open = false;
          details.querySelector("summary")?.focus();
          break;
        }
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

  return <div className="privacy-controls">
    <details className="privacy-status" ref={privacyRef}>
      <summary aria-label="Privacy settings">
        <svg className="privacy-status__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M12 3 19 6v5c0 4.7-2.8 8.2-7 10-4.2-1.8-7-5.3-7-10V6l7-3Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Privacy
      </summary>
      <div className="privacy-status__panel">
        <p>No account, cookies, analytics, or calculator-data server. Calculations run here.</p>
        {app && <StorageModeControl app={app} />}
        <p>API calls are blocked. Source links open in clean new tabs.</p>
        <p className="privacy-status__limit">Your browser, device, and host handle the first request. Saved data is not encrypted.</p>
      </div>
    </details>
    <details className="privacy-status privacy-status--offline" ref={offlineRef}>
      <summary aria-label={`Offline support ${offlineLabel}`}>
        <svg className="privacy-status__icon" viewBox="0 0 24 24" aria-hidden="true" fill="none">
          <path d="M3 8.5a13.5 13.5 0 0 1 18 0M6.5 12a8.2 8.2 0 0 1 11 0M10 15.5a3 3 0 0 1 4 0M12 19h.01" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
        Offline
        <span className={`privacy-status__dot privacy-status__dot--${offlineState}`} aria-hidden="true" />
      </summary>
      <div className="privacy-status__panel privacy-status__panel--offline">
        <p>Offline cache: {offlineLabel}. First visit needs internet.</p>
        <button className="privacy-status__offline-action" type="button" onClick={prepareOffline} disabled={offlineState === OfflineState.Preparing || offlineState === OfflineState.Offline}>
          {offlineState === OfflineState.Preparing ? "Preparing…" : offlineState === OfflineState.Prepared ? "Offline copy ready" : "Prepare Rechner offline"}
        </button>
      </div>
    </details>
  </div>;
}
