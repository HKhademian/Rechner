import "#/components/DomainCalculator.css";
import "#/components/LifeMonthlyView.css";
import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import {
  assetAffordabilityStore,
} from "#/apps/asset-affordability/assetAffordabilityStore.ts";
import {
  useHydrated,
} from "#/components/ui/useHydrated.ts";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";
import {
  AppShell,
} from "#components/ui/AppShell";
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
  AssetActionKind,
  AssetCategory,
  assetEventModule,
  toAssetActionKind,
  toAssetCategory,
  toLifeAssetId,
} from "#engine/lifeProfile/assetEvent";
import {
  AssetAffordabilityStatus,
  calculatorPathForAssetCategory,
  evaluateAssetAffordability,
} from "#engine/lifeProfile/assetProjection";
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
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

const STANDALONE_PERSON = toPersonId("standalone-buyer");

function formatAffordabilityStatus(status: AssetAffordabilityStatus): string {
  if (status === AssetAffordabilityStatus.Comfortable) {
    return "Comfortable";
  }
  if (status === AssetAffordabilityStatus.Stretched) {
    return "Stretched (30–45% share)";
  }
  return "Unfunded / Over 45%";
}

export default function AssetAffordabilityCalculator(): JSX.Element {
  const hydrated = useHydrated();
  const state = hydrated ? assetAffordabilityStore.state.value : assetAffordabilityStore.defaultState;

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<AssetCategory>(AssetCategory.Housing);
  const [action, setAction] = useState<AssetActionKind>(AssetActionKind.Purchase);
  const [upfrontEur, setUpfrontEur] = useState(10000);
  const [ongoingMonthlyEur, setOngoingMonthlyEur] = useState(300);
  const [monthlySavingsEur, setMonthlySavingsEur] = useState(0);

  const syntheticEvents: LifeEvent<unknown>[] = state.entries.map((entry) => ({
    id: toLifeEventId(entry.id),
    personId: STANDALONE_PERSON,
    kind: assetEventModule.kind,
    status: LifeEventStatus.Planned,
    date: /^\d{4}-\d{2}-\d{2}$/.test(entry.date) ? toLifeDate(entry.date) : toLifeDate("2026-06-01"),
    payload: {
      assetId: toLifeAssetId(entry.assetId),
      category: entry.category,
      action: entry.action,
      title: entry.title,
      upfrontCents: toEuroCents(Math.round(entry.upfrontEur * 100)),
      ongoingMonthlyCents: toEuroCents(Math.round(entry.ongoingMonthlyEur * 100)),
      monthlySavingsCents: toEuroCents(Math.round(entry.monthlySavingsEur * 100)),
      ...(entry.alreadyInCashHistory ? { linkedCashEventId: toLifeEventId(`linked-cash-${entry.id}`) } : {}),
    },
  }));

  const result = evaluateAssetAffordability({
    events: syntheticEvents,
    personId: STANDALONE_PERSON,
    includePlanned: true,
    availableSavingsCents: toEuroCents(Math.round(state.availableSavingsEur * 100)),
    monthlyNetIncomeCents: toEuroCents(Math.round(state.monthlyNetIncomeEur * 100)),
  });

  function addEntry(): void {
    const trimmed = title.trim();
    if (!trimmed) {
      return;
    }
    const stamp = Date.now();
    assetAffordabilityStore.update((s) => ({
      ...s,
      entries: [
        ...s.entries,
        {
          id: `ae-${stamp}`,
          assetId: `asset-${stamp}`,
          category,
          action,
          title: trimmed,
          date: "2026-06-01",
          upfrontEur,
          ongoingMonthlyEur,
          monthlySavingsEur,
          alreadyInCashHistory: false,
        },
      ],
    }));
    setTitle("");
  }

  function toggleLinkedCash(id: string): void {
    assetAffordabilityStore.update((s) => ({
      ...s,
      entries: s.entries.map((item) => (item.id === id ? { ...item,
        alreadyInCashHistory: !item.alreadyInCashHistory } : item)),
    }));
  }

  function removeEntry(id: string): void {
    assetAffordabilityStore.update((s) => ({
      ...s,
      entries: s.entries.filter((item) => item.id !== id),
    }));
  }

  const statusTone = result.affordabilityStatus === AssetAffordabilityStatus.Comfortable
    ? MetricTone.Gain
    : result.affordabilityStatus === AssetAffordabilityStatus.Stretched
      ? MetricTone.Neutral
      : MetricTone.Loss;

  return <AppShell currentPath={calculatorPath(AppId.AssetAffordability)}>
    <main className="domain-calc-page">
      <PageHeader
        eyebrow="Major Purchases & Assets · Demo"
        title="Purchases, Housing, Cars &amp; Solar Affordability"
        subtitle="Compare upfront cash requirements, sale proceeds, ongoing monthly costs and solar/efficiency savings with single-counted cash tracking standalone."
        actions={<button type="button" className="ui-btn ui-btn--sm" onClick={assetAffordabilityStore.reset}>Reset</button>}
      />

      <section className="domain-calc-metrics" aria-label="Asset affordability highlights">
        <MetricCard
          label="Affordability Status"
          value={formatAffordabilityStatus(result.affordabilityStatus)}
          tone={statusTone}
          subtitle={result.ongoingIncomeSharePercent !== undefined ? `${result.ongoingIncomeSharePercent}% of monthly net income` : "Enter net income below"}
        />
        <MetricCard
          label="Total Upfront / Gap"
          value={formatIntegerEuroCents(result.totalUpfrontAllCents)}
          tone={result.liquidSavingsGapCents > 0 ? MetricTone.Loss : MetricTone.Gain}
          subtitle={result.liquidSavingsGapCents > 0
            ? `Savings gap: ${formatIntegerEuroCents(result.liquidSavingsGapCents)}`
            : `Covered by savings (${formatIntegerEuroCents(result.unlinkedUpfrontCents)} incremental)`}
        />
        <MetricCard
          label="Net Ongoing Monthly"
          value={formatIntegerEuroCents(result.netActiveMonthlyImpactCents)}
          tone={MetricTone.Primary}
          subtitle={`${formatIntegerEuroCents(result.activeOngoingMonthlyCents)} costs − ${formatIntegerEuroCents(result.activeMonthlySavingsCents)} savings`}
        />
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="aa-budget-heading">
        <h2 id="aa-budget-heading">Available Budget &amp; Add Purchase / Installation / Sale</h2>
        <div className="domain-calc-grid">
          <NumberField
            id="aa-savings"
            label="Available liquid savings"
            value={state.availableSavingsEur}
            min={0}
            max={5000000}
            step={1000}
            unit="€"
            onChange={(v) => assetAffordabilityStore.update((s) => ({ ...s,
              availableSavingsEur: v }))}
          />
          <NumberField
            id="aa-net"
            label="Monthly household net income"
            value={state.monthlyNetIncomeEur}
            min={0}
            max={100000}
            step={100}
            unit="€"
            onChange={(v) => assetAffordabilityStore.update((s) => ({ ...s,
              monthlyNetIncomeEur: v }))}
          />
          <div className="ui-field">
            <label htmlFor="aa-title" className="ui-field__label">Item title</label>
            <input
              id="aa-title"
              type="text"
              className="ui-input"
              placeholder="e.g. Heat Pump or Apartment Down Payment"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            />
          </div>
          <div className="ui-field">
            <label htmlFor="aa-cat" className="ui-field__label">Category</label>
            <select id="aa-cat" className="ui-input" value={category} onChange={(e) => setCategory(toAssetCategory((e.target as HTMLSelectElement).value))}>
              <option value={AssetCategory.Housing}>Housing</option>
              <option value={AssetCategory.Car}>Car / Vehicle</option>
              <option value={AssetCategory.Solar}>Solar PV / Energy</option>
              <option value={AssetCategory.MajorPurchase}>Major Purchase</option>
            </select>
          </div>
          <div className="ui-field">
            <label htmlFor="aa-action" className="ui-field__label">Action</label>
            <select id="aa-action" className="ui-input" value={action} onChange={(e) => setAction(toAssetActionKind((e.target as HTMLSelectElement).value))}>
              <option value={AssetActionKind.Purchase}>Purchase</option>
              <option value={AssetActionKind.Installation}>Installation</option>
              <option value={AssetActionKind.OwnershipChange}>Ownership change</option>
              <option value={AssetActionKind.Sale}>Sale (proceeds)</option>
            </select>
          </div>
          <NumberField id="aa-upfront" label="Upfront cost or sale proceeds" value={upfrontEur} min={0} max={5000000} step={500} unit="€" onChange={setUpfrontEur} />
          <NumberField id="aa-ongoing" label="Ongoing monthly cost" value={ongoingMonthlyEur} min={0} max={50000} step={25} unit="€" onChange={setOngoingMonthlyEur} />
          <NumberField id="aa-monthly-save" label="Monthly savings (e.g. solar)" value={monthlySavingsEur} min={0} max={50000} step={25} unit="€" onChange={setMonthlySavingsEur} />
        </div>
        <div>
          <button type="button" className="ui-btn ui-btn--sm" onClick={addEntry}>Add asset event</button>
        </div>
      </section>

      <section className="ui-card domain-calc-card" aria-labelledby="aa-table-heading">
        <h2 id="aa-table-heading">Tracked Assets &amp; Single-Counting Check</h2>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Category / Action</th>
                <th>Upfront</th>
                <th>Net monthly</th>
                <th>Cash link</th>
                <th>Deep calculator</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {result.rows.map((row) => <tr key={row.eventId}>
                <th scope="row">{row.payload.title}</th>
                <td>{row.payload.category} · {row.payload.action}</td>
                <td>{row.payload.upfrontCents !== undefined ? formatIntegerEuroCents(row.payload.upfrontCents) : "—"}</td>
                <td>{formatIntegerEuroCents(row.netOngoingMonthlyCents)}/mo</td>
                <td>
                  <label className="ui-check">
                    <input
                      type="checkbox"
                      checked={row.countedInLinkedCash}
                      onChange={() => toggleLinkedCash(row.eventId)}
                    />
                    <span>{row.countedInLinkedCash ? "Counted once" : "Unlinked"}</span>
                  </label>
                </td>
                <td>
                  <a href={calculatorPathForAssetCategory(row.payload.category)}>Open specialist tool</a>
                </td>
                <td>
                  <button type="button" className="ui-btn ui-btn--sm" onClick={() => removeEntry(row.eventId)}>Remove</button>
                </td>
              </tr>)}
            </tbody>
          </table>
        </div>

        <CalculationExplanationPanel explanation={result.explanation} summary="Explain asset affordability formula and single-counting rule" />
      </section>
    </main>
  </AppShell>;
}
