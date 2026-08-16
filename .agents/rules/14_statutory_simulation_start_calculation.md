# Statutory Simulation Start Calculation

The simulation start calendar year and month must be dynamically calibrated based on the first positive pregnancy test date:

1. **Rule**: The simulation must start at least **3 months before the positive pregnancy test** and snap to the **first month (January / 01) of the resulting calendar year**.
2. **Formula**:
   - If positive pregnancy test is at month $M_{preg}$ of year $Y_{preg}$:
   - Subtract 3 months: $TotalMonths = (Y_{preg} \times 12 + M_{preg}) - 3$.
   - The start calendar year is $StartYear = \lfloor(TotalMonths - 1) / 12\rfloor$.
   - The start calendar month is always $StartMonth = 1$ (January).
3. **Example**:
   - Positive test at `02.2028`: 3 months prior is `11.2027` $\rightarrow$ Simulation start snaps to `01.2027`.
   - Default baseline positive test at `09.2026`: 3 months prior is `06.2026` $\rightarrow$ Simulation start snaps to `01.2026`.
