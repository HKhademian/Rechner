import {
  type JSX,
} from "preact";
import {
  batch,
} from "@preact/signals";
import {
  SyncProfileActionIcon,
} from "#components/Icons";
import {
  GermanFederalState,
} from "#engine/formulas/pure/housingFormulas";
import {
  assessmentMode,
  calculatorInvalidInputs,
  calculatorViewPeriod,
  children,
  grossIncome,
  hasPartner,
  inputMode,
  partnerGrossIncome,
  partnerInputMode,
  partnerState,
  partnerTaxBracket,
  state,
  taxBracket,
} from "#store/calculatorStore";
import {
  unifiedLifeProfile,
} from "#store/lifeProfileStore";
import {
  selectedTaxYear,
} from "#store/taxConfigStore";
import {
  SalaryPeriod,
} from "#engine/types";
import {
  TaxAssessment,
} from "#engine/tax/taxAssessment";
import {
  useEffect,
  useState,
} from "preact/hooks";
import "./CalculatorPeriodControl.css";

const STATE_NAME_BY_CODE: Readonly<Record<GermanFederalState, string>> = Object.freeze({
  [GermanFederalState.BadenWuerttemberg]: "Baden-Württemberg",
  [GermanFederalState.Bayern]: "Bayern",
  [GermanFederalState.Berlin]: "Berlin",
  [GermanFederalState.Brandenburg]: "Brandenburg",
  [GermanFederalState.Bremen]: "Bremen",
  [GermanFederalState.Hamburg]: "Hamburg",
  [GermanFederalState.Hessen]: "Hessen",
  [GermanFederalState.MecklenburgVorpommern]: "Mecklenburg-Vorpommern",
  [GermanFederalState.Niedersachsen]: "Niedersachsen",
  [GermanFederalState.NordrheinWestfalen]: "Nordrhein-Westfalen",
  [GermanFederalState.RheinlandPfalz]: "Rheinland-Pfalz",
  [GermanFederalState.Saarland]: "Saarland",
  [GermanFederalState.Sachsen]: "Sachsen",
  [GermanFederalState.SachsenAnhalt]: "Sachsen-Anhalt",
  [GermanFederalState.SchleswigHolstein]: "Schleswig-Holstein",
  [GermanFederalState.Thueringen]: "Thüringen",
});

function syncNetPayFromLifeProfile(): void {
  const lp = unifiedLifeProfile.value;
  const federalStateName = STATE_NAME_BY_CODE[lp.federalState];
  batch(() => {
    selectedTaxYear.value = lp.planningYear;
    inputMode.value = "yearly";
    grossIncome.value = lp.primaryAnnualGrossEur;
    state.value = federalStateName;
    children.value = lp.dependentChildrenCount;
    hasPartner.value = lp.hasPartner;
    if (lp.hasPartner) {
      partnerInputMode.value = "yearly";
      partnerGrossIncome.value = lp.partnerAnnualGrossEur;
      partnerState.value = federalStateName;
      taxBracket.value = "4";
      partnerTaxBracket.value = "4";
      assessmentMode.value = TaxAssessment.Joint;
    }
    else {
      taxBracket.value = "1";
      assessmentMode.value = TaxAssessment.Individual;
    }
  });
}

/** One presentation setting plus optional Unified Life Profile sync for Net Pay columns. */
export default function CalculatorPeriodControl(): JSX.Element {
  // Match server markup before applying the locally saved presentation preference.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const currentPeriod = hydrated ? calculatorViewPeriod.value : SalaryPeriod.Yearly;
  const invalid = hydrated && Object.values(calculatorInvalidInputs.value).some(Boolean);
  return <div className="calculator-period">
    <div className="calculator-period__actions">
      <button
        type="button"
        className="calculator-period__sync"
        disabled={!hydrated}
        onClick={syncNetPayFromLifeProfile}
        title="Populate primary gross, partner gross, children, planning year, and Bundesland from the Unified Life Profile"
      >
        <SyncProfileActionIcon size={14} />
        <span>Sync Life Profile</span>
      </button>
      <div role="group" aria-label="Calculator amount period" aria-describedby="calculator-period-hint" title="Monthly results: annual / 12. Gross input: regular salary. Taxable income: annual.">
        {Object.values(SalaryPeriod).map((period) => <button key={period} type="button"
          aria-pressed={currentPeriod === period} disabled={!hydrated || invalid}
          onClick={() => {
            calculatorViewPeriod.value = period;
          }}>
          {period === SalaryPeriod.Monthly ? "Monthly" : "Yearly"}
        </button>)}
      </div>
    </div>
    <p id="calculator-period-hint" className={invalid ? "calculator-period__error" : "calculator-period__description"} role={invalid ? "status" : undefined}>{invalid ? "Check highlighted inputs." : "All columns. Monthly results: annual / 12. Monthly gross: regular salary. Taxable income: annual."}</p>
  </div>;
}
