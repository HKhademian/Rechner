# German Net Salary Calculator & Elterngeld 5-Year Financial Simulator

An interactive, client-side web analysis and financial simulation studio for precise German net income calculations and multi-year parental leave planning (BEEG / EStG / MuSchG).

---

## 📌 Feature Overview

The application is structured into two core modules:

### 1. German Net Salary Calculator (`/`)
- **Complete Tax Computation**: Tax classes I through VI in accordance with German § 32a EStG and the 2024–2026 progressive income tax tariff.
- **Social Security Contributions with Assessment Ceilings (*Beitragsbemessungsgrenzen - BBG*)**:
  - Statutory Health Insurance (*Gesetzliche Krankenversicherung - GKV* § 241a SGB V: General rate 14.6% + individual supplementary contribution, split 50/50).
  - Statutory Pension Insurance (*Gesetzliche Rentenversicherung - GRV* § 158 SGB VI: 18.6%, split 50/50).
  - Statutory Unemployment Insurance (*Arbeitslosenversicherung - ALV* § 341 SGB III: 2.6%, split 50/50).
  - Statutory Long-Term Care Insurance (*Pflegeversicherung - PV* § 55 SGB XI: 4.0% for childless individuals, with progressive relief tiers from the 2nd child onwards).
- **Tax Deductions & Allowances**:
  - Basic Tax-Free Allowance (*Grundfreibetrag* § 32a Abs. 1 EStG), Employee Lump-Sum Allowance (*Arbeitnehmer-Pauschbetrag* § 9a EStG), Special Expenses & Pension Expenses (*Sonderausgaben & Vorsorgeaufwendungen* § 10 EStG).
  - Single Parent Relief (*Entlastungsbetrag für Alleinerziehende* § 24b EStG - Tax Class II / *Steuerklasse II*).
  - Church Tax (*Kirchensteuer*: 8% in Bavaria/Baden-Württemberg, 9% in all other states) and Solidarity Surcharge (*Solidaritätszuschlag* SolzG) exemption threshold verification.
- **Spouse & Household Modeling**: Direct side-by-side comparison of individual vs. household net income across tax class combinations (III/V, IV/IV, IV with factor).
- **Scenario Manager**: Save, load, edit, and compare multiple household scenarios.

### 2. Elterngeld & Parental Leave 5-Year Simulator (`/elterngeld`)
- **60-Month Cash Flow Ledger**: Complete 5-year chronological simulation for a household planning two children.
- **Special Life & Fiscal Event Rows**: Separate ledger rows for Vacation Bonus (40% in May), Christmas Bonus (60% in Nov), and Annual Tax Assessment Returns (March) with statutory tags.
- **Statutory Wage Replacement Benefits & Legal Framework**:
  - **Maternity Protection Act (*Mutterschutzgesetz - MuSchG*)**: 6 weeks pre-birth and 8 weeks post-birth with 100% net wage replacement (Maternity benefit + Employer supplement / *Mutterschaftsgeld & Arbeitgeberzuschuss* § 19, § 20 MuSchG).
  - **Maternity Offset (*Anrechnung von Mutterschaftsleistungen* § 3 BEEG)**: Post-birth maternity protection legally consumes Basic Elterngeld months 1 and 2.
  - **ElterngeldPlus & Statutory Cap (*ElterngeldPlus* § 4 BEEG)**: 65% replacement rate for part-time income losses, capped at **€900.00 / month**.
  - **Proactive Tax Class Swap (*Steuerklassenwechsel* III/V § 39e EStG / § 2b BEEG)**: Swapping to Tax Class III at least 7 months before maternity protection to secure Tax Class III as the predominant class across the 12-month assessment window (Federal Fiscal Court / *BFH Urteil VI R 2/13*).
  - **Synthetic Net Principle (*Fiktives Netto* § 2e BEEG)**: Swapping back to Tax Class III (Husband) / V (Wife) post-birth does not lower the approved ElterngeldPlus entitlement.
  - **Tax Office Reconciliation (*Ehegatten-Splitting* § 26, § 26b EStG)**: Monthly withholding deductions during the swap period are 100% refunded to the couple via the annual joint tax assessment.
  - **Partner Months & Partnership Bonus (*Partnermonate & Partnerschaftsbonus* § 4, § 4b BEEG)**: 4 partner months base rate (€150 / month) for the father plus 4 additional bonus months when both parents work part-time concurrently between 24 and 32 hours per week.
  - **Sibling Bonus (*Geschwisterbonus* § 2a BEEG)**: +10% surcharge on Child 2 Elterngeld until Child 1 turns 3 years old (36 months).
  - **14-Month Trap Avoidance (*14-Monate-Verwässerungsfalle* § 2b BEEG)**: Modeling the diluted assessment window (10 months part-time + 2 months full-time) and optimization via timed secondary tax class switching.

---

## 🛠️ Technology Stack & Test Suite

- **Framework**: [Astro 7](https://astro.build/) (Static Site Generation / Islands Architecture)
- **Engine**: Pure TypeScript with Nominal Branded Types (`SimulationMonth`, `CalendarYear`, `GrossSalary`, `NetSalary`, `EuroAmount`, `TaxClass`)
- **UI Components**: [Preact](https://preactjs.com/) (10.x)
- **State Management**: [@preact/signals](https://preactjs.com/guide/v10/signals/) for high-performance reactive computation
- **Data Visualization**: Custom SVG charting engine (Stacked Bar, Multi-Series Line, Area Trend, Scenario Overlay)
- **Test Suite**: Native Node.js test runner with **1,116+ unit and scenario tests** verifying statutory equations, edge cases, and combinatorial sweeps:
  ```bash
  npm test
  ```

---

## 📁 Project Structure

```text
/
├── .agents/
│   ├── docs/                      # Architectural specifications and tax schemas
│   │   ├── ARCHITECTURE.md
│   │   ├── GERMAN_TAX_AND_ELTERNGELD_SCHEMES.md
│   │   └── TIMELINE_SIMULATION_MODEL.md
│   └── rules/                     # Version control, atomic commit, and behavioral rules
├── src/
│   ├── engine/                    # Pure TypeScript statutory calculation engine
│   │   ├── types.ts               # Nominal branded types & validation guards
│   │   ├── tax/
│   │   │   ├── wageTax.ts         # § 32a EStG polynomial, Solz, social caps
│   │   │   └── jointAssessment.ts # § 26b EStG splitting & swap withholding reconciliation
│   │   ├── benefits/
│   │   │   ├── mutterschutz.ts    # MuSchG § 19, 20 wage replacement
│   │   │   ├── elterngeldAssessment.ts # 12M Bemessungszeitraum & 7M dominant class
│   │   │   ├── elterngeldPlus.ts  # BEEG § 2, 4, 4a sliding scale & caps
│   │   │   ├── siblingBonus.ts    # BEEG § 2a Geschwisterbonus (+10% / min €75)
│   │   │   └── kindergeld.ts      # EStG § 66 child benefit
│   │   ├── ledger/
│   │   │   ├── transaction.ts     # Immutable transaction factory & audit trails
│   │   │   └── ledger.ts          # 60-Month balance conservation aggregator
│   │   └── simulator/
│   │       └── timelineGenerator.ts # Deterministic multi-year timeline generator
│   ├── components/
│   │   ├── elterngeld/
│   │   │   ├── ElterngeldDashboard.tsx   # Main container for the 5-year simulation
│   │   │   ├── KpiScorecard.tsx          # Dynamic KPI scorecards
│   │   │   ├── ScenarioSelector.tsx      # Scenario switcher (A / B / C / Multi-view)
│   │   │   ├── TimelineChart.tsx         # Interactive 60-month SVG chart (4 modes)
│   │   │   ├── SandboxControls.tsx       # Parameter sliders, presets & bonus controls
│   │   │   ├── RulesExplainer.tsx        # Statutory references & legal precedents
│   │   │   └── TimelineTable.tsx         # 60-month tabular ledger with event rows & CSV export
│   │   ├── Calculator.tsx                # Main container for net pay calculator
│   │   ├── ComparisonTable.tsx           # Scenario comparison matrix
│   │   ├── Icons.tsx                     # Minimalist icon components
│   │   ├── InputForm.tsx                 # Salary and household inputs
│   │   ├── Navigation.tsx                # Global application header and navigation
│   │   ├── ResultsDisplay.tsx            # Wage deductions & social security breakdown
│   │   └── TaxSettings.tsx               # Statutory rates and contribution ceiling settings
│   ├── pages/
│   │   ├── index.astro                   # Route: / (Net Pay Calculator)
│   │   └── elterngeld.astro              # Route: /elterngeld (Elterngeld Simulation)
│   ├── store/
│   │   ├── calculatorStore.ts            # Reactive state for salary calculations
│   │   ├── elterngeldStore.ts            # Signal store bridging to TypeScript engine
│   │   └── taxConfigStore.ts             # Tax parameters and social ceilings
│   └── styles/
│       └── global.css                    # Design tokens and global theme
├── test/
│   ├── unit/
│   │   ├── types.test.ts
│   │   ├── tax/
│   │   │   ├── wageTax.test.ts
│   │   │   ├── wageTax.granular.test.ts
│   │   │   ├── jointAssessment.test.ts
│   │   │   └── jointAssessment.granular.test.ts
│   │   ├── benefits/
│   │   │   ├── mutterschutz.test.ts
│   │   │   ├── elterngeldAssessment.test.ts
│   │   │   ├── elterngeldPlus.test.ts
│   │   │   ├── elterngeldScale.granular.test.ts
│   │   │   ├── siblingBonus.test.ts
│   │   │   └── kindergeld.test.ts
│   │   └── ledger/
│   │       └── ledger.test.ts
│   ├── scenarios/
│   │   ├── scenarios.test.ts
│   │   └── simulationMatrix.granular.test.ts
│   └── combinations/
│       └── parameterGrid.test.ts
├── package.json
└── astro.config.mjs
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js >= 22.12.0

### Installation & Execution
```bash
npm install
npm run dev
```
Open [http://localhost:4321](http://localhost:4321) in your browser.

### Run Comprehensive Tests (1,116+ Tests)
```bash
npm test
```


---

## 🚀 Development & Commands

Run all commands from the project root:

| Command | Description |
| :--- | :--- |
| `npm install` | Installs project dependencies |
| `npm run dev` | Starts local dev server at `http://localhost:4321` |
| `npm run build` | Builds static production bundle in `./dist/` |
| `npm run preview` | Previews production build locally |

---

## 📜 Statutory Foundations & Legal Precedents

The underlying mathematical and legal models are strictly aligned with German statutory law and federal court rulings:
1. **BEEG (Federal Parental Allowance and Parental Leave Act)**:
   - § 2: Calculation and standard 65% replacement rate, statutory caps (€1,800 Basic / €900 ElterngeldPlus).
   - § 2a: Sibling bonus (+10%, minimum €75 for ElterngeldPlus).
   - § 2b: Assessment period (12 calendar months pre-maternity; predominant tax class rule).
   - § 2e: Synthetic wage tax deductions for establishing Elterngeld net income.
   - § 3: Offsetting maternity benefits against parental allowance entitlement.
   - § 4b: Partnership bonus months for concurrent part-time work between 24 and 32 hours per week.
2. **MuSchG (Maternity Protection Act)**:
   - § 3: Statutory protection periods (6 weeks pre-birth / 8 weeks post-birth).
   - § 19, 20: Maternity allowance and employer supplementary allowance (100% net wage compensation).
3. **EStG (Income Tax Act)**:
   - § 32a: Progressive income tax formula (Basic tariff & Splitting tariff).
   - § 26, 26b: Joint income tax assessment for married couples (100% tax reconciliation).
   - § 39e: Procedures for modifying wage tax deduction characteristics.
4. **Jurisprudence**:
   - **Federal Fiscal Court (BFH Ruling of March 27, 2014 – VI R 2/13)**: Tax class modifications executed to optimize parental allowance benefits are lawful and do not constitute an abuse of legal rights.
