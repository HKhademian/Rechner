# Deutscher Netto- & Elterngeldrechner

Ein interaktives, clientseitiges Web-Analyse- und Simulationsstudio zur präzisen Berechnung des deutschen Nettolohns sowie zur mehrjährigen Finanz- und Elternzeitplanung (BEEG / EStG / MuSchG).

---

## 📌 Funktionsübersicht

Die Anwendung gliedert sich in zwei Kernmodule:

### 1. Deutscher Nettolohnrechner (`/`)
- **Vollständige Tarifberechnung**: Steuerklassen I bis VI gemäß § 32a EStG und Einkommensteuertarif 2024–2026.
- **Sozialversicherungsbeiträge mit Beitragsbemessungsgrenzen (BBG)**:
  - Gesetzliche Krankenversicherung (Allgemeiner Beitragssatz 14,6 % + kassenindividueller Zusatzbeitrag, paritätisch finanziert).
  - Gesetzliche Rentenversicherung (18,6 %, 50/50).
  - Arbeitslosenversicherung (2,6 %, 50/50).
  - Pflegeversicherung inklusive kinderlosen Zuschlägen (4,0 % für Kinderlose) und Entlastungsstufen ab dem 2. Kind.
- **Steuerabzüge & Freibeträge**:
  - Grundfreibetrag, Arbeitnehmer-Pauschbetrag (§ 9a EStG), Sonderausgaben-Vorsorgeaufwendungen (§ 10 EStG).
  - Entlastungsbetrag für Alleinerziehende (§ 24b EStG - Steuerklasse II).
  - Kirchensteuer (8 % in Bayern/Baden-Württemberg, sonst 9 %) und Solidaritätszuschlag mit Freigrenzenprüfung.
- **Partner- und Haushaltseffekt**: Gegenüberstellung von Einzel- und Haushaltsnettoeinkommen bei unterschiedlichen Steuerklassenkombinationen (III/V, IV/IV, IV mit Faktor).
- **Szenarien-Vergleich**: Speichern, Laden und Gegenüberstellen von bis zu mehreren Haushaltsszenarien.

### 2. Elterngeld & Elternzeit 5-Jahres-Simulation (`/elterngeld`)
- **60-Monate-Cashflow-Ledger**: Vollständige Simulation über 5 Jahre (60 Monate) für die Familienplanung mit zwei Kindern.
- **Gesetzliche Lohnersatzleistungen & Regelwerke**:
  - **Mutterschutzgesetz (MuSchG)**: 6 Wochen vor der Geburt und 8 Wochen nach der Geburt mit 100 % Nettoeinkommensersatz (Mutterschaftsgeld + Arbeitgeberzuschuss).
  - **Anrechnung Mutterschutz (§ 3 BEEG)**: Verbrauch der Basiselterngeldmonate 1 und 2 durch den nachgeburtlichen Mutterschutz.
  - **ElterngeldPlus & Deckelung**: 65 % des Nettoeinkommensverlustes bei Teilzeitarbeit, gedeckelt auf maximal **€900,00 / Monat**.
  - **Proaktiver Steuerklassenwechsel (III/V)**: Wechsel in Steuerklasse III mindestens 7 Monate vor dem Mutterschutz, um die überwiegende Steuerklasse im 12-monatigen Bemessungszeitraum (§ 2b BEEG) zu sichern (BFH-Urteil VI R 2/13).
  - **Fiktive Steuerklasse (*Fiktives Netto*)**: Nach der Geburt wechselt das Paar zurück in Klasse III (Mann) / V (Frau). Die Elterngeldstelle berechnet das ElterngeldPlus weiterhin auf Basis des hohen vorgeburtlichen Klasse-III-Nettos.
  - **Finanzamt-Steuererstattung (Ehegatten-Splitting)**: Monatliche Liquiditätseinbußen während der Wechselphase werden über die jährliche Einkommensteuererklärung (§ 26b EStG) zu 100 % erstattet.
  - **Partnermonate & Partnerschaftsbonus (§ 4b BEEG)**: 4 Partnermonate Mindestbetrag (€150 / Monat) für den Vater sowie je 4 zusätzliche Bonusmonate bei gleichzeitiger Teilzeitarbeit beider Elternteile zwischen 24 und 32 Wochenstunden.
  - **Geschwisterbonus (§ 2a BEEG)**: +10 % Zuschlag auf das Elterngeld für Kind 2, bis Kind 1 das 36. Lebensmonat (3. Lebensjahr) vollendet.
  - **14-Monate-Falle bei Kind 2**: Modellierung des verwässerten Bemessungszeitraums (10 Monate Teilzeit + 2 Monate Vollzeit) und Optimierung über erneuten Steuerklassenwechsel.

---

## ⚖️ Szenarien-Vergleichsmatrix (Standard-Parameter)

| Kennzahl | Szenario A (Basisfall) | Szenario B (Nicht optimiert) | Szenario C (Vollständig optimiert) | Differenz (C vs. B) |
| :--- | :--- | :--- | :--- | :--- |
| **Strategie** | Keine Kinder / Vollzeit | Statisch III/V ohne Wechsel | Proaktive Wechsel + Bonus-Ausschöpfung | Strategische Optimierung |
| **Verdiente Gehälter (60M)** | €367.500 | €309.560 | €303.890 | -€5.670 (Lohnsteuer-Einbehalt) |
| **Staatliche Leistungen (60M)** | €0 | €52.791 | €65.712 | **+€12.921** |
| **Finanzamt-Erstattung** | €0 | €0 | €5.670 | **+€5.670** (100 % Rückerstattung) |
| **Gesamter Mittelzufluss (60M)** | €367.500 | €362.351 | **€375.272** | **+€12.921 Liquiditätsvorteil** |

---

## 🛠️ Technologie-Stack

- **Framework**: [Astro 7](https://astro.build/) (Static Site Generation / Islands Architecture)
- **UI-Komponenten**: [Preact](https://preactjs.com/) (10.x)
- **Zustandsverwaltung**: [@preact/signals](https://preactjs.com/guide/v10/signals/) für reaktive, verzögerungsfreie Neuberechnungen
- **Visualisierung**: Eigenentwickelte, hochauflösende SVG-Diagramm-Engine (Gestapeltes Balkendiagramm, Flächentrend, Szenarien-Overlay)
- **Design System**: Vanilla CSS mit CSS-Variablen, semantischem Dark-Mode und nativer Responsivität

---

## 📁 Projektstruktur

```text
/
├── .agents/
│   ├── docs/                      # Architektur- und Berechnungsschemata
│   │   ├── ARCHITECTURE.md
│   │   ├── GERMAN_TAX_AND_ELTERNGELD_SCHEMES.md
│   │   └── TIMELINE_SIMULATION_MODEL.md
│   └── rules/                     # Arbeitsrichtlinien für Versionskontrolle und Dokumentation
├── src/
│   ├── components/
│   │   ├── elterngeld/
│   │   │   ├── ElterngeldDashboard.jsx   # Haupt-Container der 5-Jahres-Simulation
│   │   │   ├── KpiScorecard.jsx          # 4 dynamische Metrik-Karten
│   │   │   ├── ScenarioSelector.jsx      # Szenarien-Umschalter (A / B / C / Vergleich)
│   │   │   ├── TimelineChart.jsx         # Interaktives 60-Monate-SVG-Diagramm
│   │   │   ├── SandboxControls.jsx       # Parameter-Schieberegler & Presets
│   │   │   ├── RulesExplainer.jsx        # Gesetzesreferenzen & Urteile
│   │   │   └── TimelineTable.jsx         # 60-Monate-Tabelle & CSV-Export
│   │   ├── Calculator.jsx                # Haupt-Container des Nettolohnrechners
│   │   ├── ComparisonTable.jsx           # Vergleichstabelle für Steuer-Szenarien
│   │   ├── Icons.jsx                     # UI-Icon-Bibliothek
│   │   ├── InputForm.jsx                 # Eingabeformular für Gehalt & Steuerdaten
│   │   ├── Navigation.jsx                # Globale Navigation zwischen Seiten
│   │   ├── ResultsDisplay.jsx            # Aufschlüsselung der Steuer- & Sozialabgaben
│   │   └── TaxSettings.jsx               # Globale Tarifeinstellungen & Grenzwerte
│   ├── pages/
│   │   ├── index.astro                   # Route: / (Nettolohnrechner)
│   │   └── elterngeld.astro              # Route: /elterngeld (Elterngeld-Simulation)
│   ├── store/
│   │   ├── calculatorStore.js            # Zustand & Steuerberechnung Nettolohn
│   │   ├── elterngeldStore.js            # 60-Monate-Simulationsmodell & BEEG-Regelwerk
│   │   └── taxConfigStore.js             # Beitrags- und Freibetragskonfigurationen
│   └── styles/
│       └── global.css                    # Globales Theme und Layout-Stile
├── package.json
└── astro.config.mjs
```

---

## 🚀 Entwicklung & Befehle

Alle Befehle werden im Projekt-Wurzelverzeichnis ausgeführt:

| Befehl | Beschreibung |
| :--- | :--- |
| `npm install` | Installiert alle benötigten Abhängigkeiten |
| `npm run dev` | Startet den lokalen Entwicklungsserver unter `http://localhost:4321` |
| `npm run build` | Erstellt das produktionsreife Bundle im Verzeichnis `./dist/` |
| `npm run preview` | Startet eine lokale Vorschau des erstellten Produktions-Builds |

---

## 📜 Gesetzliche Grundlagen

Die mathematische und steuerliche Modellierung basiert auf den folgenden bundesdeutschen Gesetzen und höchstrichterlichen Entscheidungen:
1. **BEEG (Bundeselterngeld- und Elternzeitgesetz)**:
   - § 2: Höhe des Elterngeldes (65 % Ersatzrate, Deckelung auf €1.800 Basiselterngeld bzw. €900 ElterngeldPlus).
   - § 2a: Geschwisterbonus (+10 %, mindestens €75 bei ElterngeldPlus).
   - § 2b: Bemessungszeitraum (12 Kalendermonate vor dem Mutterschutz; Überwiegende Steuerklasse).
   - § 2e: Fiktiver Lohnsteuerabzug zur Bestimmung des Elterngeld-Nettos.
   - § 3: Anrechnung von Mutterschaftsleistungen.
   - § 4b: Partnerschaftsbonus bei gleichzeitiger Teilzeit von 24–32 Wochenstunden.
2. **MuSchG (Mutterschutzgesetz)**:
   - § 3: Schutzfristen vor und nach der Entbindung (6 Wochen / 8 Wochen).
   - § 19, 20: Mutterschaftsgeld und Arbeitgeberzuschuss (100 % Nettoausgleich).
3. **EStG (Einkommensteuergesetz)**:
   - § 32a: Einkommensteuertarif (Grundtarif und Splittingtarif).
   - § 26, 26b: Zusammenveranlagung von Ehegatten (Vollständige Erstattung von Steuerklassen-Differenzen).
   - § 39e: Verfahren zur Bildung und Änderung von Lohnsteuerabzugsmerkmalen.
4. **Rechtsprechung**:
   - **BFH Urteil vom 27.03.2014 – VI R 2/13**: Ein Steuerklassenwechsel zur Optimierung des Elterngeldes ist legal und stellt keinen Rechtsmissbrauch dar.
