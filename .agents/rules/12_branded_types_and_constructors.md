# Nominal Branded Types and Runtime Constructors

All IDs and domain primitives (months, years, salaries, benefits, hours, action IDs) must use nominal branded types (`Brand<BaseType, Tag>`).

Never pass raw unbranded strings or numbers across domain boundaries.

Every branded type must provide an exported constructor function that validates range, type, or integrity constraints before casting:
- `toSimulationMonth(month: number): SimulationMonth`
- `toCalendarMonth(month: number): CalendarMonth`
- `toCalendarYear(year: number): CalendarYear`
- `toNetSalary(amount: number): NetSalary`
- `toGrossSalary(amount: number): GrossSalary`
- `toEuroAmount(amount: number): EuroAmount`
- `toActionId(id: string): ActionId`
- `toPregnancyId(id: string): PregnancyId`
- `toSwitchId(id: string): SwitchId`
- `toRaiseId(id: string): RaiseId`

Constructors must throw an explicit `TypeError` if input is empty, out of bounds, or invalid.

**Strict Domain Boundary Enforcement**:
- Internal calculation and helper functions MUST NEVER accept `Type | number` or `Type | string` as fallback parameter types.
- Fallback unions destroy brand safety by allowing unvalidated raw values to leak into the business domain without validation.
- All values entering domain logic must be constructed through their designated boundary constructor first.
