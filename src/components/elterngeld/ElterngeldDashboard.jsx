import KpiScorecard from './KpiScorecard';
import ScenarioSelector from './ScenarioSelector';
import TimelineChart from './TimelineChart';
import SandboxControls from './SandboxControls';
import RulesExplainer from './RulesExplainer';
import TimelineTable from './TimelineTable';
import Navigation from '../Navigation';

export default function ElterngeldDashboard() {
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
            background: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            borderRadius: '999px',
            padding: '4px 14px',
            fontSize: '0.8rem',
            color: '#a5b4fc',
            marginBottom: '12px'
          }}>
            <span>🇩🇪 German Parental Allowance & Tax Optimization Engine</span>
          </div>

          <h1 style={{
            fontSize: '2.8rem',
            fontWeight: 900,
            background: 'linear-gradient(135deg, #ffffff 0%, #93c5fd 50%, #c084fc 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            margin: '0 0 10px 0',
            letterSpacing: '-0.03em'
          }}>
            5-Year Elterngeld Multi-Year Financial Simulator
          </h1>

          <p style={{
            color: '#94a3b8',
            fontSize: '1.05rem',
            maxWidth: '820px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            Model 60 months of household cash flows across three life-planning scenarios for two children.
            Discover how proactive tax bracket swaps (III/V), synthetic tax rules, and sibling bonuses extract maximum state benefits.
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

        {/* German Law Rules & Strategy Playbook */}
        <RulesExplainer />

        {/* Full 60-Month Cash Flow Table & Audit */}
        <TimelineTable />
      </main>

      {/* Footer */}
      <footer style={{
        borderTop: '1px solid rgba(51, 65, 85, 0.6)',
        padding: '24px 20px',
        textAlign: 'center',
        color: '#64748b',
        fontSize: '0.8rem',
        background: 'rgba(15, 23, 42, 0.9)'
      }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>Steuer & Elterngeld Studio</strong> • German Federal Parental Allowance (BEEG) & Maternity Protection (MuSchG)
          </div>
          <div>
            Client-side simulation engine • Data stays private in your browser
          </div>
        </div>
      </footer>
    </div>
  );
}
