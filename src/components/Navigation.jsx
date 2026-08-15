export default function Navigation({ currentPath = '/' }) {
  const isNetCalculator = currentPath === '/' || currentPath === '';
  const isElterngeld = currentPath === '/elterngeld' || currentPath.startsWith('/elterngeld');

  return (
    <header style={{
      background: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderBottom: '1px solid rgba(51, 65, 85, 0.6)',
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
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.35)',
            fontSize: '1.25rem'
          }}>
            🇩🇪
          </div>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1.15rem',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(90deg, #f8fafc, #93c5fd)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Steuer & Elterngeld Studio
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
              German Family Finance Engine
            </div>
          </div>
        </a>

        {/* Navigation Tabs */}
        <nav style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'rgba(30, 41, 59, 0.7)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(51, 65, 85, 0.8)'
        }}>
          {/* Tab 1: Net Pay Calculator */}
          <a
            href="/"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: isNetCalculator ? 600 : 500,
              color: isNetCalculator ? '#ffffff' : '#94a3b8',
              backgroundColor: isNetCalculator ? 'rgba(59, 130, 246, 0.25)' : 'transparent',
              border: isNetCalculator ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              boxShadow: isNetCalculator ? '0 2px 8px rgba(59, 130, 246, 0.2)' : 'none'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            Net Pay Calculator
          </a>

          {/* Tab 2: 5-Year Elterngeld Simulator */}
          <a
            href="/elterngeld"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              fontSize: '0.88rem',
              fontWeight: isElterngeld ? 600 : 500,
              color: isElterngeld ? '#ffffff' : '#94a3b8',
              backgroundColor: isElterngeld ? 'rgba(139, 92, 246, 0.3)' : 'transparent',
              border: isElterngeld ? '1px solid rgba(167, 139, 250, 0.5)' : '1px solid transparent',
              transition: 'all 0.2s ease',
              boxShadow: isElterngeld ? '0 2px 8px rgba(139, 92, 246, 0.25)' : 'none',
              position: 'relative'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3v18h18"/>
              <path d="m19 9-5 5-4-4-3 3"/>
            </svg>
            Elterngeld 5-Year Simulator
            <span style={{
              background: 'linear-gradient(135deg, #ec4899, #8b5cf6)',
              color: 'white',
              fontSize: '0.65rem',
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: '999px',
              letterSpacing: '0.04em',
              boxShadow: '0 0 8px rgba(236, 72, 153, 0.5)',
              animation: 'pulse 2s infinite'
            }}>
              NEW
            </span>
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
            color: '#64748b',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor: '#10b981',
              boxShadow: '0 0 6px #10b981'
            }}></span>
            <span>BEEG § 2–3 & EStG 2024–2026</span>
          </div>
        </div>
      </div>
    </header>
  );
}
