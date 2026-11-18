import {
  type JSX, 
} from "preact";
import {
  formatEur, 
} from "#utils/currencyFormat";
import {
  CashFlowChartGraphic, 
} from "./Icons";

/** A visual summary of the same estimates presented in the adjacent table. */
export default function CashFlowChart({ balances }: { readonly balances: readonly number[] }): JSX.Element {
  const scale = Math.max(1, ...balances.map(Math.abs));
  const normalized = balances.map((balance) => balance / scale);
  const low = Math.min(0, ...normalized);
  const high = Math.max(0, ...normalized);
  const range = high - low || 1;
  const points = normalized.map((value, index) => `${12 + index * 276 / (normalized.length - 1)},${88 - (value - low) * 76 / range}`).join(" ");
  const zeroY = 88 - (0 - low) * 76 / range;

  return <figure className="life-monthly__chart">
    <figcaption>Estimated closing balance <span>· based on your assumptions</span></figcaption>
    <CashFlowChartGraphic points={points} zeroY={zeroY} />
    <div className="life-monthly__chart-labels" aria-hidden="true">
      <span>Opening: {formatEur(balances[0] / 100)}</span>
      <span>After 6 months: {formatEur(balances[balances.length - 1] / 100)}</span>
    </div>
  </figure>;
}
