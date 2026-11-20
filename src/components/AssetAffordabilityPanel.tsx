import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type PersonId,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  parseAmount,
} from "#engine/lifeProfile/cashAmount";
import {
  AssetAffordabilityStatus,
  calculatorPathForAssetCategory,
  evaluateAssetAffordability,
} from "#engine/lifeProfile/assetProjection";
import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";

export interface AssetAffordabilityPanelProps {
  readonly events: readonly LifeEvent<unknown>[];
  readonly personId: PersonId;
  readonly includePlanned: boolean;
}

function tryCents(text: string): EuroCents | undefined {
  if (!text.trim()) {
    return toEuroCents(0);
  }
  try {
    return parseAmount(text, true);
  }
  catch {
    return undefined;
  }
}

function formatStatus(status: AssetAffordabilityStatus): string {
  if (status === AssetAffordabilityStatus.Comfortable) {
    return "Comfortable";
  }
  if (status === AssetAffordabilityStatus.Stretched) {
    return "Stretched";
  }
  return "Unfunded / High burden";
}

export default function AssetAffordabilityPanel({
  events,
  personId,
  includePlanned,
}: AssetAffordabilityPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [savingsText, setSavingsText] = useState("40000");
  const [netIncomeText, setNetIncomeText] = useState("4500");

  const savings = tryCents(savingsText);
  const netIncome = tryCents(netIncomeText);
  const result = expanded && savings !== undefined && netIncome !== undefined
    ? evaluateAssetAffordability({
      events,
      personId,
      includePlanned,
      availableSavingsCents: savings,
      monthlyNetIncomeCents: netIncome,
    })
    : undefined;

  return <section className="life-monthly" aria-label="Purchases, housing, cars and solar affordability">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide purchases, housing, car & solar view" : "Compare purchases, housing, cars & solar"}
    </button>
    {expanded && <>
      <p>Track purchases, ownership changes, sales and installations. Upfront costs linked to a timeline cash entry are flagged and counted once. Explore detailed calculators: <a href="/calculators/mortgage/">Mortgage</a>, <a href="/calculators/housing/">Housing &amp; KfW</a>, <a href="/calculators/company-car/">Company Car</a>, <a href="/calculators/solar-energy/">Solar PV</a>.</p>
      <div className="life-people__form">
        <label className="life-people__field">Available liquid savings (€)
          <input type="number" min="0" step="100" value={savingsText} onInput={(event) => setSavingsText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Monthly household net income (€)
          <input type="number" min="0" step="100" value={netIncomeText} onInput={(event) => setNetIncomeText(event.currentTarget.value)} />
        </label>
      </div>
      {!result ? <p>Enter valid non-negative savings and monthly net income.</p> : result.rows.length === 0
        ? <p>No purchase, housing, car or solar events recorded yet. Add one in the journey event form below.</p>
        : <>
          <p>
            <strong>Affordability status:</strong> {formatStatus(result.affordabilityStatus)} ·{" "}
            <strong>Total upfront:</strong> {formatIntegerEuroCents(result.totalUpfrontAllCents)}
            {result.linkedCashUpfrontCents > 0 ? ` (${formatIntegerEuroCents(result.linkedCashUpfrontCents)} linked to cash entries — counted once)` : ""}
            {result.totalSaleProceedsCents > 0 ? ` · Sale proceeds: ${formatIntegerEuroCents(result.totalSaleProceedsCents)}` : ""}
            {" · "}<strong>Active net monthly impact:</strong> {formatIntegerEuroCents(result.netActiveMonthlyImpactCents)}/mo
            {result.ongoingIncomeSharePercent !== undefined ? ` (${result.ongoingIncomeSharePercent}% of net income)` : ""}
            {result.liquidSavingsGapCents > 0 ? ` · Upfront savings gap: ${formatIntegerEuroCents(result.liquidSavingsGapCents)}` : ""}
          </p>
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Asset</th>
                  <th>Action</th>
                  <th>Upfront / Sale</th>
                  <th>Net monthly</th>
                  <th>Cash link</th>
                  <th>Tool</th>
                </tr>
              </thead>
              <tbody>
                {result.rows.map((row) => <tr key={row.eventId}>
                  <td>{row.date ?? "Unknown"}</td>
                  <th scope="row">{row.payload.title} ({row.payload.category})</th>
                  <td>{row.payload.action}{row.activeAfterEvents ? "" : " (retired/superseded)"}</td>
                  <td>{row.payload.upfrontCents !== undefined ? formatIntegerEuroCents(row.payload.upfrontCents) : "—"}</td>
                  <td>{row.netOngoingMonthlyCents !== 0 ? `${formatIntegerEuroCents(row.netOngoingMonthlyCents)}/mo` : "—"}</td>
                  <td>{row.countedInLinkedCash ? "Linked cash entry (counted once)" : "Unlinked"}</td>
                  <td><a href={calculatorPathForAssetCategory(row.payload.category)}>Open calculator</a></td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <CalculationExplanationPanel
            explanation={result.explanation}
            summary="Explain asset cost, single-counting and affordability check"
          />
        </>}
    </>}
  </section>;
}
