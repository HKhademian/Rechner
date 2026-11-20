import {
  type JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  type LifePerson,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  type PlanningAssistanceResult,
  PlanningPriority,
  buildPlanningAssistance,
  toPlanningPriority,
} from "#engine/lifeProfile/planningAssistant";

export interface LifePlanningAssistantProps {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly date: string;
  readonly includePlanned: boolean;
}

export default function LifePlanningAssistant({
  people,
  events,
  date,
  includePlanned,
}: LifePlanningAssistantProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [priority, setPriority] = useState<PlanningPriority>(PlanningPriority.CashRunway);

  let assistance: PlanningAssistanceResult | undefined;
  if (expanded && date) {
    try {
      assistance = buildPlanningAssistance({
        people,
        events,
        asOf: toLifeDate(date),
        includePlanned,
        priority,
      });
    }
    catch {
      assistance = undefined;
    }
  }

  return <section className="life-monthly" aria-label="Planning assistance and priority trade-offs">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide planning assistant & trade-offs" : "Open planning assistant, checklists & trade-offs"}
    </button>
    {expanded && <>
      <p>Suggestions are derived strictly from your recorded timeline events and household facts. Switch your focus priority to re-rank next steps and compare trade-offs — you remain in full control of all decisions.</p>
      <div className="life-people__form">
        <label className="life-people__field">Primary planning priority
          <select value={priority} onChange={(event) => setPriority(toPlanningPriority(event.currentTarget.value))}>
            <option value={PlanningPriority.CashRunway}>Cash buffer &amp; resilience</option>
            <option value={PlanningPriority.ResidencyAndCitizenship}>Residency &amp; citizenship milestones</option>
            <option value={PlanningPriority.FamilyAndChildcare}>Family, parental leave &amp; childcare</option>
            <option value={PlanningPriority.TaxOptimization}>Tax &amp; withholding timing</option>
            <option value={PlanningPriority.MajorPurchases}>Major purchases, housing &amp; solar</option>
          </select>
        </label>
      </div>
      {!assistance ? <p>Choose a valid view date above to run the planning assistant.</p> : <>
        <h4>Prioritized next steps &amp; preparation checklists</h4>
        <ul className="life-people__list">
          {assistance.suggestions.map((item) => <li key={item.id}>
            <div>
              <strong>{item.title}</strong>
              {item.calculatorPath && item.calculatorTitle && <> · <a href={item.calculatorPath}>Open {item.calculatorTitle}</a></>}
              <p><strong>Why suggested:</strong> {item.whySuggested}</p>
              <ul className="calc-explain__list">
                {item.checklistSteps.map((step) => <li key={step}>{step}</li>)}
              </ul>
              <p><strong>Missing or unverified inputs:</strong> {item.missingInputs.join("; ")}.</p>
              <p><strong>Limitations:</strong> {item.limitations}</p>
            </div>
          </li>)}
        </ul>

        <h4>Compare priority trade-offs</h4>
        <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Priority focus</th>
                <th>Recorded signals</th>
                <th>Primary upside</th>
                <th>Key trade-off</th>
              </tr>
            </thead>
            <tbody>
              {assistance.tradeOffs.map((row) => <tr key={row.priority}>
                <th scope="row">{row.label}{row.priority === priority ? " (selected)" : ""}</th>
                <td>{row.activeSignalCount}</td>
                <td>{row.upside}</td>
                <td>{row.tradeOff}</td>
              </tr>)}
            </tbody>
          </table>
        </div>
        <details className="calc-explain">
          <summary>Assumptions and decision boundaries</summary>
          <ul className="calc-explain__list">
            {assistance.generalAssumptions.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </details>
      </>}
    </>}
  </section>;
}
