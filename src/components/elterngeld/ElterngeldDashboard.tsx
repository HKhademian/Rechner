import type { JSX } from "preact";
import KpiScorecard from "#components/elterngeld/KpiScorecard";
import ScenarioSelector from "#components/elterngeld/ScenarioSelector";
import TimelineChart from "#components/elterngeld/TimelineChart";
import SandboxControls from "#components/elterngeld/SandboxControls";
import RulesExplainer from "#components/elterngeld/RulesExplainer";
import TimelineTable from "#components/elterngeld/TimelineTable";
import { DataExportImportModal } from "#components/elterngeld/DataExportImportModal";
import Navigation from "#components/Navigation";

export default function ElterngeldDashboard(): JSX.Element {
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
      <Navigation currentPath="/elterngeld" />

      {/* Main Content Area */}
      <main
        style={{
          flex: 1,
          maxWidth: "1400px",
          margin: "0 auto",
          padding: "24px 20px",
          width: "100%",
        }}
      >
        {/* Page Hero Title & Header */}
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
            marginTop: "10px",
          }}
        >
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "var(--border-radius-sm)",
              padding: "4px 12px",
              fontSize: "0.78rem",
              color: "var(--text-secondary)",
              marginBottom: "12px",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <span>
              Federal Parental Allowance &amp; Leave Act (*BEEG*) • Multi-Year
              Financial Modeling
            </span>
          </div>

          <h1
            style={{
              fontSize: "2.25rem",
              fontWeight: 800,
              color: "var(--text-primary)",
              margin: "0 0 10px 0",
              letterSpacing: "-0.03em",
            }}
          >
            Elterngeld &amp; Parental Leave 5-Year Simulator
          </h1>

          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "0.98rem",
              maxWidth: "820px",
              margin: "0 auto",
              lineHeight: 1.55,
            }}
          >
            60-month household financial forecast for a family planning two
            children. Comparing three timeline scenarios incorporating proactive
            tax class optimization (III/V), statutory maternity pay,
            ElterngeldPlus, and sibling bonuses.
          </p>
        </div>

        {/* Dynamic KPI Scorecard */}
        <KpiScorecard />

        {/* Scenario Selector & Comparison Tabs */}
        <ScenarioSelector />

        {/* The Sandbox: Interactive Input Parameters & Sliders */}
        <SandboxControls />

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
