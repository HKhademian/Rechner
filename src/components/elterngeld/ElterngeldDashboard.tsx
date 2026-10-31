import {
  AppId,
  calculatorPath,
} from "#/apps/appDefinition.ts";
import "./ElterngeldDashboard.css";
import {
  currentScenarioData,
} from "#store/elterngeldStore";
import type {
  JSX, 
} from "preact";
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
      <main id="main-content" tabIndex={-1}
        style={{
          flex: 1,
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px 20px",
          width: "100%",
        }}
      >
        <header className="simulator-header">
          <div className="simulator-header__intro">
            <p className="simulator-header__eyebrow">Household planning · BEEG / MuSchG / EStG</p>
            <h1>Parental leave planner</h1>
            <p className="simulator-header__description">Start with your household and planned leave below, then compare the calculated results.</p>
          </div>
          <dl className="simulator-header__period" aria-label="Planning period">
            <div>
              <dt>Forecast period</dt>
              <dd>{months[0]?.calendarLabel} – {months.at(-1)?.calendarLabel}</dd>
            </div>
            <div>
              <dt>Duration</dt>
              <dd>{months.length} months</dd>
            </div>
          </dl>
        </header>

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
      </footer>
    </div>
  );
}
