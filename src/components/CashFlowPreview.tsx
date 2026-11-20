import {
  type JSX,
} from "preact";
import {
  useEffect,
  useState,
} from "preact/hooks";
import {
  parseAmount,
  amountText,
} from "#engine/lifeProfile/cashAmount";
import {
  type CashEventPayload,
  CashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  cashEventsForMonth,
} from "#engine/lifeProfile/cashEventView";
import {
  CashOverlapPolicy,
  projectCombinedCashFlow,
  toCashOverlapPolicy,
} from "#engine/lifeProfile/cashForecastOverlap";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  projectCashFlow,
} from "#engine/lifeProfile/cashFlowProjection";
import {
  type LifeEvent,
  type LifeEventId,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import CashFlowChart from "./CashFlowChart";
import {
  type CashScenario,
  type CashScenarioRecord,
  CashScenarioStatus,
  toCashScenarioId,
} from "#engine/lifeProfile/cashScenarioRecord";
import {
  readCashScenarios,
  writeCashScenarios,
} from "#engine/lifeProfile/cashScenarioStorage";

export interface CashFlowPreviewProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly date: string;
  readonly onDateChange: (date: string) => void;
  readonly includePlanned: boolean;
}

export default function CashFlowPreview({ events, personId, date, onDateChange, includePlanned }: CashFlowPreviewProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState("");
  const [inflow, setInflow] = useState("");
  const [expense, setExpense] = useState("");
  const [overlapPolicy, setOverlapPolicy] = useState<CashOverlapPolicy>(CashOverlapPolicy.KeepSeparate);
  const [extraEventIds, setExtraEventIds] = useState<readonly LifeEventId[]>([]);
  const [comparing, setComparing] = useState(false);
  const [alternativeOpening, setAlternativeOpening] = useState("");
  const [alternativeInflow, setAlternativeInflow] = useState("");
  const [alternativeExpense, setAlternativeExpense] = useState("");
  const [saved, setSaved] = useState<CashScenarioRecord>({ version: 1,
    scenarios: [] });
  const [ready, setReady] = useState(false);
  const [savingName, setSavingName] = useState("");
  const [editingId, setEditingId] = useState<CashScenario["id"] | undefined>();
  const [message, setMessage] = useState("");
  useEffect(() => {
    const decoded = readCashScenarios();
    if (decoded.status === CashScenarioStatus.Valid && decoded.record) {
      setSaved(decoded.record);
    }
    else if (decoded.status !== CashScenarioStatus.Missing) {
      setMessage("Saved cash scenarios could not be read. Export your data before making changes.");
      return;
    }
    setReady(true);
  }, []);

  function toggleExtraEvent(id: LifeEventId): void {
    setExtraEventIds((current) => current.includes(id)
      ? current.filter((item) => item !== id)
      : [...current, id]);
  }

  function loadScenario(id: string, alternative: boolean): void {
    const scenario = saved.scenarios.find((item) => item.id === id);
    if (!scenario) {
      return;
    }
    if (alternative && scenario.origin !== date.slice(0, 7)) {
      setMessage(`This alternative starts in ${scenario.origin}. Choose a first projection with the same start month.`);
      return;
    }
    if (alternative) {
      setAlternativeOpening(amountText(scenario.opening));
      setAlternativeInflow(amountText(scenario.inflow));
      setAlternativeExpense(amountText(scenario.expense));
    }
    else {
      onDateChange(`${scenario.origin}-01`);
      setOpening(amountText(scenario.opening));
      setInflow(amountText(scenario.inflow));
      setExpense(amountText(scenario.expense));
      setSavingName(scenario.name);
      setEditingId(scenario.id);
    }
    setMessage("");
  }

  function saveScenario(): void {
    try {
      const start = date.slice(0, 7);
      const startingCash = parseAmount(opening, true);
      const income = parseAmount(inflow, false);
      const costs = parseAmount(expense, false);
      if (!savingName.trim() || startingCash === undefined || income === undefined || costs === undefined) {
        throw new TypeError();
      }
      const scenario: CashScenario = { id: editingId ?? toCashScenarioId(crypto.randomUUID()),
        name: savingName.trim(),
        origin: start,
        opening: startingCash,
        inflow: income,
        expense: costs };
      const next: CashScenarioRecord = { version: 1,
        scenarios: editingId ? saved.scenarios.map((item) => item.id === editingId ? scenario : item) : [...saved.scenarios, scenario] };
      if (!writeCashScenarios(next, saved)) {
        setMessage("Could not save. Data may have changed elsewhere or storage may be unavailable; reload or export your data.");
        return;
      }
      setSaved(next);
      setEditingId(scenario.id);
      setSavingName(scenario.name);
      setMessage("Scenario saved.");
    }
    catch {
      setMessage("Enter a name, valid date and all three valid amounts before saving.");
    }
  }
  let rows: ReturnType<typeof projectCombinedCashFlow> = [];
  let alternativeRows: ReturnType<typeof projectCashFlow> = [];
  let windowEvents: readonly LifeEvent<CashEventPayload>[] = [];
  let invalid = false;
  let alternativeInvalid = false;
  if (expanded && date) {
    try {
      const start = toReplayMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
      const firstIndex = start.year * 12 + start.month - 1;
      const last = firstIndex + 5;
      const through = toReplayMonth(Math.floor(last / 12), last % 12 + 1);
      const months = Array.from({ length: 6 }, (_, index) => toReplayMonth(Math.floor((firstIndex + index) / 12), (firstIndex + index) % 12 + 1));
      windowEvents = months.flatMap((month) => cashEventsForMonth(events, personId, month, includePlanned));
      rows = projectCombinedCashFlow({
        origin: start,
        viewStart: start,
        through,
        opening: parseAmount(opening, true),
        assumption: {
          inflow: parseAmount(inflow, false),
          expense: parseAmount(expense, false),
        },
        events,
        personId,
        includePlanned,
        policy: overlapPolicy,
        extraEventIds: new Set(extraEventIds),
      });
    }
    catch {
      invalid = true;
    }
    if (comparing) {
      try {
        const start = toReplayMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
        const last = start.year * 12 + start.month - 1 + 5;
        const through = toReplayMonth(Math.floor(last / 12), last % 12 + 1);
        alternativeRows = projectCashFlow(start, start, through, parseAmount(alternativeOpening, true), {
          inflow: parseAmount(alternativeInflow, false),
          expense: parseAmount(alternativeExpense, false),
        });
      }
      catch {
        alternativeInvalid = true;
      }
    }
  }
  const hasCompleteChart = rows.length > 0 && rows[0].state.opening !== undefined
    && rows.every(({ state }) => state.closing !== undefined);
  return <section className="life-monthly" aria-label="Cash flow what-if">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide cash flow what-if" : "Try cash flow what-if"}
    </button>
    {expanded && <>
      <p>Enter an opening balance before the selected month and a constant monthly inflow and expense. By default, recurring assumptions stay separate from timeline cash events to prevent double-counting. Named scenarios store only the recurring assumptions; negative balances indicate a shortfall and no funding is assumed.</p>
      <div className="life-people__form">
        <label className="life-people__field">Opening balance (€)
          <input type="number" step="0.01" value={opening} onInput={(event) => setOpening(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Monthly inflow (€)
          <input type="number" min="0" step="0.01" value={inflow} onInput={(event) => setInflow(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Monthly expenses (€)
          <input type="number" min="0" step="0.01" value={expense} onInput={(event) => setExpense(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Overlap with timeline cash events
          <select value={overlapPolicy} onChange={(event) => setOverlapPolicy(toCashOverlapPolicy(event.currentTarget.value))}>
            <option value={CashOverlapPolicy.KeepSeparate}>Keep separate (recurring assumptions only)</option>
            <option value={CashOverlapPolicy.AddExplicitExtraEventsOnly}>Add selected extra events on top of recurring</option>
            <option value={CashOverlapPolicy.EventsReplaceRecurringInEventMonths}>Use cash events instead of recurring in months with entries</option>
          </select>
        </label>
      </div>
      {overlapPolicy === CashOverlapPolicy.AddExplicitExtraEventsOnly && <div className="life-timeline__view">
        <p>Select only one-off cash events not already covered by your recurring monthly inflow or expenses. Unselected entries are excluded to prevent double-counting.</p>
        {windowEvents.length === 0 ? <p>No active cash events in these six months.</p> : <ul className="life-people__list">
          {windowEvents.map((entry) => <li key={entry.id}>
            <label>
              <input type="checkbox" checked={extraEventIds.includes(entry.id)} onChange={() => toggleExtraEvent(entry.id)} />
              {" "}{entry.date} · {entry.payload.title} · {entry.status === LifeEventStatus.Actual ? "Happened" : "Planned"} · {entry.payload.direction === CashDirection.Inflow ? "Inflow" : "Expense"} {formatIntegerEuroCents(entry.payload.amount)}
            </label>
          </li>)}
        </ul>}
      </div>}
      <div className="life-people__form">
        <label className="life-people__field">Scenario name
          <input value={savingName} onInput={(event) => setSavingName(event.currentTarget.value)} />
        </label>
        <button type="button" className="ui-btn" disabled={!ready} onClick={saveScenario}>{editingId ? "Update saved scenario" : "Save scenario"}</button>
        {editingId && <button type="button" className="ui-btn" onClick={() => {
          setEditingId(undefined); setSavingName(""); setMessage("Enter a name to save a new scenario.");
        }}>Save as new</button>}
        {saved.scenarios.length > 0 && <label className="life-people__field">Load saved scenario
          <select value="" onChange={(event) => loadScenario(event.currentTarget.value, false)}>
            <option value="">Choose a scenario</option>
            {saved.scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.name} · {scenario.origin}</option>)}
          </select>
        </label>}
      </div>
      {message && <p role="status">{message}</p>}
      {invalid ? <p role="status">Check the date and amounts.</p> : !date ? <p>Choose a view date above.</p>
        : opening === "" || inflow === "" || expense === "" ? <p>Enter all three amounts to calculate a balance.</p>
          : <>{hasCompleteChart && <CashFlowChart balances={[rows[0].state.opening!, ...rows.map(({ state }) => state.closing!)]} />}
            <div className="life-monthly__scroll"><table>
              <thead><tr><th>Month</th><th className="life-monthly__amount">Opening</th><th className="life-monthly__amount">Inflow</th><th className="life-monthly__amount">Expenses</th><th className="life-monthly__amount">Closing</th>{overlapPolicy !== CashOverlapPolicy.KeepSeparate && <th>Overlap rule</th>}</tr></thead>
              <tbody>{rows.map(({ month, state }) => <tr key={month.id}>
                <th scope="row">{String(month.month).padStart(2, "0")}/{month.year}</th>
                <td className="life-monthly__amount">{state.opening === undefined ? "Unknown" : formatIntegerEuroCents(state.opening)}</td>
                <td className="life-monthly__amount">{state.contribution?.inflow === undefined ? "Unknown" : formatIntegerEuroCents(state.contribution.inflow)}</td>
                <td className="life-monthly__amount">{state.contribution?.expense === undefined ? "Unknown" : formatIntegerEuroCents(state.contribution.expense)}</td>
                <td className="life-monthly__amount">{state.closing === undefined ? "Unknown" : formatIntegerEuroCents(state.closing)}</td>
                {overlapPolicy !== CashOverlapPolicy.KeepSeparate && <td>
                  <div>{state.contribution?.recurringApplied ? "Recurring applied" : "Recurring replaced by cash events"}</div>
                  {state.contribution?.includedSources.map((entry) => <div key={entry.id}>
                    Included: {entry.date} · {entry.payload.title} ({formatIntegerEuroCents(entry.payload.amount)})
                  </div>)}
                  {state.contribution?.excludedSources.map((entry) => <div key={entry.id}>
                    Excluded to avoid overlap: {entry.date} · {entry.payload.title} ({formatIntegerEuroCents(entry.payload.amount)})
                  </div>)}
                </td>}
              </tr>)}</tbody>
            </table></div></>}
      <button type="button" className="ui-btn" aria-expanded={comparing} onClick={() => setComparing((value) => !value)}>
        {comparing ? "Hide comparison" : "Compare an alternative"}
      </button>
      {comparing && <section aria-label="Cash flow comparison">
        <p>Enter another set of assumptions for the same six months, or load a saved scenario. Changes to the alternative are not saved unless loaded into the first projection and saved.</p>
        {saved.scenarios.length > 0 && <label className="life-people__field">Load alternative
          <select value="" onChange={(event) => loadScenario(event.currentTarget.value, true)}>
            <option value="">Choose a scenario</option>
            {saved.scenarios.map((scenario) => <option value={scenario.id} key={scenario.id}>{scenario.name} · {scenario.origin}</option>)}
          </select>
        </label>}
        <div className="life-people__form">
          <label className="life-people__field">Alternative opening balance (€)
            <input type="number" step="0.01" value={alternativeOpening} onInput={(event) => setAlternativeOpening(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Alternative monthly inflow (€)
            <input type="number" min="0" step="0.01" value={alternativeInflow} onInput={(event) => setAlternativeInflow(event.currentTarget.value)} />
          </label>
          <label className="life-people__field">Alternative monthly expenses (€)
            <input type="number" min="0" step="0.01" value={alternativeExpense} onInput={(event) => setAlternativeExpense(event.currentTarget.value)} />
          </label>
        </div>
        {invalid || alternativeInvalid ? <p role="status">Check the date and amounts for both alternatives.</p>
          : !date || [opening, inflow, expense, alternativeOpening, alternativeInflow, alternativeExpense].some((value) => value.trim() === "")
            ? <p>Enter all amounts for both alternatives and choose a view date to compare them.</p>
            : <div className="life-monthly__scroll"><table>
              <caption>Estimated closing balances</caption>
              <thead><tr><th scope="col">Month</th><th scope="col" className="life-monthly__amount">First projection</th><th scope="col" className="life-monthly__amount">Alternative</th></tr></thead>
              <tbody>{rows.map(({ month, state }, index) => <tr key={month.id}>
                <th scope="row">{String(month.month).padStart(2, "0")}/{month.year}</th>
                <td className="life-monthly__amount">{state.closing === undefined ? "Unknown" : formatIntegerEuroCents(state.closing)}</td>
                <td className="life-monthly__amount">{alternativeRows[index]?.state.closing === undefined ? "Unknown" : formatIntegerEuroCents(alternativeRows[index].state.closing!)}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>}
    </>}
  </section>;
}
