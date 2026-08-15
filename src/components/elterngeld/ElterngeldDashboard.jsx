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
            background: 'rgba(30, 41, 59, 0.8)',
            border: '1px solid #334155',
            borderRadius: '6px',
            padding: '4px 12px',
            fontSize: '0.78rem',
            color: '#94a3b8',
            marginBottom: '12px'
          }}>
            <span>Bundeselterngeld- und Elternzeitgesetz (BEEG) • Mehrjahres-Finanzanalyse</span>
          </div>

          <h1 style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            color: '#f8fafc',
            margin: '0 0 10px 0',
            letterSpacing: '-0.03em'
          }}>
            Elterngeld & Elternzeit 5-Jahres-Simulation
          </h1>

          <p style={{
            color: '#94a3b8',
            fontSize: '1rem',
            maxWidth: '820px',
            margin: '0 auto',
            lineHeight: 1.5
          }}>
            60-Monate-Haushaltsrechnung für die Familienplanung mit zwei Kindern.
            Vergleich von drei Szenarien unter Berücksichtigung von Steuerklassenwechseln (III/V), Mutterschutz, ElterngeldPlus und Geschwisterbonus.
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
        borderTop: '1px solid #334155',
        padding: '20px 24px',
        color: '#94a3b8',
        fontSize: '0.8rem',
        background: '#0f172a'
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <strong>Netto- & Elterngeldrechner</strong> • Gesetzliche Grundlagen: BEEG, MuSchG & EStG
          </div>
          <div>
            Lokale Client-Berechnung • Keine Datenspeicherung auf externen Servern
          </div>
        </div>
      </footer>
    </div>
  );
}
