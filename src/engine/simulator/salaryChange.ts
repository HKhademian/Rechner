import {
  type SalaryRaiseAction,
  TargetPerson,
  toGrossSalary,
} from "#engine/types";

/** A replacement is an explicit contract amount, never an extra percentage or net payment. */
export function validateSalaryReplacement(action: SalaryRaiseAction): void {
  if (action.newHusbandGross === undefined && action.newWifeGross === undefined) {
    return;
  }
  if (action.percentageIncrease !== undefined || action.newHusbandClass3Net !== undefined ||
    action.newHusbandClass5Net !== undefined || action.newWifeClass3FTNet !== undefined ||
    action.newWifeClass5FTNet !== undefined || action.newWifeClass3PTNet !== undefined ||
    action.newWifeClass5PTNet !== undefined) {
    throw new TypeError("Choose a new gross salary or a percentage/net replacement, not both.");
  }
  const husband = action.targetPerson !== TargetPerson.Wife;
  const wife = action.targetPerson !== TargetPerson.Husband;
  if (husband !== (action.newHusbandGross !== undefined) || wife !== (action.newWifeGross !== undefined)) {
    throw new TypeError("Enter a new gross salary for every selected person and only those people.");
  }
  if (action.newHusbandGross !== undefined) {
    toGrossSalary(action.newHusbandGross);
  }
  if (action.newWifeGross !== undefined) {
    toGrossSalary(action.newWifeGross);
  }
}
