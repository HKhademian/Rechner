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
  type ParentalLeaveHandoffPreview,
  buildParentalLeaveHandoffPreview,
} from "#engine/lifeProfile/parentalLeaveHandoff";
import {
  replaceUnifiedLifeProfile,
  unifiedLifeProfile,
} from "#store/lifeProfileStore";

export interface FamilyParentalHandoffPanelProps {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly date: string;
  readonly includePlanned: boolean;
}

export default function FamilyParentalHandoffPanel({
  people,
  events,
  date,
  includePlanned,
}: FamilyParentalHandoffPanelProps): JSX.Element {
  const [expanded, setExpanded] = useState(false);
  const [transferred, setTransferred] = useState(false);

  let preview: ParentalLeaveHandoffPreview | undefined;
  if (expanded && date) {
    try {
      preview = buildParentalLeaveHandoffPreview({
        people,
        events,
        asOf: toLifeDate(date),
        includePlanned,
      });
    }
    catch {
      preview = undefined;
    }
  }

  function applyTransfer(): void {
    if (!preview) {
      return;
    }
    replaceUnifiedLifeProfile({
      ...unifiedLifeProfile.value,
      ...preview.proposedProfilePatch,
    });
    setTransferred(true);
  }

  return <section className="life-monthly" aria-label="Family milestones and Parental Leave Planner preview">
    <button type="button" className="ui-btn" aria-expanded={expanded} onClick={() => setExpanded((value) => !value)}>
      {expanded ? "Hide family & Parental Leave preview" : "Preview Parental Leave Planner handoff"}
    </button>
    {expanded && <>
      <p>Review recorded family, pregnancy, birth and household pay facts before transferring selected values to the shared profile used by the <a href="/elterngeld/">Parental Leave Planner</a>.</p>
      {!preview ? <p>Select a valid view date above to build the preview.</p> : <>
        {preview.fields.length === 0 ? <p>No family or employment facts recorded yet to preview.</p> : <div className="life-monthly__scroll">
          <table>
            <thead>
              <tr>
                <th>Field</th>
                <th>Previewed value</th>
                <th>Classification</th>
                <th>Source</th>
              </tr>
            </thead>
            <tbody>
              {preview.fields.map((field) => <tr key={field.id}>
                <th scope="row">{field.label}</th>
                <td>{field.value}</td>
                <td>{field.isFact ? "Recorded fact" : "Planned milestone"}</td>
                <td>{field.source}</td>
              </tr>)}
            </tbody>
          </table>
        </div>}
        <ul className="calc-explain__list">
          {preview.warnings.map((warning) => <li key={warning}>{warning}</li>)}
        </ul>
        <div className="life-people__actions">
          <button
            type="button"
            className="ui-btn ui-btn--primary"
            disabled={Object.keys(preview.proposedProfilePatch).length === 0}
            onClick={applyTransfer}
          >
            Confirm transfer to shared profile
          </button>
          <a className="ui-btn" href={preview.targetPath}>Open Parental Leave Planner</a>
        </div>
        {transferred && <p>Selected household fields transferred to your shared profile. Existing Parental Leave Planner scenarios remain untouched.</p>}
      </>}
    </>}
  </section>;
}
