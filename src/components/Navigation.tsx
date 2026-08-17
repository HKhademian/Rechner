import type { JSX } from 'preact';
import ThemeToggle from '#components/ThemeToggle';

export interface NavigationProps {
  currentPath?: string;
}

export default function Navigation({ currentPath = '/' }: NavigationProps): JSX.Element {
  const isNetCalculator = currentPath === '/' || currentPath === '';
  const isElterngeld = currentPath === '/elterngeld' || currentPath.startsWith('/elterngeld');

  return (
    <header style={{
      background: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 50,
      width: '100%',
      boxShadow: 'var(--shadow-sm)',
      transition: 'var(--transition)'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '10px 24px',
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
          color: 'inherit'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--border-radius-sm)',
            background: 'var(--color-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.2rem',
            color: '#ffffff',
            fontWeight: 800,
            boxShadow: 'var(--shadow-sm)'
          }}>
            §
          </div>
          <div>
            <div style={{
              fontWeight: 800,
              fontSize: '1.05rem',
              letterSpacing: '-0.02em',
              color: 'var(--text-primary)'
            }}>
              German Net Salary & Parental Allowance Planner
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', letterSpacing: '0.02em' }}>
              Household Financial & Parental Leave Optimization (BEEG / EStG)
            </div>
          </div>
        </a>

        {/* Navigation Tabs & Theme Toggle Container */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexWrap: 'wrap'
        }}>
          {/* Navigation Tabs */}
          <nav style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'var(--bg-surface-secondary)',
            padding: '3px',
            borderRadius: 'var(--border-radius)',
            border: '1px solid var(--border-subtle)'
          }}>
            {/* Tab 1: Net Pay Calculator */}
            <a
              href="/"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-sm)',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isNetCalculator ? 700 : 500,
                color: isNetCalculator ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isNetCalculator ? 'var(--color-primary)' : 'transparent',
                boxShadow: isNetCalculator ? 'var(--shadow-sm)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
              Net Calculator
            </a>

            {/* Tab 2: 5-Year Elterngeld Simulator */}
            <a
              href="/elterngeld"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '6px 12px',
                borderRadius: 'var(--border-radius-sm)',
                textDecoration: 'none',
                fontSize: '0.82rem',
                fontWeight: isElterngeld ? 700 : 500,
                color: isElterngeld ? '#ffffff' : 'var(--text-secondary)',
                backgroundColor: isElterngeld ? 'var(--color-primary)' : 'transparent',
                boxShadow: isElterngeld ? 'var(--shadow-sm)' : 'none',
                transition: 'var(--transition)'
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 3v18h18"/>
                <path d="m19 9-5 5-4-4-3 3"/>
              </svg>
              Elterngeld 5-Year Simulator
            </a>
          </nav>

          {/* Legal Reference Badge */}
          <div style={{
            fontSize: '0.75rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 8px',
            background: 'var(--bg-surface-secondary)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--border-radius-sm)'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--color-gain)'
            }}></span>
            <span>2024–2026 EStG/BEEG</span>
          </div>

          {/* Institutional Theme Toggle (Light / Dark / Auto) */}
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
