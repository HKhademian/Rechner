import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type EuroCents,
  toEuroCents,
} from "#engine/types";
import {
  parseAmount,
} from "#engine/lifeProfile/cashAmount";
import {
  TransitionMonthPhase,
  compareResignationScenarios,
} from "#engine/lifeProfile/resignationRunway";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";
import CalculationExplanationPanel from "#components/CalculationExplanationPanel";

export interface ResignationRunwayPreviewProps {
  readonly defaultFinalPayCents?: EuroCents;
}

function formatPhase(phase: TransitionMonthPhase): string {
  if (phase === TransitionMonthPhase.WaitingPeriod) {
    return "Waiting period";
  }
  if (phase === TransitionMonthPhase.BenefitPeriod) {
    return "Estimated benefit";
  }
  if (phase === TransitionMonthPhase.UnfundedSearch) {
    return "Unfunded search";
  }
  return "New job";
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

export default function ResignationRunwayPreview({ defaultFinalPayCents }: ResignationRunwayPreviewProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [openingText, setOpeningText] = useState("15000");
  const [finalPayText, setFinalPayText] = useState(
    defaultFinalPayCents !== undefined && defaultFinalPayCents > 0
      ? (defaultFinalPayCents / 100).toFixed(2).replace(/\.00$/, "")
      : "0",
  );
  const [expensesText, setExpensesText] = useState("2800");
  const [searchMonths, setSearchMonths] = useState("4");
  const [waitingMonths, setWaitingMonths] = useState("3");
  const [benefitText, setBenefitText] = useState("1800");
  const [newNetText, setNewNetText] = useState("3600");
  const [compareExtraSearch, setCompareExtraSearch] = useState(true);

  const opening = tryCents(openingText);
  const finalPay = tryCents(finalPayText);
  const expenses = tryCents(expensesText);
  const benefit = tryCents(benefitText);
  const newNet = tryCents(newNetText);
  const parsedSearch = Number(searchMonths);
  const parsedWaiting = Number(waitingMonths);
  const valid = opening !== undefined && finalPay !== undefined && expenses !== undefined
    && benefit !== undefined && newNet !== undefined
    && Number.isSafeInteger(parsedSearch) && parsedSearch >= 0 && parsedSearch <= 36
    && Number.isSafeInteger(parsedWaiting) && parsedWaiting >= 0 && parsedWaiting <= 12;

  const scenarios = valid
    ? compareResignationScenarios([
      {
        label: "Base transition",
        openingSavingsCents: opening,
        finalPayCents: finalPay,
        monthlyExpensesCents: expenses,
        jobSearchMonths: parsedSearch,
        waitingPeriodMonths: parsedWaiting,
        monthlyBenefitCents: benefit,
        newJobMonthlyNetCents: newNet,
        horizonMonths: Math.min(24, Math.max(6, parsedSearch + 3)),
      },
      ...(compareExtraSearch
        ? [
          {
            label: "Longer search (+2 months)",
            openingSavingsCents: opening,
            finalPayCents: finalPay,
            monthlyExpensesCents: expenses,
            jobSearchMonths: Math.min(36, parsedSearch + 2),
            waitingPeriodMonths: parsedWaiting,
            monthlyBenefitCents: benefit,
            newJobMonthlyNetCents: newNet,
            horizonMonths: Math.min(24, Math.max(6, parsedSearch + 4)),
          },
          {
            label: "No waiting period",
            openingSavingsCents: opening,
            finalPayCents: finalPay,
            monthlyExpensesCents: expenses,
            jobSearchMonths: parsedSearch,
            waitingPeriodMonths: 0,
            monthlyBenefitCents: benefit,
            newJobMonthlyNetCents: newNet,
            horizonMonths: Math.min(24, Math.max(6, parsedSearch + 3)),
          },
        ]
        : []),
    ])
    : [];

  const primary = scenarios[0];

  return <section className="life-monthly" aria-label="Employment transition and resignation runway">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide job transition runway" : "Compare resignation & job transition runway"}
    </button>
    {expanded && <>
      <p>Model how long liquid savings last during a resignation or job transition. Waiting periods (such as Sperrzeit) and benefit amounts are manual assumptions, not an official Agentur für Arbeit decision.</p>
      <div className="life-people__form">
        <label className="life-people__field">Opening savings (€)
          <input type="number" step="0.01" value={openingText} onInput={(event) => setOpeningText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Final pay / payout in month 1 (€)
          <input type="number" min="0" step="0.01" value={finalPayText} onInput={(event) => setFinalPayText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Monthly expenses (€)
          <input type="number" min="0" step="0.01" value={expensesText} onInput={(event) => setExpensesText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Job-search months
          <input type="number" min="0" max="36" step="1" value={searchMonths} onInput={(event) => setSearchMonths(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Waiting period months
          <input type="number" min="0" max="12" step="1" value={waitingMonths} onInput={(event) => setWaitingMonths(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Estimated monthly benefit (€)
          <input type="number" min="0" step="0.01" value={benefitText} onInput={(event) => setBenefitText(event.currentTarget.value)} />
        </label>
        <label className="life-people__field">Expected new-job monthly net (€)
          <input type="number" min="0" step="0.01" value={newNetText} onInput={(event) => setNewNetText(event.currentTarget.value)} />
        </label>
        <label><input type="checkbox" checked={compareExtraSearch} onChange={(event) => setCompareExtraSearch(event.currentTarget.checked)} /> Compare longer search &amp; zero waiting period</label>
      </div>
      {!valid ? <p>Enter valid non-negative amounts and whole month counts.</p> : <>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Scenario</th>
                <th>Solvent months</th>
                <th>Lowest balance</th>
                <th>Ending balance</th>
                <th>Shortfall</th>
              </tr>
            </thead>
            <tbody>
              {scenarios.map((scenario) => <tr key={scenario.label}>
                <th scope="row">{scenario.label}</th>
                <td>{scenario.solventMonths} / {scenario.months.length}</td>
                <td>{formatIntegerEuroCents(scenario.minimumBalanceCents)}</td>
                <td>{formatIntegerEuroCents(scenario.endingBalanceCents)}</td>
                <td>{scenario.shortfallMonthIndex !== undefined ? `Shortfall in month ${scenario.shortfallMonthIndex}` : "None within horizon"}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        {primary && <>
          <div className="life-monthly__scroll">
            <table>
              <thead>
                <tr>
                  <th>Month</th>
                  <th>Phase</th>
                  <th>Inflows</th>
                  <th>Expenses</th>
                  <th>Closing balance</th>
                </tr>
              </thead>
              <tbody>
                {primary.months.map((row) => <tr key={row.monthIndex}>
                  <th scope="row">Month {row.monthIndex}</th>
                  <td>{formatPhase(row.phase)}</td>
                  <td>{formatIntegerEuroCents(row.inflowCents)}</td>
                  <td>{formatIntegerEuroCents(row.expenseCents)}</td>
                  <td>{formatIntegerEuroCents(row.closingBalanceCents)}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <CalculationExplanationPanel
            explanation={primary.explanation}
            summary="Explain transition runway formula and assumptions"
          />
        </>}
      </>}
    </>}
  </section>;
}
