# 60-Month Timeline Simulation Lifecycle Model

This document specifies the exact month-by-month timeline, lifecycle milestones, event triggers, and cash flow distributions across all 60 months of the simulation.

---

## 1. Timeline Lifecycle Architecture

```text
M01-M03: Pre-Pregnancy Planning Baseline (3 Months)
├── M04: Conception 1 & Swap 1 (Husband V / Wife III)
├── M04-M10: Pregnancy 1 Progression (7 Months Swap Active)
├── M11: Pre-Birth Mutterschutz 1 (6 weeks pre-birth)
├── M12: Birth of Child 1 & Reversion to H:III / W:V
├── M12-M13: Post-Birth Mutterschutz 1 (8 weeks post-birth)
├── M14-M25: Child 1 ElterngeldPlus (12 Months, €900/mo) + Partnermonate (M14-M17)
├── M26-M29: Partnerschaftsbonus 1 (4 Months, both 24-32h)
├── M30: Conception 2 (18-Month Gap after Birth 1)
├── M31: Swap 2 Initiated (Husband V / Wife III Part-time)
├── M31-M37: Pregnancy 2 Progression (7 Months Swap Active)
├── M38: Pre-Birth Mutterschutz 2 (6 weeks pre-birth)
├── M39: Birth of Child 2 & Reversion to H:III / W:V
├── M39-M40: Post-Birth Mutterschutz 2 (8 weeks post-birth)
├── M41-M48: Child 2 ElterngeldPlus with Geschwisterbonus (+10%)
├── M48: Child 1 Completes 36th Month of Life (3 Years Old)
├── M49: Sibling Bonus Expires
├── M49-M52: Child 2 ElterngeldPlus Standard Payout
├── M53-M56: Partnerschaftsbonus 2 (4 Months, both 24-32h)
└── M57-M60: Post-Leave Family Employment Stability (Kindergeld x2)
```

---

## 2. Detailed Monthly Matrix

| Month Range | Duration | Phase Description | Active Tax Class | Husband Salary | Wife Salary | State Benefit | Total Inflow (Scenario C) |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **M01 – M03** | 3 mo | Pre-Pregnancy Baseline | H: III \| W: V | €2.895 | €1.975 (FT) | €0 | **€6.125 / mo** |
| **M04 – M10** | 7 mo | Pregnancy 1 & Swap 1 | H: V \| W: III | €2.191 | €2.603 (FT) | €0 | **€5.850 / mo** |
| **M11** | 1 mo | Pre-Birth Mutterschutz 1 | H: V \| W: III | €2.191 | €0 | Mutterschutz: €2.603 | **€5.850 / mo** |
| **M12 – M13** | 2 mo | Post-Birth Mutterschutz 1 | H: III \| W: V | €2.895 | €0 | Mutterschutz: €2.603 + KG: €259 (+ Tax Refund M12) | **€7.104 / mo** (+€1.925 M12) |
| **M14 – M17** | 4 mo | Child 1 EGPlus + Partnermonate | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €900 + Husb EG: €150 + KG: €259 | **€6.664 / mo** |
| **M18 – M25** | 8 mo | Child 1 EGPlus Standard | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €900 + KG: €259 | **€6.514 / mo** |
| **M26 – M29** | 4 mo | Partnerschaftsbonus 1 | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €900 + Husb EG: €150 + KG: €259 | **€6.664 / mo** |
| **M30** | 1 mo | Conception 2 (18M Gap) | H: III \| W: V | €2.895 | €1.328 (PT) | KG: €259 | **€5.614 / mo** |
| **M31 – M37** | 7 mo | Pregnancy 2 & Swap 2 | H: V \| W: III | €2.191 | €1.648 (PT) | KG: €259 | **€5.079 / mo** |
| **M38** | 1 mo | Pre-Birth Mutterschutz 2 | H: V \| W: III | €2.191 | €0 | Mutterschutz: €1.648 + KG: €259 | **€5.079 / mo** |
| **M39 – M40** | 2 mo | Post-Birth Mutterschutz 2 | H: III \| W: V | €2.895 | €0 | Mutterschutz: €1.648 + KG: €518 (+ Tax Refund M39) | **€6.333 / mo** (+€3.745 M39) |
| **M41 – M48** | 8 mo | Child 2 EGPlus + Sibling Bonus | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €485,58 + Husb EG (M41-44) + KG: €518 | **€6.508 / mo** (M41-44) |
| **M49 – M52** | 4 mo | Child 2 EGPlus (Post-Bonus) | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €410,58 + KG: €518 | **€6.283 / mo** |
| **M53 – M56** | 4 mo | Partnerschaftsbonus 2 | H: III \| W: V | €2.895 | €1.328 (PT) | Wife EG: €410,58 + Husb EG: €150 + KG: €518 | **€6.433 / mo** |
| **M57 – M60** | 4 mo | Post-Leave Family Stability | H: III \| W: V | €2.895 | €1.328 (PT) | KG: €518 | **€5.873 / mo** |

---

## 3. Cash Flow Formulae

For each month $m \in [1, 60]$:
$$\text{Total Inflow}(m) = \text{Salary}_{\text{Husband}}(m) + \text{Salary}_{\text{Wife}}(m) + \text{Mutterschutz}(m) + \text{Elterngeld}_{\text{Wife}}(m) + \text{Elterngeld}_{\text{Husband}}(m) + \text{Kindergeld}(m) + \text{TaxRefund}(m)$$

$$\text{Cumulative Wealth}(M) = \sum_{m=1}^{M} \text{Total Inflow}(m)$$
