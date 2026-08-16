import type { JSX } from 'preact';
import KpiScorecard from '#components/elterngeld/KpiScorecard';
import ScenarioSelector from '#components/elterngeld/ScenarioSelector';
import TimelineChart from '#components/elterngeld/TimelineChart';
import SandboxControls from '#components/elterngeld/SandboxControls';
import RulesExplainer from '#components/elterngeld/RulesExplainer';
import TimelineTable from '#components/elterngeld/TimelineTable';
import Navigation from '#components/Navigation';

export default function ElterngeldDashboard(): JSX.Element {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', backgroundColor: '#0f172a' }}>
      {/* Global Top Navigation */}
      <Navigation currentPath="/elterngeld" />

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: '1400px', margin: '0 auto', padding: '24px 20px', width: '100%' }}>
        {/* Page Hero Title & Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px', marginTop: '10px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            color: '#94a3b8',
            marginBottom: '12px'
          }}>
            <span>Federal Parental Allowance & Leave Act (*BEEG*) • Multi-Year Financial Modeling</span>
          </div>

          <h1 style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            color: '#f8fafc',
            margin: '0 0 10px 0',
            letterSpacing: '-0.03em'
          }}>
            Elterngeld & Parental Leave 5-Year Simulator
          </h1>

          <p style={{
            color: '#94a3b8',
            fontSize: '1rem',
            maxWidth: '820px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            60-month household financial forecast for a family planning two children.
            Comparing three timeline scenarios incorporating proactive tax class optimization (III/V), statutory maternity pay, ElterngeldPlus, and sibling bonuses.
          </p>
        </div>

        {/* Dynamic KPI Scorecard */}
        <KpiScorecard />

        {/* Scenario Selector & Comparison Tabs */}
        <ScenarioSelector />

        {/* Interactive 60-Month Stacked Timeline Chart */}
        <TimelineChart />

        {/* The Sandbox: Interactive Input Parameters & Sliders */}
        <SandboxControls />

        {/* Full 60-Month Cash Flow Table & Audit */}
        <TimelineTable />

        {/* German Law Rules, Statutory Framework & Legal Precedents (Lowest Page Section) */}
        <RulesExplainer />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid #334155',
        padding: '20px 24px',
        color: '#94a3b8',
        fontSize: '0.8rem',
        background: '#0f172a'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>German Salary & Parental Allowance Engine</strong> • Statutory Reference: BEEG, MuSchG & EStG
          </div>
          <div>
            Local Client-Side Computation • No data transmitted or stored on external servers
          </div>
        </div>
      </footer>
    </div>
  );
}
