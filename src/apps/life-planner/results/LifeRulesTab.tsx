import type {
  JSX,
} from "preact";
import {
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import {
  LawId,
} from "#engine/laws/types";

/** Statutory Rules & Provenance tab with whisper-quiet WikiRefLink cross-links. */
export function LifeRulesTab(): JSX.Element {
  return (
    <section className="lpw-card">
      <h2 className="lpw-card__title">Statutory Rules &amp; Legal Provenance</h2>
      <p className="lpw-hint">
        Hover or click any statutory citation below to inspect the underlying German law directly without leaving the workbench.
      </p>
      <div className="lpw-event-list">
        <div className="lpw-event-row">
          <span>
            <strong>Monthly Payroll &amp; Joint Annual Assessment:</strong>
            {" "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_32a} label="EStG § 32a (Tariff & Splitting)" />
            {" · "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_26b} label="EStG § 26b (Joint Assessment)" />
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Wage Replacement Progression (Elterngeld, Mutterschutz, ALG I, Krankengeld):</strong>
            {" "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_32b} label="EStG § 32b (Progressionsvorbehalt)" />
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Family Benefits &amp; Child Allowance Comparison:</strong>
            {" "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.BEEG_2} label="BEEG § 2 (Elterngeld)" />
            {" · "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_31} label="EStG § 31 (Günstigerprüfung)" />
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Deductions, Kita &amp; Direct Tax Credits:</strong>
            {" "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_9_1_4} label="EStG § 9 (Commuter & Werbungskosten)" />
            {" · "}
            <WikiRefLink kind={WikiRefKind.Law} id={LawId.EStG_10_1_5} label="EStG § 10(1)5 (Kita Deductions)" />
          </span>
        </div>
      </div>
    </section>
  );
}
