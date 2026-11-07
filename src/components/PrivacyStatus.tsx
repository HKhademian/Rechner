import "./PrivacyStatus.css";
import {
  useEffect,
  useState,
} from "preact/hooks";
import type {
  JSX, 
} from "preact";
import {
  sitePath, 
} from "#/apps/appDefinition.ts";

type OfflineState = "checking" | "available" | "limited" | "offline";

/** A compact, evidence-based summary of the app's privacy and offline behavior. */
export default function PrivacyStatus(): JSX.Element {
  const [offlineState, setOfflineState] = useState<OfflineState>("checking");

  useEffect(() => {
    const updateConnection = (): void => {
      if (!navigator.onLine) {
        setOfflineState("offline");
      }
      else if (navigator.serviceWorker?.controller) {
        setOfflineState("available");
      }
      else {
        setOfflineState("limited");
      }
    };
    updateConnection();
    window.addEventListener("online", updateConnection);
    window.addEventListener("offline", updateConnection);
    navigator.serviceWorker?.addEventListener("controllerchange", updateConnection);

    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register(sitePath("/privacy-sw.js"), { scope: sitePath("/") })
        .catch(() => setOfflineState(navigator.onLine ? "limited" : "offline"));
    }

    return () => {
      window.removeEventListener("online", updateConnection);
      window.removeEventListener("offline", updateConnection);
      navigator.serviceWorker?.removeEventListener("controllerchange", updateConnection);
    };
  }, []);

  const offlineLabel = offlineState === "available"
    ? "Offline support active"
    : offlineState === "offline"
      ? "Currently offline"
      : offlineState === "limited"
        ? "Offline support preparing"
        : "Checking offline support";

  return <details className="privacy-status">
    <summary><span className={`privacy-status__dot privacy-status__dot--${offlineState}`} aria-hidden="true" /> Privacy &amp; offline</summary>
    <div className="privacy-status__panel">
      <h2>Privacy by design</h2>
      <ul>
        <li>Calculations run in this browser. Rechner has no account or calculator-data server.</li>
        <li>Rechner does not set or read cookies, and includes no analytics.</li>
        <li>A browser policy blocks app API connections. External source links open only when you choose them.</li>
        <li>Storage defaults to this page only. You can choose tab storage or explicitly save on this device.</li>
        <li>{offlineLabel}. First use requires a connection. Once this indicator is active, revisit this page and each calculator while online so their pages and files are cached.</li>
      </ul>
      <p className="privacy-status__limit">Your browser, device, and website host still control the initial page request and local data. Browser extensions or a compromised device are outside Rechner's control. Saved browser storage is not encrypted.</p>
    </div>
  </details>;
}
