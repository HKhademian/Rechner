# German Tax & Elterngeld Legal Mathematical Schemes

This document details the mathematical models, formulas, and statutory legal logic implemented in the calculation engine.

---

## 1. Income Tax Calculation Model (§ 32a EStG)

The German income tax tariff (*Einkommensteuertarif*) is a piecewise progressive polynomial formula applied to taxable income (*Zu versteuerndes Einkommen - ZvE*).

### 1.1 Five Tax Zones (Grundtarif):
Let $z = \text{ZvE}$ and $G$ be the basic allowance (*Grundfreibetrag*):

1. **Zone 1 (Nullzone)**: $z \le G$
   $$\text{ESt} = 0$$

2. **Zone 2 (Progressionszone 1)**: $G < z \le G + 5.401$
   $$y = \frac{z - G}{10.000}$$
   $$\text{ESt} = \lfloor(922{,}98 \cdot y + 1.400) \cdot y\rfloor$$

3. **Zone 3 (Progressionszone 2)**: $G + 5.401 < z \le 66.760$
   $$t = \frac{z - (G + 5.401)}{10.000}$$
   $$\text{ESt} = \lfloor(216{,}16 \cdot t + 2.397) \cdot t + 865{,}13\rfloor$$

4. **Zone 4 (Proportionalzone 1 / Spitzensteuersatz 42 %)**: $66.760 < z \le 277.825$
   $$\text{ESt} = \lfloor 0{,}42 \cdot z - 10.453{,}22 \rfloor$$

5. **Zone 5 (Reichensteuer 45 %)**: $z > 277.825$
   $$\text{ESt} = \lfloor 0{,}45 \cdot z - 18.787{,}97 \rfloor$$

### 1.2 Married Splitting Tariff (§ 26b EStG)
For married couples filing jointly:
$$\text{ESt}_{\text{Splitting}} = 2 \cdot \text{Grundtarif}\left(\frac{\text{ZvE}_{\text{Person 1}} + \text{ZvE}_{\text{Person 2}}}{2}\right)$$

---

## 2. Social Security & Deductions Schemes

Social security contributions are calculated on gross income capped at the statutory assessment ceilings (*Beitragsbemessungsgrenzen - BBG*):

$$\text{Contribution} = \min(\text{Gross}, \text{BBG}) \cdot \text{Rate}$$

| Social Insurance Branch | Statutory Rate | Employee Share | Assessment Ceiling (BBG) |
| :--- | :--- | :--- | :--- |
| **Health Insurance (GKV)** | 14,6 % + Zusatzbeitrag (~1,7 %) | 50 % (approx. 8,15 %) | €62.100 / year (€5.175 / month) |
| **Pension Insurance (GRV)** | 18,6 % | 50 % (9,30 %) | €90.600 / year (€7.550 / month) |
| **Unemployment (AV)** | 2,6 % | 50 % (1,30 %) | €90.600 / year (€7.550 / month) |
| **Care Insurance (PV)** | 4,00 % (Base 2,2 % + 0,6 % Childless surcharge) | Variable by children | €62.100 / year |

---

## 3. German Parental Allowance Engine (BEEG)

### 3.1 Assessment Period (*Bemessungszeitraum* - § 2b BEEG)
- The assessment period consists of the **12 calendar months immediately preceding the month in which Mutterschutz begins**.
- **Predominant Tax Class Rule**: The tax class that was active for the *majority* of these 12 months (at least **7 out of 12 months**) is applied by the Elterngeldstelle across the entire assessment basis.
- **BFH Ruling (VI R 2/13)**: Shifting to Tax Class III to increase Elterngeld is a legitimate legal choice and does not constitute tax avoidance.

### 3.2 Maternity Protection & Offset (*Mutterschutz* - MuSchG & § 3 BEEG)
- **Pre-Birth Protection**: 6 weeks (1.5 months) before the expected delivery date.
- **Post-Birth Protection**: 8 weeks (2 months) following birth.
- **100 % Net Wage Replacement**: Mutterschaftsgeld (€13/day from statutory health insurance) + employer supplement (*Arbeitgeberzuschuss*) = 100 % of active net income.
- **Elterngeld Offset**: Under § 3 Abs. 1 BEEG, post-birth Mutterschutz months legally consume Months 1 and 2 of the Elterngeld entitlement.

### 3.3 ElterngeldPlus Calculation (§ 2, § 4 BEEG)
When a parent works part-time during parental leave:
$$\Delta_{\text{Net}} = \max(0, \text{Net}_{\text{Pre-Birth}} - \text{Net}_{\text{Part-Time}})$$
$$\text{ElterngeldPlus} = \min\left(900{,}00, \, \max\left(150{,}00, \, 0{,}65 \cdot \Delta_{\text{Net}}\right)\right)$$

### 3.4 The "Synthetic" Tax Rule (*Fiktive Steuerklasse* - § 2e BEEG)
Even when the couple reverts back to Tax Class III (Husband) / V (Wife) immediately following childbirth, the Elterngeldstelle calculates the pre-birth income basis using the locked Class III parameters from the pre-birth assessment period:
$$\text{Net}_{\text{Pre-Birth, Scenario C}} = €2.603{,}00 \implies \Delta_{\text{Net}} = €2.603 - €1.328 = €1.490$$
$$0{,}65 \cdot €1.490 = €968{,}50 \implies \mathbf{€900{,}00 / \text{month (Capped Maximum)}}$$

### 3.5 Partnerschaftsbonus & Partnermonate (§ 4b BEEG)
- **Husband Partnermonate**: 4 concurrent months of minimum ElterngeldPlus (€150 / month) while continuing standard employment (32 hours/week).
- **Partnerschaftsbonus**: When both parents concurrently work between **24 and 32 hours per week**, each parent receives **4 additional consecutive bonus months** of ElterngeldPlus (Months 26–29 for Child 1; Months 53–56 for Child 2).

### 3.6 Sibling Bonus (*Geschwisterbonus* - § 2a BEEG)
If an older sibling is living in the household:
- Applies until the older child completes their **36th month of life (3rd birthday)**.
- **Bonus Amount**: +10 % of the Elterngeld entitlement (minimum **+€75,00 / month** for ElterngeldPlus).
- In our timeline: Child 1 is born at Month 12 $\implies$ 3rd birthday at Month $12 + 36 = 48$. Child 2 receives the bonus from Month 39 until Month 48.

### 3.7 The 14-Month Assessment Trap (*14-Monate-Falle*)
For Child 2, the 12-month pre-birth assessment period captures part-time earnings:
$$\text{Net}_{\text{Pre-Birth, Blended}} = \frac{10 \cdot \text{Net}_{\text{Part-Time}} + 2 \cdot \text{Net}_{\text{Full-Time}}}{12}$$
- **Scenario B (Unoptimized)**: $\frac{10 \cdot 1.328 + 2 \cdot 1.975}{12} = €1.448{,}33 \implies \text{ElterngeldPlus drops to legal minimum } \mathbf{€150{,}00/mo}$.
- **Scenario C (Optimized with Swap 2)**: $\frac{10 \cdot 1.648 + 2 \cdot 2.603}{12} = €1.951{,}67 \implies \mathbf{€485{,}58/mo \text{ (with sibling bonus)}}$.

---

## 4. Annual Tax Reconciliation (*Finanzamt-Erstattung & § 26b EStG*)

During proactive tax swap phases, monthly net cash flow experiences a temporary wage tax withholding dip:
$$\Delta_{\text{Monthly Deficit}} = (\text{Net}_{\text{Husband III}} + \text{Net}_{\text{Wife V}}) - (\text{Net}_{\text{Husband V}} + \text{Net}_{\text{Wife III}})$$

- **Swap 1 (Full-Time)**: $(2.895 + 1.975) - (2.191 + 2.603) = 6.125 - 5.850 = \mathbf{275\text{ € / month}}$
- **Swap 2 (Part-Time)**: $(2.895 + 1.328) - (2.191 + 1.648) = 5.355 - 4.820 = \mathbf{535\text{ € / month}}$

Under German statutory joint assessment (*Ehegatten-Splitting* § 26b EStG), annual income tax liability is assessed on the aggregate household taxable income. Because Tax Class III/V couples are legally subject to mandatory assessment (*Pflichtveranlagung* § 46 Abs. 2 Nr. 3a EStG), monthly withholding differences are **100 % refunded** upon filing the annual income tax return (*Einkommensteuererklärung*):

### Chronological Calendar Tax Year Refunds (Realized in Year $Y+1$):
- **Year 1 Return (Filed in Year 2 / Month 15)**:
  $$\text{Refund}_{\text{Year 1}} = (8 \times 275\text{ €}) + 850\text{ € (Base Deductions)} = \mathbf{3.050\text{ €}}$$
- **Year 2 Return (Filed in Year 3 / Month 27)**:
  $$\text{Refund}_{\text{Year 2}} = (0 \times 275\text{ €}) + 850\text{ € (Base Deductions)} = \mathbf{850\text{ €}}$$
- **Year 3 Return (Filed in Year 4 / Month 39)**:
  $$\text{Refund}_{\text{Year 3}} = (6 \times 535\text{ €}) + 850\text{ € (Base Deductions)} = \mathbf{4.060\text{ €}}$$
- **Year 4 Return (Filed in Year 5 / Month 51)**:
  $$\text{Refund}_{\text{Year 4}} = (2 \times 535\text{ €}) + 850\text{ € (Base Deductions)} = \mathbf{1.920\text{ €}}$$
- **Year 5 Return**: Standard statutory deduction refund ($850\text{ €}$).

---

## 5. Strongly-Typed TypeScript Nominal Domain Scheme

All calculation primitives strictly enforce nominal branded types:
```typescript
// Strongly-typed time and currency domain primitives
export type SimulationMonth = Brand<number, 'SimulationMonth'>; // M1..M60
export type CalendarYear = Brand<number, 'CalendarYear'>;       // Y1..Y5
export type GrossSalary = Brand<number, 'GrossSalary'>;         // EUR Gross
export type NetSalary = Brand<number, 'NetSalary'>;             // EUR Net
export type EuroAmount = Brand<number, 'EuroAmount'>;           // Exact EUR
export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';
```
