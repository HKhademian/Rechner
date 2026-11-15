import assert from "node:assert/strict";
import {
  it,
} from "node:test";
import {
  formatEur,
  formatEurCents,
  formatEurOrUnavailable,
  formatSignedEurDelta,
} from "#utils/currencyFormat";

it("formats whole-euro and cent amounts consistently with German locale conventions", () => {
  assert.match(formatEur(50000), /50\.000\s*€/);
  assert.match(formatEurCents(1234.5), /1\.234,50\s*€/);
  assert.match(formatEur(Number.NaN), /0\s*€/);
});

it("handles optional amounts and custom fallbacks cleanly", () => {
  assert.equal(formatEurOrUnavailable(undefined), "Unavailable");
  assert.equal(formatEurOrUnavailable(Number.NaN), "Unavailable");
  assert.equal(formatEurOrUnavailable(undefined, 0, "—"), "—");
  assert.match(formatEurOrUnavailable(250, 0), /250\s*€/);
  assert.match(formatEurOrUnavailable(250, 2), /250,00\s*€/);
});

it("formats positive, negative, and zero deltas with optional percentage changes", () => {
  assert.equal(formatSignedEurDelta(0.2, 1000, 0), "No difference");
  assert.match(formatSignedEurDelta(300, 3000), /^\+300\s*€ \(\+10\.0%\)$/);
  assert.match(formatSignedEurDelta(-150, 3000), /^-150\s*€ \(-5\.0%\)$/);
  assert.match(formatSignedEurDelta(200), /^\+200\s*€$/);
});
