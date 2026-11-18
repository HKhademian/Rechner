import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type EuroCents,
  toEuroAmount,
  toEuroCents,
} from "#engine/types";
import {
  toReplayMonth,
} from "#engine/lifeProfile/monthlyReplay";
import {
  projectCashFlow,
} from "#engine/lifeProfile/cashFlowProjection";
import {
  formatEur,
} from "#utils/currencyFormat";
import CashFlowChart from "./CashFlowChart";

function parseAmount(value: string, allowNegative: boolean): EuroCents | undefined {
  if (value.trim() === "") {
    return undefined;
  }
  const amount = toEuroAmount(Number(value));
  if (!allowNegative && amount < 0) {
    throw new TypeError("Income and expenses must be non-negative.");
  }
  const cents = Math.round(amount * 100);
  if (!Number.isSafeInteger(cents)) {
    throw new TypeError("Amount is outside the supported range.");
  }
  return toEuroCents(cents);
}

export default function CashFlowPreview({ date }: { readonly date: string }): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [opening, setOpening] = useState("");
  const [inflow, setInflow] = useState("");
  const [expense, setExpense] = useState("");
  const [comparing, setComparing] = useState(false);
  const [alternativeOpening, setAlternativeOpening] = useState("");
  const [alternativeInflow, setAlternativeInflow] = useState("");
  const [alternativeExpense, setAlternativeExpense] = useState("");
  let rows: ReturnType<typeof projectCashFlow> = [];
  let alternativeRows: ReturnType<typeof projectCashFlow> = [];
  let invalid = false;
  let alternativeInvalid = false;
  if (expanded && date) {
    try {
      const start = toReplayMonth(Number(date.slice(0, 4)), Number(date.slice(5, 7)));
      const last = start.year * 12 + start.month - 1 + 5;
      const through = toReplayMonth(Math.floor(last / 12), last % 12 + 1);
      rows = projectCashFlow(start, start, through, parseAmount(opening, true), {inflow: parseAmount(inflow, false),
        expense: parseAmount(expense, false) });
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
  return <section className="life-monthly" aria-label="Cash flow what-if">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide cash flow what-if" : "Try cash flow what-if"}
    </button>
    {expanded && <>
      <p>Enter an opening balance before the selected month and a constant monthly inflow and expense. These are separate assumptions, not calculated from your timeline, and are not saved. Negative balances indicate a shortfall; no funding is assumed.</p>
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
      </div>
      {invalid ? <p role="status">Check the date and amounts.</p> : !date ? <p>Choose a view date above.</p>
        : opening === "" || inflow === "" || expense === "" ? <p>Enter all three amounts to calculate a balance.</p>
          : <><CashFlowChart balances={[rows[0].state.opening!, ...rows.map(({ state }) => state.closing!)]} />
            <div className="life-monthly__scroll"><table>
              <thead><tr><th>Month</th><th className="life-monthly__amount">Opening</th><th className="life-monthly__amount">Inflow</th><th className="life-monthly__amount">Expenses</th><th className="life-monthly__amount">Closing</th></tr></thead>
              <tbody>{rows.map(({ month, state }) => <tr key={month.id}>
                <th scope="row">{String(month.month).padStart(2, "0")}/{month.year}</th>
                <td className="life-monthly__amount">{state.opening === undefined ? "Unknown" : formatEur(state.opening / 100)}</td>
                <td className="life-monthly__amount">{state.contribution?.inflow === undefined ? "Unknown" : formatEur(state.contribution.inflow / 100)}</td>
                <td className="life-monthly__amount">{state.contribution?.expense === undefined ? "Unknown" : formatEur(state.contribution.expense / 100)}</td>
                <td className="life-monthly__amount">{state.closing === undefined ? "Unknown" : formatEur(state.closing / 100)}</td>
              </tr>)}</tbody>
            </table></div></>}
      <button type="button" className="ui-btn" aria-expanded={comparing} onClick={() => setComparing((value) => !value)}>
        {comparing ? "Hide comparison" : "Compare an alternative"}
      </button>
      {comparing && <section aria-label="Cash flow comparison">
        <p>Enter another set of assumptions for the same six months. Both alternatives are temporary and can be reproduced from the amounts shown here.</p>
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
                <td className="life-monthly__amount">{state.closing === undefined ? "Unknown" : formatEur(state.closing / 100)}</td>
                <td className="life-monthly__amount">{alternativeRows[index]?.state.closing === undefined ? "Unknown" : formatEur(alternativeRows[index].state.closing! / 100)}</td>
              </tr>)}</tbody>
            </table></div>}
      </section>}
    </>}
  </section>;
}
