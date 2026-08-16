import { useState } from 'preact/hooks';

export default function RulesExplainer() {
  const [activeTab, setActiveTab] = useState(0);

  const rules = [
    {
      title: '1. Mutterschutzfristen & Lohnersatz',
      lawRef: 'MuSchG § 3, § 19 & BEEG § 3 Abs. 1',
      tag: '§ 1',
      summary: '100 % Netto-Lohnersatzleistung; verbraucht rechtlich die Elterngeldmonate 1 & 2.',
      content: (
        <div>
          <p>
            Gemäß dem <strong>Mutterschutzgesetz (MuSchG)</strong> gelten für angestellte Mütter gesetzliche Schutzfristen von <strong>6 Wochen vor der Entbindung</strong> und <strong>8 Wochen nach der Geburt</strong>.
          </p>
          <ul>
            <li><strong>100 % Nettoausgleich:</strong> Die gesetzliche Krankenkasse zahlt Mutterschaftsgeld (bis zu €13/Tag) und der Arbeitgeber leistet den Zuschuss nach § 20 MuSchG bis zur vollen Höhe des bisherigen Nettoarbeitsentgelts.</li>
            <li><strong>Anrechnung auf Elterngeld (§ 3 BEEG):</strong> Die nachgeburtlichen Mutterschutzmonate gelten kraft Gesetzes als verbrauchte Basiselterngeldmonate der Mutter. Der reguläre ElterngeldPlus-Bezug beginnt somit ab Lebensmonat 3.</li>
            <li><strong>Optimierungseffekt:</strong> Durch den rechtzeitigen Wechsel in <strong>Steuerklasse III</strong> beträgt der Mutterschutzlohn <strong>€2.603 / Monat</strong> statt €1.975 / Monat.</li>
          </ul>
        </div>
      )
    },
    {
      title: '2. Proaktiver Steuerklassenwechsel (III/V)',
      lawRef: 'BEEG § 2b & BFH-Urteil VI R 2/13',
      tag: '§ 2',
      summary: 'Wechsel in Steuerklasse III mindestens 7 Monate vor Mutterschutz sichert den Höchstbetrag.',
      content: (
        <div>
          <p>
            Der Bemessungszeitraum für das Elterngeld umfasst die <strong>12 Kalendermonate vor dem Monat des Beginns des Mutterschutzes</strong> (§ 2b BEEG).
          </p>
          <ul>
            <li><strong>Überwiegende Steuerklasse:</strong> Diejenige Steuerklasse, die in der Mehrheit der 12 Bemessungsmonate (innert 7 Monate) vorgelegen hat, wird für den gesamten Bemessungszeitraum zugrunde gelegt.</li>
            <li><strong>BFH-Urteil (VI R 2/13):</strong> Der Bundesfinanzhof hat ausdrücklich entschieden, dass ein Steuerklassenwechsel zur Maximierung des Elterngeldes legal ist und keinen Rechtsmissbrauch darstellt.</li>
            <li><strong>Zeitlicher Ablauf:</strong> Der Wechsel in Steuerklasse III (Frau) / V (Mann) erfolgt in Monat 4 bei Schwangerschaftsbeginn, genau 7 Monate vor dem Mutterschutz in Monat 11.</li>
          </ul>
        </div>
      )
    },
    {
      title: '3. Fiktive Steuerklasse (Fiktives Netto)',
      lawRef: 'BEEG § 2e (Fiktiver Steuerabzug)',
      tag: '§ 3',
      summary: 'Der Rückwechsel in Steuerklasse V nach der Geburt mindert das bewilligte Elterngeld nicht.',
      content: (
        <div>
          <p>
            Nach der Geburt wechselt das Ehepaar unmittelbar zurück in die Kombination <strong>Ehemann III / Ehefrau V</strong>, um die laufenden Lohnabzüge des Hauptverdieners zu minimieren.
          </p>
          <ul>
            <li><strong>Unveränderte Bemessungsgrundlage:</strong> Die Elterngeldstelle ermittelt den Elterngeldsatz ausschließlich anhand des im Bemessungszeitraum vor der Geburt festgestellten Nettoeinkommens (fiktives Netto).</li>
            <li><strong>Maximaler Auszahlungsbetrag:</strong> Die Mutter erhält bei Teilzeitarbeit nach der Geburt weiterhin den gedeckelten Höchstsatz von <strong>€900,00 / Monat</strong> ElterngeldPlus.</li>
          </ul>
        </div>
      )
    },
    {
      title: '4. Finanzamt-Steuererstattung (Ehegatten-Splitting)',
      lawRef: 'EStG § 26, § 26b (Zusammenveranlagung)',
      tag: '§ 4',
      summary: 'Lohnsteuer-Mehreinzahlungen während der Wechselphase werden zu 100 % erstattet.',
      content: (
        <div>
          <p>
            Steuerklassen steuern lediglich den unterjährigen monatlichen Lohnsteuerabzug als Vorauszahlung.
          </p>
          <ul>
            <li><strong>Splittingtarif:</strong> Bei der jährlichen Einkommensteuererklärung (§ 26b EStG) wird das gesamte Jahreseinkommen der Eheleute gemeinsam nach dem Grundsatz des Ehegatten-Splittings versteuert.</li>
            <li><strong>Vollständige Erstattung:</strong> Sämtliche unterjährigen Minderzuflüsse aus der Steuerklasse V des Mannes werden über die Steuererstattung zu 100 % an das Paar zurückbezahlt (+€5.670 Gesamtvolumen).</li>
          </ul>
        </div>
      )
    },
    {
      title: '5. Partnermonate & Partnerschaftsbonus',
      lawRef: 'BEEG § 4, § 4b (Partnerschaftsbonus)',
      tag: '§ 5',
      summary: '4 Partnermonate Mindestbetrag (€150/M) + 4 Bonusmonate bei paralleler Teilzeit (24–32h).',
      content: (
        <div>
          <p>
            Das BEEG ermöglicht die Kombination von ElterngeldPlus und Erwerbstätigkeit:
          </p>
          <ul>
            <li><strong>Partnermonate Ehemann:</strong> Der Vater bezieht für 4 Monate den Mindestbetrag von <strong>€150 / Monat</strong> ElterngeldPlus parallel zu seiner regulären 32-Stunden-Woche.</li>
            <li><strong>Partnerschaftsbonus:</strong> Arbeiten beide Elternteile gleichzeitig in 4 aufeinanderfolgenden Monaten zwischen <strong>24 und 32 Wochenstunden</strong>, erhalten beide Elternteile je <strong>4 zusätzliche Bonusmonate</strong> ElterngeldPlus.</li>
          </ul>
        </div>
      )
    },
    {
      title: '6. Geschwisterbonus',
      lawRef: 'BEEG § 2a (Geschwisterbonus)',
      tag: '§ 6',
      summary: '+10 % Zuschlag auf das Elterngeld von Kind 2 bis zum 3. Geburtstag von Kind 1.',
      content: (
        <div>
          <p>
            Lebt im Haushalt ein älteres Kind unter 3 Jahren (unter 36 Lebensmonaten), erhöht sich das Elterngeld für das Neugeborene:
          </p>
          <ul>
            <li><strong>Zuschlagshöhe:</strong> +10 % des zustehenden Elterngeldes (mindestens +€75 / Monat bei ElterngeldPlus bzw. +€150 bei Basiselterngeld).</li>
            <li><strong>Laufzeit:</strong> Kind 1 vollendet das 36. Lebensmonat in Monat 48. Bis zu diesem Monat wird der Geschwisterbonus für Kind 2 voll ausgezahlt.</li>
          </ul>
        </div>
      )
    },
    {
      title: '7. Bemessungszeitraum Kind 2 (14-Monate-Falle)',
      lawRef: 'BEEG § 2b Abs. 1 (Verwässerungsgrundsatz)',
      tag: '§ 7',
      summary: 'Vermeidung der Mindestbetragsfalle durch erneuten gezielten Steuerklassenwechsel.',
      content: (
        <div>
          <p>
            Für das zweite Kind fließen die Teilzeitmonate zwischen den Geburten in den 12-monatigen Bemessungszeitraum ein.
          </p>
          <ul>
            <li><strong>Das Problem in Szenario B:</strong> Ohne Anpassung sinkt das Elterngeld für Kind 2 auf den Sockelbetrag von <strong>€150 / Monat</strong> ab.</li>
            <li><strong>Die Lösung in Szenario C:</strong> Durch den rechtzeitigen zweiten Wechsel in Steuerklasse III (Teilzeit) wird das Elterngeld für Kind 2 auf <strong>€485,58 / Monat</strong> gesteigert.</li>
          </ul>
        </div>
      )
    }
  ];

  return (
    <div className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
        <div style={{
          background: 'rgba(37, 99, 235, 0.15)',
          padding: '8px',
          borderRadius: '6px',
          color: '#60a5fa',
          border: '1px solid #334155'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/>
            <path d="M6 6h10"/>
            <path d="M6 10h10"/>
          </svg>
        </div>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
            Gesetzliche Grundlagen & Rechtsprechung (BEEG / MuSchG / EStG)
          </h3>
          <p style={{ fontSize: '0.8rem', color: '#94a3b8', margin: '2px 0 0 0' }}>
            Klicken Sie auf einen Paragrafen, um die im Berechnungsmodell hinterlegten Rechtsnormen einzusehen.
          </p>
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(240px, 320px) 1fr',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {rules.map((rule, idx) => {
            const isSelected = activeTab === idx;
            return (
              <button
                key={rule.title}
                onClick={() => setActiveTab(idx)}
                type="button"
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: isSelected ? '#2563eb' : '#334155',
                  background: isSelected ? '#1e293b' : '#0f172a',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  borderLeft: isSelected ? '3px solid #2563eb' : '1px solid #334155'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 700 : 500,
                    color: isSelected ? '#ffffff' : '#cbd5e1'
                  }}>
                    {rule.title}
                  </span>
                  <span style={{
                    fontSize: '0.7rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: '#1e293b',
                    color: '#94a3b8',
                    border: '1px solid #334155',
                    fontFamily: 'monospace'
                  }}>
                    {rule.tag}
                  </span>
                </div>
                <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                  {rule.lawRef}
                </div>
              </button>
            );
          })}
        </div>

        <div style={{
          background: '#0f172a',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #334155'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            borderBottom: '1px solid #334155',
            paddingBottom: '12px',
            marginBottom: '14px'
          }}>
            <div>
              <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#f8fafc', margin: 0 }}>
                {rules[activeTab].title}
              </h4>
              <div style={{
                fontSize: '0.76rem',
                color: '#60a5fa',
                fontWeight: 600,
                marginTop: '3px'
              }}>
                Rechtsgrundlage: {rules[activeTab].lawRef}
              </div>
            </div>
          </div>

          <div style={{
            fontSize: '0.84rem',
            lineHeight: 1.6,
            color: '#cbd5e1'
          }}>
            {rules[activeTab].content}
          </div>
        </div>
      </div>
    </div>
  );
}
