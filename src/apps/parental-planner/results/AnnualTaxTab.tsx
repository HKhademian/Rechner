import type {
  JSX,
} from "preact";
import {
  useState,
} from "preact/hooks";
import {
  Badge,
  BadgeTone,
  Button,
  ButtonSize,
  ButtonVariant,
  WikiRefKind,
  WikiRefLink,
} from "#/components/ui/index.ts";
import AnnualIncomeBreakdown from "#components/AnnualIncomeBreakdown";
import {
  type FullCalendarYear,
  ActiveScenarioView,
  toFullCalendarYear,
} from "#engine/types";
import {
  LawId,
} from "#engine/laws/types";
import {
  formatEur,
} from "#utils/currencyFormat";
import {
  workbenchState,
} from "#/apps/parental-planner/store/workbenchState.ts";
import {
  displayedWorkbenchCurrentScenario,
  displayedWorkbenchDeductibles,
  displayedWorkbenchScenarioC,
} from "#/apps/parental-planner/store/workbenchSimulation.ts";
import {
  WorkbenchGranularModal,
  openWorkbenchModal,
} from "#/apps/parental-planner/store/workbenchUiState.ts";

/** Tab 4: Annual Tax Reconciliation, Joint Taxable Income Breakdown & Deductible Expense Credits. */
export function AnnualTaxTab(): JSX.Element {
  const s = workbenchState.value;
  const result = s.activeScenario === ActiveScenarioView.Compare
    ? displayedWorkbenchScenarioC.value
    : displayedWorkbenchCurrentScenario.value;
  const deductibles = displayedWorkbenchDeductibles.value;
  const records = result.annualTaxRecords ?? [];
  const [selectedYear, setSelectedYear] = useState<FullCalendarYear | null>(null);
  const record = records.find((r) => r.calendarYear === selectedYear) ?? records[0];
  const base = record?.incomeAvailable ? record.taxBase : undefined;
  const partners = base?.incomeByPartner;
  const profile = record?.assessment?.taxRules ??
    result.configuration?.taxProfiles.find((p) => p.calendarYear === record?.calendarYear);

  return (
    <>
      <div className="plw-toolbar">
        <div>
          <h3 className="plw-modal-section__title">
            Joint Annual Assessment (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_26b }}>§ 26b EStG</WikiRefLink>
            ) &amp;{" "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_32b }}>Progressionsvorbehalt</WikiRefLink>
          </h3>
          <p className="plw-card__hint">
            Inspect each partner&apos;s employment income, statutory lump sums, and annual tax settlement per calendar year.
          </p>
        </div>

        <div className="plw-toolbar__group">
          <label htmlFor="plw-annual-tax-year" className="plw-inline-control__label">
            Tax Year
          </label>
          <select
            id="plw-annual-tax-year"
            className="plw-preset-select"
            disabled={records.length === 0}
            value={record?.calendarYear ?? ""}
            onChange={(event) => setSelectedYear(toFullCalendarYear(event.currentTarget.value))}
          >
            {records.length === 0 && <option value="">No complete years</option>}
            {records.map((item) => (
              <option key={item.calendarYear} value={item.calendarYear}>{item.calendarYear}</option>
            ))}
          </select>
        </div>
      </div>

      {profile?.projected && (
        <Badge tone={BadgeTone.Warning}>
          Published {profile.sourceYear} tax tariff projected to {profile.calendarYear}
        </Badge>
      )}

      <AnnualIncomeBreakdown
        people={[
          {
            label: "Partner 1",
            income: partners?.husband,
          },
          {
            label: "Partner 2",
            income: partners?.wife,
          },
        ]}
        base={base}
        profile={profile}
      />

      <div className="plw-modal-section">
        <div className="plw-toolbar">
          <h3 className="plw-modal-section__title">
            Additional Tax-Deductible Expenses &amp; Credits (
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_9a }}>§ 9a</WikiRefLink>
            {", "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_10 }}>§ 10</WikiRefLink>
            {", "}
            <WikiRefLink target={{ kind: WikiRefKind.Law,
              id: LawId.EStG_35a }}>§ 35a EStG</WikiRefLink>
            )
          </h3>
          <Button
            size={ButtonSize.Sm}
            variant={ButtonVariant.Tint}
            onClick={() => openWorkbenchModal(WorkbenchGranularModal.Costs)}
          >
            Edit deductibles…
          </Button>
        </div>

        <div className="plw-vacation-grid">
          <div className="plw-modal-item">
            <span>Incremental §§ 9, 10 Tax Savings</span>
            <strong className="tabular-nums">+{formatEur(deductibles.estimatedDeductionTaxSavings)}/yr</strong>
          </div>
          <div className="plw-modal-item">
            <span>§ 35a Direct Credits (Household + Craftsmen)</span>
            <strong className="tabular-nums">+{formatEur(deductibles.totalDirectTaxCredits)}/yr</strong>
          </div>
          <div className="plw-modal-item">
            <span>Total Credited Annual Refund</span>
            <strong className="tabular-nums">+{formatEur(deductibles.totalEstimatedAnnualTaxRefund)}/yr</strong>
          </div>
        </div>
      </div>

      <div className="plw-prose">
        <p>
          Taxable income follows{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_2 }}>§ 2 EStG</WikiRefLink>{" "}
          and{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Topic,
            id: "taxable-income" }}>ZvE rules</WikiRefLink>.{" "}
          Tax-free Elterngeld raises the effective tax rate on remaining taxable income via{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_32b }}>§ 32b EStG</WikiRefLink>, reconciled in Month {s.taxReturnMonth} under{" "}
          <WikiRefLink target={{ kind: WikiRefKind.Law,
            id: LawId.EStG_36 }}>§ 36 EStG</WikiRefLink>.
        </p>
      </div>
    </>
  );
}
