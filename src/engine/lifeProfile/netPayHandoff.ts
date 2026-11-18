import {
  type CalculatorInputs,
} from "#store/calculatorStore";
import {
  type JobAtDate,
  ProjectedFactStatus,
} from "#engine/lifeProfile/employmentProjection";
import {
  type LifeDate,
} from "#engine/lifeProfile/person";
import {
  SalaryPeriod,
} from "#engine/types";
import {
  CalculatorGrossField,
  withGrossInputForPeriod,
} from "#engine/tax/calculatorGrossPeriod";

/** Creates a hypothetical constant-rate comparison, never an actual annual earnings claim. */
export function prepareNetPayHandoff(base: CalculatorInputs, job: JobAtDate, date: LifeDate): CalculatorInputs {
  if (job.existence !== ProjectedFactStatus.Known || job.gross.status !== ProjectedFactStatus.Known || !job.gross.value) {
    throw new TypeError("A known job and gross rate are required.");
  }
  if (Number(date.slice(0, 4)) !== base.taxYear) {
    throw new TypeError("Choose a date in the calculator's tax year.");
  }
  if (job.gross.value.period !== SalaryPeriod.Monthly) {
    throw new TypeError("Yearly rates cannot be applied as actual annual earnings automatically.");
  }
  return withGrossInputForPeriod(base, CalculatorGrossField.Primary, job.gross.value.amount, SalaryPeriod.Monthly);
}
