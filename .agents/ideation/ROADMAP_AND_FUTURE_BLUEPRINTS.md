# Ideation & Future Simulation Blueprints

This directory stores all brainstorming, mechanics explorations, future blueprints, and experimental financial models separate from active production architecture.

---

## 1. Multi-Child Expansion (> 2 Children)
- **Concept**: Extend Batch 1 and Batch 2 lifecycle generators to support arbitrary $N$-child planning configurations.
- **Statutory Mechanics**:
  - Sibling bonus progressive tiering (§ 2a BEEG): +10% (min €75/mo) for 1 older child under 3, or 2 older children under 6.
  - Cumulative Kindergeld scaling (§ 66 EStG): Uniform €259/month per child across all sibling indices.
  - Multi-child Kinderfreibetrag tax reconciliation scaling ($N \times €9.540$).

---

## 2. Municipal Daycare (*Kita / Betreuungskosten*) Cost Models *(Wave 1 Implemented)*
- **Concept**: Integrate localized municipal parental contribution fee tables (*Elternbeitragstabellen*) by income bracket and federal state (*Bundesland*).
- **Statutory Mechanics**:
  - Tax deductibility of childcare costs under § 10 Abs. 1 Nr. 5 EStG (two-thirds of costs up to €4,000 per child/year through 2024; 80% up to €4,800 from 2025 under JStG 2024 as *Sonderausgaben*).
- **Status**: Implemented in `src/engine/benefits/childcare.ts`, `src/engine/formulas/pure/kitaOffsetEvaluator.ts`, and `/calculators/kita/`.

---

## 3. Dynamic Inflation & Capital Growth Mechanics
- **Concept**: Allow compounding wage inflation and real purchasing power discounting across 5- to 10-year timelines.
- **Statutory Mechanics**:
  - Indexed adjustment of Grundfreibetrag and tax brackets per statutory inflation progression acts (*Inflationsausgleichsgesetz*).

---

## 4. Germany Life Handy Toolbox (Waves 2–3 Backlog)
Tracked in full detail with governing statutes, shared-engine dependencies, inputs/outputs, and status table in [germany-life-toolbox-blueprint.md](germany-life-toolbox-blueprint.md):

- **Wave 2 — Payroll & Social Security Extensions** (`Money & taxes`):
  - [ ] **German Sick Pay & Transition Estimator** (`sick-pay`) — § 3 EFZG, § 47 SGB V, § 32b EStG
  - [ ] **Unemployment Benefit Estimator** (`unemployment-benefit`) — §§ 149–159 SGB III, § 32b EStG
  - [ ] **Public vs. Private Health Insurance Check** (`health-insurance-check`) — §§ 6, 10, 257 SGB V, § 10 EStG
  - [ ] **Notice Period & Severance Tax Optimizer** (`severance-notice`) — § 622 BGB, § 34 Abs. 1 EStG, § 14 SGB IV
- **Wave 3 — Everyday Statutory & Calendar Tools** (`Everyday`):
  - [ ] **Rental Deposit & Notice Deadline Calculator** (`rental-notice`) — §§ 551, 558, 573c BGB
  - [ ] **Working-Day, Vacation & Public Holiday Optimizer** (`holiday-bridge-optimizer`) — § 3 BUrlG, state *Feiertagsgesetze*
  - [ ] **Rundfunkbeitrag Household Split & Exemption Checker** (`rundfunkbeitrag`) — §§ 2, 4, 4a RBStV
