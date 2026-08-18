import type {
  JSX, 
} from "preact";
import {
  grossIncome,
  taxBracket,
  hasChurchTax,
  hasPartner,
  partnerGrossIncome,
  partnerTaxBracket,
  partnerHasChurchTax,
  partnerState,
  partnerWorkingMonths,
  partnerSalariesPerYear,
  state,
  children,
  workingMonths,
  salariesPerYear,
  inputMode,
} from "#store/calculatorStore";
import {
  useState, useEffect, 
} from "preact/hooks";
import TaxSettings from "#components/TaxSettings";
import {
  ConfigureSandboxIcon, 
} from "#components/Icons";
import germanStates from "../data/germanStates.json" with { type: "json" };

const GERMAN_STATES: readonly string[] =
  germanStates satisfies readonly string[];

export default function InputForm(): JSX.Element {
  const [mounted, setMounted] = useState<boolean>(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <div class="glass-panel fade-in">Loading parameters...</div>;
  }

  const isMonthly = inputMode.value === "monthly";

  return (
    <div class="glass-panel fade-in">
      <h2>Household &amp; Salary Parameters</h2>

      <div style={{ display: "flex",
        gap: "10px",
        marginBottom: "20px" }}>
        <button
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "var(--transition)",
            background: isMonthly
              ? "var(--color-primary)"
              : "var(--bg-surface-secondary)",
            color: isMonthly ? "#ffffff" : "var(--text-secondary)",
            fontWeight: 600,
          }}
          onClick={() => {
            inputMode.value = "monthly";
          }}
        >
          Monthly Input
        </button>
        <button
          style={{
            flex: 1,
            padding: "8px",
            borderRadius: "var(--border-radius-sm)",
            border: "1px solid var(--border-subtle)",
            cursor: "pointer",
            transition: "var(--transition)",
            background: !isMonthly
              ? "var(--color-primary)"
              : "var(--bg-surface-secondary)",
            color: !isMonthly ? "#ffffff" : "var(--text-secondary)",
            fontWeight: 600,
          }}
          onClick={() => {
            inputMode.value = "yearly";
          }}
        >
          Yearly Input
        </button>
      </div>

      <div class="input-group">
        <label for="children">
          Number of Children (*Kinderfreibetrag* § 32 Abs. 6 EStG)
        </label>
        <select
          id="children"
          value={children.value}
          onChange={(e) => {
            children.value = Number((e.target as HTMLSelectElement).value);
          }}
        >
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? "Child" : "Children"}
            </option>
          ))}
        </select>
      </div>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border-subtle)",
          margin: "30px 0",
        }}
      />

      <h3>Person 1 Details</h3>
      <div class="input-group">
        <label for="gross">
          Gross Income ({isMonthly ? "Monthly" : "Yearly"}): €
          {grossIncome.value.toLocaleString("de-DE")}
        </label>
        <input
          id="gross"
          type="range"
          min={isMonthly ? "1000" : "12000"}
          max={isMonthly ? "15000" : "200000"}
          step={isMonthly ? "100" : "1000"}
          value={grossIncome.value}
          onInput={(e) => {
            grossIncome.value = Number((e.target as HTMLInputElement).value);
          }}
        />
        <input
          type="number"
          value={grossIncome.value}
          onInput={(e) => {
            grossIncome.value = Number((e.target as HTMLInputElement).value);
          }}
          style={{ marginTop: "10px" }}
        />
      </div>

      <div class="input-group">
        <label for="salariesPerYear">
          Salaries Received / Year (e.g. 13th month bonus)
        </label>
        <select
          id="salariesPerYear"
          value={salariesPerYear.value}
          onChange={(e) => {
            salariesPerYear.value = Number(
              (e.target as HTMLSelectElement).value,
            );
          }}
        >
          {[12, 12.5, 13, 13.5, 14].map((num) => (
            <option key={num} value={num}>
              {num} Salaries
            </option>
          ))}
        </select>
      </div>

      <div class="input-group">
        <label for="workingMonths">Active Working Months / Year</label>
        <select
          id="workingMonths"
          value={workingMonths.value}
          onChange={(e) => {
            workingMonths.value = Number((e.target as HTMLSelectElement).value);
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
            <option key={num} value={num}>
              {num} {num === 1 ? "Month" : "Months"}
            </option>
          ))}
        </select>
      </div>

      <div class="input-group">
        <label for="bracket">Tax Class (*Steuerklasse* § 38b EStG)</label>
        <select
          id="bracket"
          value={taxBracket.value}
          onChange={(e) => {
            taxBracket.value = (e.target as HTMLSelectElement).value;
          }}
        >
          <option value="1">Class I (Single / *Steuerklasse I*)</option>
          <option value="2">
            Class II (Single Parent / *Steuerklasse II* § 24b EStG)
          </option>
          <option value="3">
            Class III (Married, Primary Earner / *Steuerklasse III*)
          </option>
          <option value="4">
            Class IV (Married, Equal Earners / *Steuerklasse IV*)
          </option>
          <option value="5">
            Class V (Married, Secondary Earner / *Steuerklasse V*)
          </option>
          <option value="6">
            Class VI (Secondary Job / *Steuerklasse VI*)
          </option>
        </select>
      </div>

      <div class="input-group">
        <label for="state">Federal State (*Bundesland*)</label>
        <select
          id="state"
          value={state.value}
          onChange={(e) => {
            state.value = (e.target as HTMLSelectElement).value;
          }}
        >
          {GERMAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      <div
        class="input-group"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <label for="church" style={{ marginBottom: 0 }}>
          Liable for Church Tax (*Kirchensteuer*)?
        </label>
        <label class="switch">
          <input
            id="church"
            type="checkbox"
            checked={hasChurchTax.value}
            onChange={(e) => {
              hasChurchTax.value = (e.target as HTMLInputElement).checked;
            }}
          />
          <span class="slider"></span>
        </label>
      </div>

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border-subtle)",
          margin: "30px 0",
        }}
      />

      <div
        class="input-group"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ margin: 0 }}>Add Spouse / Partner (*Ehegatte*)</h3>
        <label class="switch">
          <input
            type="checkbox"
            checked={hasPartner.value}
            onChange={(e) => {
              hasPartner.value = (e.target as HTMLInputElement).checked;
            }}
          />
          <span class="slider"></span>
        </label>
      </div>

      {hasPartner.value && (
        <div
          class="fade-in"
          style={{
            marginTop: "20px",
            padding: "15px",
            borderRadius: "var(--border-radius)",
            background: "var(--bg-surface-secondary)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div class="input-group">
            <label for="partnerGross">
              Partner's Gross ({isMonthly ? "Monthly" : "Yearly"}): €
              {partnerGrossIncome.value.toLocaleString("de-DE")}
            </label>
            <input
              id="partnerGross"
              type="range"
              min="0"
              max={isMonthly ? "15000" : "200000"}
              step={isMonthly ? "100" : "1000"}
              value={partnerGrossIncome.value}
              onInput={(e) => {
                partnerGrossIncome.value = Number(
                  (e.target as HTMLInputElement).value,
                );
              }}
            />
            <input
              type="number"
              value={partnerGrossIncome.value}
              onInput={(e) => {
                partnerGrossIncome.value = Number(
                  (e.target as HTMLInputElement).value,
                );
              }}
              style={{ marginTop: "10px" }}
            />
          </div>

          <div class="input-group">
            <label for="partnerSalariesPerYear">
              Partner's Salaries / Year
            </label>
            <select
              id="partnerSalariesPerYear"
              value={partnerSalariesPerYear.value}
              onChange={(e) => {
                partnerSalariesPerYear.value = Number(
                  (e.target as HTMLSelectElement).value,
                );
              }}
            >
              {[12, 12.5, 13, 13.5, 14].map((num) => (
                <option key={num} value={num}>
                  {num} Salaries
                </option>
              ))}
            </select>
          </div>

          <div class="input-group">
            <label for="partnerWorkingMonths">Partner's Working Months</label>
            <select
              id="partnerWorkingMonths"
              value={partnerWorkingMonths.value}
              onChange={(e) => {
                partnerWorkingMonths.value = Number(
                  (e.target as HTMLSelectElement).value,
                );
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => (
                <option key={num} value={num}>
                  {num} {num === 1 ? "Month" : "Months"}
                </option>
              ))}
            </select>
          </div>

          <div class="input-group">
            <label for="partnerBracket">
              Partner's Tax Class (*Steuerklasse* § 38b EStG)
            </label>
            <select
              id="partnerBracket"
              value={partnerTaxBracket.value}
              onChange={(e) => {
                partnerTaxBracket.value = (e.target as HTMLSelectElement).value;
              }}
            >
              <option value="3">
                Class III (Primary Earner / *Steuerklasse III*)
              </option>
              <option value="4">
                Class IV (Equal Earners / *Steuerklasse IV*)
              </option>
              <option value="5">
                Class V (Secondary Earner / *Steuerklasse V*)
              </option>
            </select>
          </div>

          <div class="input-group">
            <label for="partnerState">
              Partner's Federal State (*Bundesland*)
            </label>
            <select
              id="partnerState"
              value={partnerState.value}
              onChange={(e) => {
                partnerState.value = (e.target as HTMLSelectElement).value;
              }}
            >
              {GERMAN_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div
            class="input-group"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <label for="partnerChurch" style={{ marginBottom: 0 }}>
              Partner liable for Church Tax (*Kirchensteuer*)?
            </label>
            <label class="switch">
              <input
                id="partnerChurch"
                type="checkbox"
                checked={partnerHasChurchTax.value}
                onChange={(e) => {
                  partnerHasChurchTax.value = (
                    e.target as HTMLInputElement
                  ).checked;
                }}
              />
              <span class="slider"></span>
            </label>
          </div>
        </div>
      )}

      <hr
        style={{
          border: 0,
          borderTop: "1px solid var(--border-subtle)",
          margin: "30px 0",
        }}
      />

      <details
        style={{
          cursor: "pointer",
          background: "var(--bg-surface-secondary)",
          borderRadius: "var(--border-radius)",
          padding: "10px",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <summary
          style={{
            fontWeight: 600,
            color: "var(--text-primary)",
            outline: "none",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "5px",
          }}
        >
          <div style={{ display: "flex",
            alignItems: "center",
            gap: "8px" }}>
            <ConfigureSandboxIcon size={16} /> Advanced Tax Settings &amp;
            Social Thresholds (2024–2026)
          </div>
          <span style={{ fontSize: "0.8rem",
            color: "var(--text-muted)" }}>
            Expand
          </span>
        </summary>
        <TaxSettings />
      </details>
    </div>
  );
}
