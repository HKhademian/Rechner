import type {
  JSX,
} from "preact";
import {
  Badge,
  BadgeTone,
} from "#/components/ui/index.ts";
import {
  LifeDeadlineSeverity,
} from "#engine/lifeSimulator/types";
import {
  displayedActiveScenarioResult,
} from "#/apps/life-planner/store/lifeWorkbenchSimulation.ts";

/** Unified chronological Statutory & Residency Deadlines tab. */
export function LifeDeadlinesTab(): JSX.Element {
  const { deadlines } = displayedActiveScenarioResult.value;

  return (
    <section className="lpw-card">
      <div className="lpw-card__header">
        <div>
          <h2 className="lpw-card__title">Statutory Deadlines &amp; Milestones ({deadlines.length})</h2>
          <p className="lpw-hint">
            Consolidated deadlines across Elternzeit (§ 16 BEEG), job-seeking registration (§ 38 SGB III),
            income tax filings (§ 149 AO), and residency/citizenship milestones (§ 18c AufenthG, § 10 StAG).
          </p>
        </div>
      </div>

      {deadlines.length === 0 ? (
        <p className="lpw-hint">No statutory deadlines triggered in this scenario.</p>
      ) : (
        <div className="lpw-table-wrap">
          <table className="lpw-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Severity</th>
                <th>Domain</th>
                <th>Deadline</th>
                <th>Citation</th>
              </tr>
            </thead>
            <tbody>
              {deadlines.map((dl) => {
                const tone = dl.severity === LifeDeadlineSeverity.Critical
                  ? BadgeTone.Loss
                  : dl.severity === LifeDeadlineSeverity.Warning
                    ? BadgeTone.Warning
                    : BadgeTone.Neutral;
                return (
                  <tr key={dl.id}>
                    <td><strong>M{dl.month}</strong> ({dl.calendarMonth}/{dl.calendarYear})</td>
                    <td><Badge tone={tone}>{dl.severity}</Badge></td>
                    <td>{dl.domain}</td>
                    <td>
                      <strong>{dl.title}</strong>
                      <div className="lpw-hint">{dl.description}</div>
                    </td>
                    <td>{dl.statutoryCitation ?? "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
