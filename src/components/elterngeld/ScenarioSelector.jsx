import { activeScenario, comparisonMetrics } from '../../store/elterngeldStore';

function formatCurrency(amount) {
  return new Intl.NumberFormat('de-DE', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0
  }).format(amount || 0);
}

export default function ScenarioSelector() {
  const current = activeScenario.value;
  const metrics = comparisonMetrics.value;

  const scenarios = [
    {
      id: 'C',
      title: 'Szenario C',
      subtitle: 'Vollständig optimiert (Empfohlen)',
      badge: 'Maximaler Leistungsbezug',
      badgeColor: '#10b981',
      description: 'Proaktiver Steuerklassenwechsel (H: V / W: III) 7 Monate vor Mutterschutz + Fiktives Netto + Geschwisterbonus + Steuererstattung.',
      highlights: [
        'Mutter: ElterngeldPlus bei maximal €900 / Monat',
        'Mutterschutzlohn bei €2.603 / Monat',
        'Geschwisterbonus +10% bis Kind 1 das 3. Lbj. vollendet',
        `Finanzamt-Erstattung: +${formatCurrency(metrics.taxRefundC)}`
      ]
    },
    {
      id: 'B',
      title: 'Szenario B',
      subtitle: 'Nicht optimiert (Statisch III/V)',
      badge: 'Standardverlauf',
      badgeColor: '#f59e0b',
      description: 'Kein Steuerklassenwechsel. Mutter bezieht Mutterschutz und ElterngeldPlus auf Basis Steuerklasse V.',
      highlights: [
        'Mutter ElterngeldPlus: €500,50 / Monat (Kind 1)',
        'Kind 2: Mindestbetrag €150 / Monat (14-Monate-Falle)',
        'Mutterschutzlohn bei €1.975 / Monat',
        `Verzicht auf ${formatCurrency(metrics.gainCvsB)} staatliche Förderung`
      ]
    },
    {
      id: 'A',
      title: 'Szenario A',
      subtitle: 'Basisfall (Keine Kinder)',
      badge: 'Status Quo',
      badgeColor: '#64748b',
      description: 'Keine Kinder. Fortlaufende Standardgehälter (Mann €2.895 + Frau €1.975 = €6.125 / Monat).',
      highlights: [
        'Konstant €6.125 / Monat Nettozufluss',
        'Keine Elternzeit / keine Lohnersatzleistungen',
        'Keine Teilzeitreduktion',
        '5-Jahres-Summe: €367.500'
      ]
    },
    {
      id: 'compare',
      title: 'Vergleich',
      subtitle: 'Szenarien-Gegenüberstellung',
      badge: 'Mehrfach-Vergleich',
      badgeColor: '#2563eb',
      description: 'Direkter Vergleich der monatlichen Liquiditätsverläufe und der kumulierten Vermögensbildung aller 3 Pfade.',
      highlights: [
        'Monatliche Liquiditätskurven im Vergleich',
        'Kumulierte Ertragsdifferenzen',
        'Direkter Förderungsvergleich',
        'Transparente Entscheidungsgrundlage'
      ]
    }
  ];

  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '14px',
        flexWrap: 'wrap',
        gap: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            display: 'inline-block',
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: '#2563eb'
          }}></span>
          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#e2e8f0', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
            Simulationsszenario auswählen
          </span>
        </div>
        <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
          Klicken Sie auf ein Szenario, um die Berechnungen sofort zu aktualisieren
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px'
      }}>
        {scenarios.map((sc) => {
          const isSelected = current === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => { activeScenario.value = sc.id; }}
              type="button"
              style={{
                textAlign: 'left',
                background: isSelected
                  ? '#1e293b'
                  : 'rgba(30, 41, 59, 0.5)',
                border: isSelected
                  ? `2px solid ${sc.badgeColor}`
                  : '1px solid #334155',
                borderRadius: '10px',
                padding: '16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                position: 'relative'
              }}
            >
              {/* Header: Title & Badge */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <div>
                  <div style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: isSelected ? '#ffffff' : '#f1f5f9'
                  }}>
                    {sc.title}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: isSelected ? '#93c5fd' : '#94a3b8', fontWeight: 500 }}>
                    {sc.subtitle}
                  </div>
                </div>
                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  padding: '3px 8px',
                  borderRadius: '4px',
                  backgroundColor: `${sc.badgeColor}20`,
                  color: sc.badgeColor,
                  border: `1px solid ${sc.badgeColor}50`
                }}>
                  {sc.badge}
                </span>
              </div>

              {/* Description */}
              <p style={{
                fontSize: '0.78rem',
                color: '#cbd5e1',
                lineHeight: 1.4,
                margin: '0 0 12px 0'
              }}>
                {sc.description}
              </p>

              {/* Highlights bullet list */}
              <div style={{
                borderTop: '1px solid #334155',
                paddingTop: '10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px'
              }}>
                {sc.highlights.map((h, i) => (
                  <div key={i} style={{
                    fontSize: '0.72rem',
                    color: isSelected ? '#e2e8f0' : '#94a3b8',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <span style={{ color: sc.badgeColor, fontSize: '0.8rem' }}>•</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
