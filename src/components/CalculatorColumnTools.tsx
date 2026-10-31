import "./CalculatorColumnTools.css";
import {
  type JSX,
} from "preact";
import {
  useRef,
  useState,
} from "preact/hooks";
import {
  batch,
} from "@preact/signals";
import {
  type SavedScenarioItem,
  importCalculatorScenario,
  moveScenarioLeft,
  moveScenarioRight,
} from "#store/calculatorStore";
import {
  serializeCalculatorScenario,
} from "#engine/storage/calculatorScenario";
import {
  ImportDataIcon,
  JsonExportIcon,
} from "#components/Icons";

/** A selected file replaces live inputs only after complete validation and payroll recalculation. */
export function LiveColumnImport({ onImported }: { onImported: () => void }): JSX.Element {
  const fileInput = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  return <div className="calculator-column-tools">
    <button type="button" disabled={busy} title="Import a saved calculator JSON file into live inputs" onClick={() => fileInput.current?.click()}>
      <ImportDataIcon size={16} /> {busy ? "Importing…" : "Import"}
    </button>
    <input ref={fileInput} type="file" accept=".json,application/json" hidden aria-label="Import calculator scenario file"
      onChange={async (event) => {
        const input = event.currentTarget;
        const file = input.files?.[0];
        if (!file) {
          return;
        }
        setBusy(true);
        setError("");
        setMessage("");
        try {
          const payload: unknown = JSON.parse(await file.text());
          batch(() => {
            importCalculatorScenario(payload);
            onImported();
          });
          setMessage(`Imported ${file.name} into live inputs.`);
        }
        catch (problem) {
          setError(problem instanceof Error ? problem.message : "Could not import this calculator file.");
        }
        finally {
          input.value = "";
          setBusy(false);
        }
      }} />
    {message && <small role="status">{message}</small>}
    {error && <small role="alert">Import failed. {error} Live inputs were kept.</small>}
  </div>;
}

/** Export intentionally uses committed saved inputs, even while that column has an open draft. */
export function SavedColumnTools({ scenario, first, last }: { scenario: SavedScenarioItem;
  first: boolean;
  last: boolean }): JSX.Element {
  const [error, setError] = useState("");
  return <div className="calculator-column-tools" role="group" aria-label={`${scenario.title}: Column tools`}>
    <button type="button" aria-label={`${scenario.title}: Export saved scenario`} title="Download saved values as JSON; unsaved edits are excluded"
      onClick={() => {
        setError("");
        try {
          const url = URL.createObjectURL(new Blob([serializeCalculatorScenario(scenario)], { type: "application/json" }));
          const link = document.createElement("a");
          link.href = url;
          link.download = `net-pay-${scenario.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.json`;
          document.body.append(link);
          link.click();
          link.remove();
          setTimeout(() => URL.revokeObjectURL(url), 0);
        }
        catch (problem) {
          setError(problem instanceof Error ? problem.message : "Could not export this scenario.");
        }
      }}><JsonExportIcon size={16} /> Export saved</button>
    <button type="button" aria-label={`${scenario.title}: Move left`} disabled={first} onClick={() => moveScenarioLeft(scenario.id)}>Move left</button>
    <button type="button" aria-label={`${scenario.title}: Move right`} disabled={last} onClick={() => moveScenarioRight(scenario.id)}>Move right</button>
    {error && <small role="alert">{error}</small>}
  </div>;
}
