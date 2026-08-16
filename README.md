# German Net Salary Calculator & Elterngeld 5-Year Financial Simulator

An interactive, client-side web analysis and financial simulation studio for precise German net income calculations and multi-year parental leave planning (BEEG / EStG / MuSchG).

---

## 📌 Feature Overview

The application is structured into two core modules:

### 1. German Net Salary Calculator (`/`)
- **Complete Tax Computation**: Tax classes I through VI in accordance with German § 32a EStG and the 2024–2026 progressive income tax tariff.
- **Social Security Contributions with Contribution Ceilings (BBG)**:
  - Statutory Health Insurance (*Krankenversicherung*: General rate 14.6% + individual supplementary contribution, split 50/50).
  - Statutory Pension Insurance (*Rentenversicherung*: 18.6%, split 50/50).
  - Statutory Unemployment Insurance (*Arbeitslosenversicherung*: 2.6%, split 50/50).
  - Statutory Long-Term Care Insurance (*Pflegeversicherung*: 4.0% for childless individuals, with progressive relief tiers from the 2nd child onwards).
- **Tax Deductions & Allowances**:
  - Basic Tax-Free Allowance (*Grundfreibetrag*), Employee Lump-Sum Allowance (*Arbeitnehmer-Pauschbetrag* § 9a EStG), Special Expenses & Vorsorgeaufwand (§ 10 EStG).
  - Single Parent Tax Relief (*Entlastungsbetrag für Alleinerziehende* § 24b EStG - Tax Class II).
  - Church Tax (*Kirchensteuer*: 8% in Bavaria/Baden-Württemberg, 9% in all other states) and Solidarity Surcharge (*Solidaritätszuschlag*) exemption threshold verification.
- **Spouse & Household Modeling**: Direct side-by-side comparison of individual vs. household net income across tax class combinations (III/V, IV/IV, IV with factor).
- **Scenario Manager**: Save, load, edit, and compare multiple household scenarios.

### 2. Elterngeld & Parental Leave 5-Year Simulator (`/elterngeld`)
- **60-Month Cash Flow Ledger**: Complete 5-year chronological simulation for a household planning two children.
- **Statutory Wage Replacement Benefits & Legal Framework**:
  - **Maternity Protection Act (*Mutterschutzgesetz - MuSchG*)**: 6 weeks pre-birth and 8 weeks post-birth with 100% net wage replacement (Maternity benefit + Employer supplement).
  - **Maternity Offset (*Anrechnung MuSchG § 3 BEEG*)**: Post-birth maternity protection legally consumes Basic Elterngeld months 1 and 2.
  - **ElterngeldPlus & Statutory Cap**: 65% replacement rate for part-time income losses, capped at **€900.00 / month**.
  - **Proactive Tax Class Swap (III/V)**: Swapping to Tax Class III at least 7 months before maternity protection to secure Tax Class III as the predominant class across the 12-month assessment window (§ 2b BEEG; BFH Ruling VI R 2/13).
  - **Synthetic Net Principle (*Fiktives Netto*)**: Swapping back to Tax Class III (Husband) / V (Wife) post-birth does not lower the approved ElterngeldPlus entitlement.
  - **Tax Office Reconciliation (*Ehegatten-Splitting*)**: Monthly withholding deductions during the swap period are 100% refunded to the couple via the annual joint tax assessment (§ 26b EStG).
  - **Partner Months & Partnership Bonus (§ 4b BEEG)**: 4 partner months base rate (€150 / month) for the father plus 4 additional bonus months when both parents work part-time concurrently between 24 and 32 hours per week.
  - **Sibling Bonus (*Geschwisterbonus § 2a BEEG*)**: +10% surcharge on Child 2 Elterngeld until Child 1 turns 3 years old (36 months).
  - **14-Month Trap Avoidance (Child 2)**: Modeling the diluted assessment window (10 months part-time + 2 months full-time) and optimization via timed secondary tax class switching.

---

## ⚖️ Scenario Comparison Matrix (Standard Parameters)

| Metric | Scenario A (Baseline) | Scenario B (Unoptimized) | Scenario C (Fully Optimized) | Delta (C vs. B) |
| :--- | :--- | :--- | :--- | :--- |
| **Strategy** | No Children / Full-Time | Static III/V without swap | Proactive swaps + Bonus extraction | Strategic Optimization |
| **Earned Salaries (60M)** | €367,500 | €309,560 | €303,890 | -€5,670 (Interim tax withholding) |
| **State Benefits (60M)** | €0 | €52,791 | €65,712 | **+€12,921** |
| **Tax Office Refund** | €0 | €0 | €5,670 | **+€5,670** (100% reimbursed) |
| **Total Inflow (60M)** | €367,500 | €362,351 | **€375,272** | **+€12,921 Net Financial Gain** |

---

## 🛠️ Technology Stack

- **Framework**: [Astro 7](https://astro.build/) (Static Site Generation / Islands Architecture)
- **UI Components**: [Preact](https://preactjs.com/) (10.x)
- **State Management**: [@preact/signals](https://preactjs.com/guide/v10/signals/) for high-performance reactive computation
- **Data Visualization**: Custom SVG charting engine (Stacked Bar, Area Trend, Scenario Overlay)
- **Design System**: Vanilla CSS with design tokens, institutional dark mode, and responsive layout

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
│   ├── components/
│   │   ├── elterngeld/
│   │   │   ├── ElterngeldDashboard.jsx   # Main container for the 5-year simulation
│   │   │   ├── KpiScorecard.jsx          # 4 dynamic KPI scorecards
│   │   │   ├── ScenarioSelector.jsx      # Scenario switcher (A / B / C / Multi-view)
│   │   │   ├── TimelineChart.jsx         # Interactive 60-month SVG chart
│   │   │   ├── SandboxControls.jsx       # Parameter sliders & presets
│   │   │   ├── RulesExplainer.jsx        # Statutory references & legal precedents
│   │   │   └── TimelineTable.jsx         # 60-month tabular ledger & CSV export
│   │   ├── Calculator.jsx                # Main container for net pay calculator
│   │   ├── ComparisonTable.jsx           # Scenario comparison matrix
│   │   ├── Icons.jsx                     # Minimalist icon components
│   │   ├── InputForm.jsx                 # Salary and household inputs
│   │   ├── Navigation.jsx                # Global application header and navigation
│   │   ├── ResultsDisplay.jsx            # Wage deductions & social security breakdown
│   │   └── TaxSettings.jsx               # Statutory rates and contribution ceiling settings
│   ├── pages/
│   │   ├── index.astro                   # Route: / (Net Pay Calculator)
│   │   └── elterngeld.astro              # Route: /elterngeld (Elterngeld Simulation)
│   ├── store/
│   │   ├── calculatorStore.js            # Reactive state for salary calculations
│   │   ├── elterngeldStore.js            # 60-month simulation engine & BEEG rules
│   │   └── taxConfigStore.js             # Tax parameters and social ceilings
│   └── styles/
│       └── global.css                    # Design tokens and global theme
├── package.json
└── astro.config.mjs
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
