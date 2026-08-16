export default function Navigation({ currentPath = '/' }) {
  const isNetCalculator = currentPath === '/' || currentPath === '';
  const isElterngeld = currentPath === '/elterngeld' || currentPath.startsWith('/elterngeld');

  return (
    <header style={{
      background: '#0f172a',
      borderBottom: '1px solid #334155',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px'
      }}>
        {/* Brand Logo & Title */}
        <a href="/" style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          textDecoration: 'none',
          color: 'white'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: 'white',
            fontWeight: 800
          }}>
            §
          </div>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1.1rem',
              letterSpacing: '-0.02em',
              color: '#f8fafc'
            }}>
              German Net Salary & Parental Allowance Planner
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.02em' }}>
              Household Financial & Parental Leave Optimization (BEEG / EStG)
            </div>
          </div>
        </a>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: '#1e293b',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          {/* Tab 1: Net Pay Calculator */}
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: isNetCalculator ? 700 : 500,
              color: isNetCalculator ? '#ffffff' : '#94a3b8',
              backgroundColor: isNetCalculator ? '#2563eb' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect width="16" height="20" x="4" y="2" rx="2"/>
              <line x1="8" x2="16" y1="6" y2="6"/>
              <line x1="16" x2="16" y1="14" y2="18"/>
              <path d="M16 10h.01"/>
              <path d="M12 10h.01"/>
              <path d="M8 10h.01"/>
              <path d="M12 14h.01"/>
              <path d="M8 14h.01"/>
              <path d="M12 18h.01"/>
              <path d="M8 18h.01"/>
            </svg>
            Net Salary Calculator
          </a>

          {/* Tab 2: 5-Year Elterngeld Simulator */}
          <a
            href="/elterngeld"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '7px 14px',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: isElterngeld ? 700 : 500,
              color: isElterngeld ? '#ffffff' : '#94a3b8',
              backgroundColor: isElterngeld ? '#2563eb' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            Elterngeld 5-Year Simulator
          </a>
        </nav>

        {/* Legal Reference & Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            fontSize: '0.78rem',
            color: '#94a3b8',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981'
            }}></span>
            <span>Statutory Rules: 2024–2026 EStG / BEEG</span>
          </div>
        </div>
      </div>
    </header>
  );
}
