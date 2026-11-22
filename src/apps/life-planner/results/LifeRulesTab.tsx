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
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_32a }}>
              EStG § 32a (Tariff &amp; Splitting)
            </WikiRefLink>
            {" · "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_26b }}>
              EStG § 26b (Joint Assessment)
            </WikiRefLink>
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Wage Replacement Progression (Elterngeld, Mutterschutz, ALG I, Krankengeld):</strong>
            {" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_32b }}>
              EStG § 32b (Progressionsvorbehalt)
            </WikiRefLink>
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Family Benefits &amp; Child Allowance Comparison:</strong>
            {" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.BEEG_2 }}>
              BEEG § 2 (Elterngeld)
            </WikiRefLink>
            {" · "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_31 }}>
              EStG § 31 (Günstigerprüfung)
            </WikiRefLink>
          </span>
        </div>
        <div className="lpw-event-row">
          <span>
            <strong>Deductions, Kita &amp; Direct Tax Credits:</strong>
            {" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_9_1_4 }}>
              EStG § 9 (Commuter &amp; Werbungskosten)
            </WikiRefLink>
            {" · "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10_1_5 }}>
              EStG § 10(1)5 (Kita Deductions)
            </WikiRefLink>
          </span>
        </div>
      </div>
    </section>
  );
}
