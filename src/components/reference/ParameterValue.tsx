import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import {
  formatParameterValue,
  getAvailableParameterYears,
  resolveParameterForYear,
} from "#engine/parameters/registry";
import {
  type ParameterId,
  ParameterUnit,
} from "#engine/parameters/types";
import {
  DEFAULT_TAX_YEAR,
} from "#engine/tax/taxRules";
import {
  toFullCalendarYear,
} from "#engine/types";
import {
  activeParameterYear,
  customParameterOverrides,
  modifyParameterValue,
  resetParameterOverride,
  setParameterYear,
} from "#store/parameterStore";

/** Uses the shared parameter store so the detail page and existing editor stay in sync. */
export function ParameterValue({ id }: { readonly id: ParameterId }): JSX.Element {
  const hydrated = useHydrated();
  const year = hydrated ? activeParameterYear.value : DEFAULT_TAX_YEAR;
  const item = resolveParameterForYear(id, year, hydrated ? customParameterOverrides.value : {});
  const [draft, setDraft] = useState<string | undefined>(undefined);
  const [message, setMessage] = useState("");
  const inputId = "parameter-detail-value";
  const save = (event: JSX.TargetedEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const text = draft ?? String(item.activeValue);
    if (!text.trim() || !Number.isFinite(Number(text))) {
      setMessage("Enter a valid number.");
      return;
    }
    const result = modifyParameterValue(id, Number(text));
    if (!result.ok) {
      setMessage(result.flag.message);
      return;
    }
    setDraft(undefined);
    setMessage("Saved.");
  };
  return <section className="ui-card reference-value" aria-labelledby="parameter-value-heading">
    <h2 id="parameter-value-heading">Value</h2>
    <label>Year
      <select value={year} onChange={(event) => {
        setParameterYear(toFullCalendarYear(Number(event.currentTarget.value)));
        setDraft(undefined);
        setMessage("");
      }}>
        {getAvailableParameterYears().map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </label>
    <p>Year and overrides are shared with the rates editor.</p>
    <p><strong className="reference-value__amount">{formatParameterValue(item.activeValue, item.definition.unit)}</strong>{item.overridden ? " · Custom" : " · Default"}</p>
    {item.overridden && <p>Default: {formatParameterValue(item.baselineValue, item.definition.unit)}</p>}
    {item.projected && item.sourceYear && <p>Based on the {item.sourceYear} table.</p>}
    <p><a href={item.source}>Source</a></p>
    {item.editable ? <form onSubmit={save} className="reference-value__form">
      <label htmlFor={inputId}>Custom value</label>
      {item.definition.unit === ParameterUnit.PercentageRate && <p>Enter a decimal: 0.02 means 2%.</p>}
      <input id={inputId} type="number" step={item.definition.bounds.integerOnly ? "1" : "any"} min={item.definition.bounds.min} max={item.definition.bounds.max} value={draft ?? String(item.activeValue)} onInput={(event) => {
        setDraft(event.currentTarget.value); setMessage(""); 
      }} />
      <div className="reference-value__actions"><button className="ui-btn ui-btn--primary" type="submit">Apply</button>{item.overridden && <button className="ui-btn" type="button" onClick={() => {
        resetParameterOverride(id); setDraft(undefined); setMessage("Default restored."); 
      }}>Reset</button>}</div>
      <p role="status" aria-live="polite">{message}</p>
    </form> : <p>This value is locked.</p>}
  </section>;
}
