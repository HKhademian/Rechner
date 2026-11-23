import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";


import {
  cashReconciliationStore,
} from "#/apps/cash-reconciliation/cashReconciliationStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";


import {
  MetricCard,
  MetricTone,
} from "#components/ui/MetricCard";
import {
  NumberField,
} from "#components/ui/NumberField";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  type CashEventPayload,
  CashDirection,
  cashEventModule,
  toCashDirection,
} from "#engine/lifeProfile/cashEvent";
import {
  type CashVariance,
  comparePlannedAndActualCash,
  reconciledPlannedIds,
  reconcilingActualByPlannedId,
} from "#engine/lifeProfile/cashReconciliation";
import {
  toLifeDate,
  toPersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
  toLifeEventId,
} from "#engine/lifeProfile/timeline";
import {
  toEuroCents,
} from "#engine/types";
import {
  formatEurCents,
} from "#utils/currencyFormat";

const STANDALONE_PERSON = toPersonId("standalone-cash");

export default function CashReconciliationCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? cashReconciliationStore.state.value : cashReconciliationStore.defaultState;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState("2026-04-20");
  const [status, setStatus] = useState<LifeEventStatus>(LifeEventStatus.Actual);
  const [direction, setDirection] = useState<CashDirection>(CashDirection.Outflow);
  const [amountEur, setAmountEur] = useState(110.5);

  const syntheticEvents: LifeEvent<CashEventPayload>[] = state.entries.map((entry) => ({
    id: toLifeEventId(entry.id),
    personId: STANDALONE_PERSON,
    kind: cashEventModule.kind,
    status: entry.status,
    date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? toLifeDate(entry.date) : toLifeDate("2026-04-01"),
    payload: {
      title: entry.title,
      direction: entry.direction,
      amount: toEuroCents(entry.amountCents),
      ...(entry.reconcilesEventId ? { reconcilesEventId: toLifeEventId(entry.reconcilesEventId) } : {}),
    },
  }));

  const settledByPlanned = reconcilingActualByPlannedId(syntheticEvents, STANDALONE_PERSON);
  const settledIds = reconciledPlannedIds(syntheticEvents, STANDALONE_PERSON);
  const plannedEvents = syntheticEvents.filter((event) => event.status === LifeEventStatus.Planned);
  const actualEvents = syntheticEvents.filter((event) => event.status === LifeEventStatus.Actual);

  const variances: CashVariance[] = [];
  for (const planned of plannedEvents) {
    const actual = settledByPlanned.get(planned.id);
    if (actual) {
      variances.push(comparePlannedAndActualCash(planned, actual));
    }
  }

  let reconciledNetCents = 0;
  let naiveDoubleCountedNetCents = 0;
  for (const event of syntheticEvents) {
    const signed = event.payload.direction === CashDirection.Inflow ? event.payload.amount : -event.payload.amount;
    naiveDoubleCountedNetCents += signed;
    if (event.status === LifeEventStatus.Planned && settledIds.has(event.id)) {
      continue;
    }
    reconciledNetCents += signed;
  }

  const totalVarianceCents = variances.reduce((sum, item) => sum + item.netImpactDifference, 0);

  function addEntry(): void {
    const trimmed = title.trim();
    const cents = Math.round(amountEur * 100);
    if (!trimmed || cents <= 0) {
      return;
    }
    cashReconciliationStore.update((s) => ({
      ...s,
      entries: [
        ...s.entries,
        {
          id: `cash-${Date.now()}`,
          date,
          title: trimmed,
          status,
          direction,
          amountCents: cents,
        },
      ],
    }));
    setTitle("");
  }

  function linkActualToPlanned(actualId: string, plannedId: string): void {
    cashReconciliationStore.update((s) => ({
      ...s,
      entries: s.entries.map((item) => {
        if (item.id !== actualId) {
          return item;
        }
        if (!plannedId) {
          const { reconcilesEventId: _removed, ...rest } = item;
          return rest;
        }
        return { ...item,
          reconcilesEventId: plannedId };
      }),
    }));
  }

  function removeEntry(id: string): void {
    cashReconciliationStore.update((s) => ({
      ...s,
      entries: s.entries
        .filter((item) => item.id !== id)
        .map((item) => {
          if (item.reconcilesEventId !== id) {
            return item;
          }
          const { reconcilesEventId: _removed, ...rest } = item;
          return rest;
        }),
    }));
  }

  return <>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Budget vs. Actuals · Demo"
        title="Planned vs. Actual Cash Reconciliation"
        subtitle="Record planned budget entries and actual receipts, link settled pairs so every transaction is counted once, and review exact-cent variances."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={cashReconciliationStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Cash reconciliation highlights">
        <MetricCard
          label="Single-Counted Net Cashflow"
          value={formatEurCents(toEuroCents(reconciledNetCents))}
          tone={reconciledNetCents >= 0 ? MetricTone.Gain : MetricTone.Primary}
          subtitle={`Naive unlinked sum would be ${formatEurCents(toEuroCents(naiveDoubleCountedNetCents))}`}
        />
        <MetricCard
          label="Reconciled Pairs"
          value={`${variances.length} / ${plannedEvents.length}`}
          subtitle={`${plannedEvents.length - variances.length} open planned item(s) remaining`}
        />
        <MetricCard
          label="Total Reconciled Net Variance"
          value={`${totalVarianceCents >= 0 ? "+" : ""}${formatEurCents(toEuroCents(totalVarianceCents))}`}
          tone={totalVarianceCents >= 0 ? MetricTone.Gain : MetricTone.Loss}
          subtitle="Actual net impact minus planned net impact"
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cr-add-heading">
        <h2 id="cr-add-heading">Add Planned or Actual Cash Entry</h2>
        <div className="domain-calc-grid">
          <div className="ui-field">
            <label htmlFor="cr-title" className="ui-field__label">Description</label>
            <input id="cr-title" type="text" className="ui-input" placeholder="e.g. Internet Bill" value={title} onInput={(e) => setTitle((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="cr-date" className="ui-field__label">Date</label>
            <input id="cr-date" type="date" className="ui-input" value={date} onChange={(e) => setDate((e.target as HTMLInputElement).value)} />
          </div>
          <div className="ui-field">
            <label htmlFor="cr-status" className="ui-field__label">Status</label>
            <select
              id="cr-status"
              className="ui-input"
              value={status}
              onChange={(e) => setStatus((e.target as HTMLSelectElement).value === LifeEventStatus.Planned ? LifeEventStatus.Planned : LifeEventStatus.Actual)}
            >
              <option value={LifeEventStatus.Planned}>Planned budget item</option>
              <option value={LifeEventStatus.Actual}>Actual settled transaction</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="cr-dir" className="ui-field__label">Direction</label>
            <select id="cr-dir" className="ui-input" value={direction} onChange={(e) => setDirection(toCashDirection((e.target as HTMLSelectElement).value))}>
              <option value={CashDirection.Outflow}>Outflow (expense)</option>
              <option value={CashDirection.Inflow}>Inflow (income/refund)</option>
            </select>
          </div>
          <NumberField id="cr-amount" label="Amount (exact cents supported)" value={amountEur} min={0.01} max={1000000} step={0.5} unit="€" onChange={setAmountEur} />
        </div>
        <div>
          <button type="button" className="ui-btn ui-btn--sm" onClick={addEntry}>Add entry</button>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cr-var-heading">
        <h2 id="cr-var-heading">Reconciled Planned vs. Actual Variances</h2>
        {variances.length === 0
          ? <p>No planned items are linked to actual transactions yet. Link an actual entry in the ledger below.</p>
          : <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Planned item</th>
                  <th>Actual transaction</th>
                  <th>Planned</th>
                  <th>Actual</th>
                  <th>Net impact variance</th>
                  <th>Date shift</th>
                </tr>
              </thead>
              <tbody>
                {variances.map((v) => <tr key={v.actual.id}>
                  <th scope="row">{v.planned.payload.title}</th>
                  <td>{v.actual.payload.title}</td>
                  <td>{formatEurCents(v.planned.payload.amount)} ({v.planned.payload.direction})</td>
                  <td>{formatEurCents(v.actual.payload.amount)} ({v.actual.payload.direction})</td>
                  <td>{v.netImpactDifference >= 0 ? "+" : ""}{formatEurCents(v.netImpactDifference)}</td>
                  <td>{v.dateChanged ? `${v.planned.date ?? "—"} -> ${v.actual.date ?? "—"}` : "Same day"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>}
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="cr-ledger-heading">
        <h2 id="cr-ledger-heading">All Entries &amp; 1-to-1 Linking</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Description</th>
                <th>Status</th>
                <th>Amount</th>
                <th>Reconciles planned item</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {syntheticEvents.map((event) => {
                const isActual = event.status === LifeEventStatus.Actual;
                const currentLink = event.payload.reconcilesEventId ?? "";
                const availablePlanned = plannedEvents.filter((p) => {
                  const takenBy = settledByPlanned.get(p.id);
                  return !takenBy || takenBy.id === event.id;
                });
                return <tr key={event.id}>
                  <td>{event.date ?? "—"}</td>
                  <th scope="row">{event.payload.title}</th>
                  <td>{isActual ? "Actual" : settledIds.has(event.id) ? "Planned (settled)" : "Planned (open)"}</td>
                  <td>{event.payload.direction === CashDirection.Inflow ? "+" : "−"}{formatEurCents(event.payload.amount)}</td>
                  <td>
                    {isActual
                      ? <select
                        aria-label={`Link planned item for ${event.payload.title}`}
                        className="ui-input"
                        value={currentLink}
                        onChange={(e) => linkActualToPlanned(event.id, (e.target as HTMLSelectElement).value)}
                      >
                        <option value="">Standalone actual (unlinked)</option>
                        {availablePlanned.map((p) => <option key={p.id} value={p.id}>{p.payload.title} ({formatEurCents(p.payload.amount)})</option>)}
                      </select>
                      : settledIds.has(event.id) ? "Counted via linked actual" : `${actualEvents.length} actual(s) available`}
                  </td>
                  <td>
                    <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeEntry(event.id)}>Remove</button>
                  </td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  </>;
}
