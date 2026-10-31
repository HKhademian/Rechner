# Rechner — Calculator Marketplace

A calculator marketplace with independent German payroll and multi-year parental-leave planning workspaces. It separates payroll, standardized benefit net, annual tax assessment and cash received, with source-linked configuration and visible calculation limits.

---

## 📌 Feature Overview

The home catalog lists the available calculators. Each has a dedicated route, client entry, financial state and local storage namespace. Existing saved inputs migrate without deleting legacy data.

### Home catalog (`/`)

- Search by name or German/English keywords and filter by category. Filters are bookmarkable and support browser history.
- Pagination appears when the catalog exceeds the configured page size.
- Metadata-only registration prepares additional calculators without initializing their financial stores on the home page.
- See the [calculator app contract](.agents/docs/CALCULATOR_APPS.md) for adding another independent tool.

### 1. German Net Salary Calculator (`/calculators/net-pay/`)

- Verified 2025/2026 payroll profiles use the pinned offline BMF PAP. Select a published year and edit personal insurer, state, age, qualifying children, church-tax and factor inputs.
- Ordinary employee contributions use the selected year's rates and ceilings, including supported monthly Midijob calculations. Unsupported regimes carry explicit limitations.
- Monthly input means regular monthly pay; calculator yearly input means the actual annual total including contractual extras. Working months and extras are handled explicitly.
- Saved inputs are recalculated through the shared payroll engine. Arbitrary hypothetical tax tariffs are outside the product scope.

### 2. Elterngeld & Parental Leave Simulator (`/calculators/parental-leave/`)

Existing `/elterngeld` bookmarks redirect to this route.

- A configurable monthly cash horizon processes pregnancies, tax switches/reversions, raises, working-hour changes, bonuses and scoped financial events.
- Each parent/birth gets an actual eligible assessment history and a frozen standardized BEEG net. Plus uses the personal no-income ceiling, household sibling eligibility, claim budgets, eligible hours and overlap credits.
- Prior-year household taxable-income eligibility uses complete supported annual records or explicitly supplied personal evidence. Missing pre-birth months repeat the initial salary/class only as a labeled assumption; they do not establish annual taxable income.
- Complete supported tax years produce signed refunds or repayments from actual credits and liability, including progression and child-allowance comparison. Cash is posted once in the configured following-year month. Outside-horizon balances remain separate metadata.
- UI, CLI and CSV share ordered action, financial-event and regular-month rows. CSV v2 retains cents, progressive balances, escaped text, sources, projections and availability metadata.
- Missing data and unsupported calculations remain visibly unavailable or provisional. Calendar months approximate statutory life-month/day periods. A required historical PAP snapshot may be unavailable; manual take-home is not automatically benefit-assessment net. Future payroll years are marked projections.

See [statutory configuration and supported limits](.agents/docs/STATUTORY_CONFIGURATION.md), [timeline contracts](.agents/docs/TIMELINE_SIMULATION_MODEL.md), and [CSV v2 migration](.agents/docs/CSV_LEDGER_EXPORT.md). Passing reference cases verifies the modeled cases, not comprehensive statutory coverage or a guaranteed optimization gain.

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
│   ├── apps/                      # Independent app manifests and page entries
│   │   ├── registry.ts            # Metadata-only catalog and pagination model
│   │   ├── net-pay/               # Net pay entry and manifest
│   │   └── parental-leave/        # Parental leave entry and manifest
│   ├── engine/                    # Pure TypeScript statutory calculation engine
│   │   ├── types.ts               # Nominal branded types & validation guards
│   │   ├── tax/
│   │   │   ├── wageTax.ts         # Offline PAP payroll & sourced contributions
│   │   │   └── jointAssessment.ts # Joint splitting and child-allowance comparison
│   │   ├── benefits/
│   │   │   ├── mutterschutz.ts    # MuSchG § 19, 20 wage replacement
│   │   │   ├── elterngeldAssessment.ts # Tax-characteristic helpers; timeline uses assessmentHistory.ts
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
│   │   ├── CalculatorCatalog.tsx         # Searchable home marketplace
│   │   ├── Calculator.tsx                # Main container for net pay calculator
│   │   ├── ComparisonTable.tsx           # Scenario comparison matrix
│   │   ├── Icons.tsx                     # Minimalist icon components
│   │   ├── LiveCalculatorInputs.tsx      # Editable salary and household controls
│   │   ├── Navigation.tsx                # Global application header and navigation
│   │   ├── ResultsDisplay.tsx            # Wage deductions & social security breakdown
│   │   └── TaxSettings.tsx               # Statutory rates and contribution ceiling settings
│   ├── pages/
│   │   ├── index.astro                   # Route: / (calculator marketplace)
│   │   ├── calculators/                  # Dedicated calculator routes
│   │   │   ├── net-pay.astro
│   │   │   └── parental-leave.astro
│   │   └── elterngeld.astro              # Compatibility redirect
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
Open [http://localhost:4321](http://localhost:4321) in your browser to browse the calculator marketplace.

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

## 📜 Statutory Sources and Model Scope

Numerical defaults, effective profiles and primary links live in `src/data/benefitRules.json`, `taxRules.json`, `benefitIncomeLimits.json`, `employmentThresholds.json` and `timelineConventions.json`. Overridden assumptions and projected source years remain visible in results.

- [BEEG](https://www.gesetze-im-internet.de/beeg/BJNR274810006.html): household income eligibility, eligible histories, standardized deductions, personal allowance limits, sibling conditions and claim budgets.
- [Federal tax-class guidance](https://familienportal.de/familienportal/familienleistungen/elterngeld/arbeitssituation/auf-welche-steuerklasse-kommt-es-fuer-die-berechnung-meines-elterngelds-an-wenn-ich-die-steuerklasse-gewechselt-habe--124670): actual assessment characteristics and equal-duration classes.
- [MuSchG section 20](https://www.gesetze-im-internet.de/muschg_2018/__20.html): preceding wage reference; [section 3](https://www.gesetze-im-internet.de/muschg_2018/__3.html): actual protection periods, approximated by explicit calendar planning conventions here.
- [EStG section 36](https://www.gesetze-im-internet.de/estg/__36.html): payment credits and signed annual settlement. Tax deductions reduce the tax base; they are not guaranteed fixed cash refunds.
- [BMF payroll plans](https://www.bmf-steuerrechner.de/interface/programmablauf.xhtml): year-specific withholding. Publication snapshots needed for BEEG are checked separately from payroll effective years.

The [current model contract](.agents/docs/GERMAN_TAX_AND_ELTERNGELD_SCHEMES.md) links supported assumptions and independent regression references. Obsolete fixed-payout walkthroughs are retained only as clearly marked historical evidence.
