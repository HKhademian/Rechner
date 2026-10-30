/** An incomplete edit keeps the last valid calculation; constructors validate completed values. */
export function parseCalculatorNumber<T extends number>(
  raw: string,
  construct: (value: number) => T,
): T | undefined {
  if (raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isFinite(value)) {
    throw new TypeError("Enter a finite number.");
  }
  return construct(value);
}
