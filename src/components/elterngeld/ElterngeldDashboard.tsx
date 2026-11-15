import {
  batch,
} from "@preact/signals";
import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import "./ElterngeldDashboard.css";
import {
  currentScenarioData,
  setExistingChildrenCount,
  setHusbandGrossYearly,
  setWifeGrossYearly,
  startCalendarYear,
  updateChildcarePlan,
} from "#store/elterngeldStore";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  FederalStateKitaPresetId,
} from "#engine/types";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import type {
  JSX,
} from "preact";
import {
  SyncProfileActionIcon,
} from "#components/Icons";
import AnnualTaxableIncome from "#components/elterngeld/AnnualTaxableIncome";
import KpiScorecard from "#components/elterngeld/KpiScorecard";
import ScenarioSelector from "#components/elterngeld/ScenarioSelector";
import TimelineChart from "#components/elterngeld/TimelineChart";
import SandboxControls from "#components/elterngeld/SandboxControls";
import RulesExplainer from "#components/elterngeld/RulesExplainer";
import TimelineTable from "#components/elterngeld/TimelineTable";
import {
  DataExportImportModal,
} from "#components/elterngeld/DataExportImportModal";
import Navigation from "#components/Navigation";
import ParameterObserverSection from "#components/parameters/ParameterObserverSection";
import SourceRevision from "#components/SourceRevision";
import {
  PageHeader,
} from "#components/ui/PageHeader";
import {
  FormProjectionProfileId,
} from "#engine/parameters/projections";

function mapStateToKitaPreset(federalState: GermanFederalState): FederalStateKitaPresetId {
  switch (federalState) {
    case GermanFederalState.Berlin:
      return FederalStateKitaPresetId.Berlin;
    case GermanFederalState.NordrheinWestfalen:
      return FederalStateKitaPresetId.NrwDuesseldorf;
    case GermanFederalState.Bayern:
      return FederalStateKitaPresetId.BavariaMunich;
    case GermanFederalState.BadenWuerttemberg:
      return FederalStateKitaPresetId.BwStuttgart;
    case GermanFederalState.Hamburg:
      return FederalStateKitaPresetId.Hamburg;
    default:
      return FederalStateKitaPresetId.Custom;
  }
}

function syncParentalLeaveFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  batch(() => {
    startCalendarYear.value = lp.planningYear;
    setHusbandGrossYearly(lp.primaryAnnualGrossEur);
    setWifeGrossYearly(lp.hasPartner ? lp.partnerAnnualGrossEur : 0);
    setExistingChildrenCount(lp.dependentChildrenCount);
    updateChildcarePlan({ presetId: mapStateToKitaPreset(lp.federalState) });
  });
}

export default function ElterngeldDashboard(): JSX.Element {
  const months = currentScenarioData.value.months;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-app)",
        color: "var(--text-primary)",
        transition: "var(--transition)",
      }}
    >
      {/* Global Top Navigation */}
      <Navigation currentPath={calculatorPath(AppId.ParentalLeave)} />

      {/* Main Content Area */}
      <main id="main-content" className="ui-page ui-page--wide" tabIndex={-1} style={{ flex: 1 }}>
        <PageHeader
          eyebrow="Household planning · BEEG / MuSchG / EStG"
          title="Parental Leave Planner"
          subtitle="Start with your household and planned leave below, then compare the calculated results."
          actions={
            <button
              type="button"
              className="ui-btn ui-btn--tint"
              onClick={syncParentalLeaveFromLifeProfile}
              title="Populate annual gross salaries, partner income, existing children, start year, and regional Kita preset from the Unified Life Profile"
            >
              <SyncProfileActionIcon size={14} />
              <span>Sync Life Profile</span>
            </button>
          }
          metaLabel="Planning period"
          meta={[
            {
              label: "Forecast period",
              value: `${months[0]?.calendarLabel ?? ""} – ${months.at(-1)?.calendarLabel ?? ""}`,
            },
            {
              label: "Duration",
              value: `${months.length} months`,
            },
          ]}
        />

        {/* Set up the plan before choosing which calculated results to review. */}
        <SandboxControls />

        <ScenarioSelector />

        {/* Dynamic KPI Scorecard */}
        <KpiScorecard />

        <AnnualTaxableIncome result={currentScenarioData.value} />

        {/* Full 60-Month Cash Flow Table & Audit */}
        <TimelineTable />

        {/* Interactive 60-Month Stacked Timeline Chart */}
        <TimelineChart />

        {/* Unified Law-Linked Parameter Value Storage Observer & Editor */}
        <ParameterObserverSection
          embedded
          projectionProfile={FormProjectionProfileId.ParentalLeaveFocus}
        />

        {/* German Law Rules, Statutory Framework & Legal Precedents */}
        <RulesExplainer />

        {/* Data Export / Import Modal Dialog */}
        <DataExportImportModal />
      </main>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid var(--border-subtle)",
          padding: "20px 24px",
          color: "var(--text-muted)",
          fontSize: "0.8rem",
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            maxWidth: "1400px",
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div>
            <strong>German Salary &amp; Parental Allowance Engine</strong> •
            Statutory Reference: BEEG, MuSchG &amp; EStG
          </div>
          <div>
            Local Client-Side Computation • No data transmitted or stored on
            external servers
          </div>
        </div>
        <SourceRevision />
      </footer>
    </div>
  );
}
