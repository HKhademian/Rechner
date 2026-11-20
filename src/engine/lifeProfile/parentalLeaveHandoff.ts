import {
  type LifeDate,
  type LifePerson,
  PersonRelationship,
  toLifeDate,
} from "#engine/lifeProfile/person";
import {
  type LifeEvent,
  LifeEventStatus,
} from "#engine/lifeProfile/timeline";
import {
  ProjectedFactStatus,
  projectEmploymentAtDate,
} from "#engine/lifeProfile/employmentProjection";
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
} from "#engine/lifeProfile/familyEvent";
import {
  SalaryPeriod,
  toGrossSalary,
} from "#engine/types";
import {
  type UnifiedLifeProfile,
} from "#engine/lifeProfile/types";

export interface ParentalLeaveHandoffField {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly source: string;
  readonly isFact: boolean;
}

export interface ParentalLeaveHandoffPreview {
  readonly targetPath: "/elterngeld/";
  readonly birthDate?: LifeDate;
  readonly birthDateIsActual: boolean;
  readonly multipleCount: number;
  readonly dependentChildrenCount: number;
  readonly primaryAnnualGrossEur?: number;
  readonly partnerAnnualGrossEur?: number;
  readonly fields: readonly ParentalLeaveHandoffField[];
  readonly warnings: readonly string[];
  readonly proposedProfilePatch: Partial<UnifiedLifeProfile>;
}

function annualizeGross(amount: number, period: SalaryPeriod): number {
  return period === SalaryPeriod.Monthly ? Math.round(amount * 12) : Math.round(amount);
}

/**
 * Builds a non-destructive, reviewable preview of household, birth and gross-pay facts
 * ready for opt-in transfer into the existing Parental Leave Planner profile.
 */
export function buildParentalLeaveHandoffPreview(input: {
  readonly people: readonly LifePerson[];
  readonly events: readonly LifeEvent<unknown>[];
  readonly asOf: LifeDate;
  readonly includePlanned: boolean;
}): ParentalLeaveHandoffPreview {
  const fields: ParentalLeaveHandoffField[] = [];
  const warnings: string[] = [];

  const relevantEvents = input.events.filter((event) => input.includePlanned || event.status === LifeEventStatus.Actual);

  // Locate latest actual birth, else expected birth, else pregnancy expected due date
  const actualBirths = relevantEvents.filter((event) => event.kind === actualBirthModule.kind);
  const expectedBirths = relevantEvents.filter((event) => event.kind === expectedBirthModule.kind);
  const pregnancies = relevantEvents.filter((event) => event.kind === pregnancyStartedModule.kind);

  let birthDate: LifeDate | undefined;
  let birthDateIsActual = false;
  let multipleCount = 1;

  const latestActual = actualBirths[actualBirths.length - 1];
  const latestExpected = expectedBirths[expectedBirths.length - 1];
  const latestPregnancy = pregnancies[pregnancies.length - 1];

  if (latestActual) {
    const parsed = actualBirthModule.parsePayload(latestActual.payload);
    multipleCount = parsed.multipleCount ?? 1;
    if (latestActual.date?.length === 10) {
      birthDate = toLifeDate(latestActual.date);
      birthDateIsActual = true;
      fields.push({
        id: "birth-date",
        label: "Actual birth date",
        value: birthDate,
        source: `Timeline family.actual-birth${parsed.childName ? ` (${parsed.childName})` : ""}`,
        isFact: true,
      });
    }
  }
  else if (latestExpected) {
    const parsed = expectedBirthModule.parsePayload(latestExpected.payload);
    multipleCount = parsed.multipleCount ?? 1;
    if (latestExpected.date?.length === 10) {
      birthDate = toLifeDate(latestExpected.date);
      fields.push({
        id: "expected-birth-date",
        label: "Expected birth date",
        value: birthDate,
        source: "Timeline family.expected-birth (planned)",
        isFact: false,
      });
    }
  }
  else if (latestPregnancy) {
    const parsed = pregnancyStartedModule.parsePayload(latestPregnancy.payload);
    multipleCount = parsed.multipleCount ?? 1;
    if (parsed.expectedDueDate) {
      birthDate = parsed.expectedDueDate;
      fields.push({
        id: "due-date",
        label: "Expected due date",
        value: birthDate,
        source: "Timeline family.pregnancy",
        isFact: false,
      });
    }
  }
  else {
    warnings.push("No pregnancy or birth milestone recorded yet; Parental Leave Planner will keep its existing birth date.");
  }

  if (multipleCount > 1) {
    fields.push({
      id: "multiples",
      label: "Multiples (Mehrlinge)",
      value: `${multipleCount} children`,
      source: "Timeline birth/pregnancy milestone",
      isFact: birthDateIsActual,
    });
  }

  const childrenInPeople = input.people.filter((person) => person.relationship === PersonRelationship.Child).length;
  const dependentChildrenCount = Math.max(childrenInPeople, birthDate ? multipleCount : 0);
  if (dependentChildrenCount > 0) {
    fields.push({
      id: "children-count",
      label: "Dependent children count",
      value: `${dependentChildrenCount}`,
      source: childrenInPeople > 0 ? "Household people relationships" : "Recorded birth/pregnancy milestone",
      isFact: childrenInPeople > 0 || birthDateIsActual,
    });
  }

  const selfPerson = input.people.find((person) => person.relationship === PersonRelationship.Self) ?? input.people[0];
  const partnerPerson = input.people.find((person) => person.relationship === PersonRelationship.Partner);

  let primaryAnnualGrossEur: number | undefined;
  let partnerAnnualGrossEur: number | undefined;

  if (selfPerson) {
    const selfJobs = projectEmploymentAtDate(input.events, selfPerson.id, input.asOf, input.includePlanned);
    const knownGross = selfJobs.find((job) => job.existence === ProjectedFactStatus.Known && job.gross.status === ProjectedFactStatus.Known && job.gross.value);
    if (knownGross?.gross.value) {
      primaryAnnualGrossEur = annualizeGross(knownGross.gross.value.amount, knownGross.gross.value.period);
      fields.push({
        id: "primary-gross",
        label: `Primary annual gross (${selfPerson.name})`,
        value: `${primaryAnnualGrossEur.toLocaleString("de-DE")} € / year`,
        source: `Active job at ${knownGross.employer} (${knownGross.gross.value.period === SalaryPeriod.Monthly ? "annualized ×12" : "annual"})`,
        isFact: true,
      });
    }
  }

  if (partnerPerson) {
    const partnerJobs = projectEmploymentAtDate(input.events, partnerPerson.id, input.asOf, input.includePlanned);
    const knownGross = partnerJobs.find((job) => job.existence === ProjectedFactStatus.Known && job.gross.status === ProjectedFactStatus.Known && job.gross.value);
    if (knownGross?.gross.value) {
      partnerAnnualGrossEur = annualizeGross(knownGross.gross.value.amount, knownGross.gross.value.period);
      fields.push({
        id: "partner-gross",
        label: `Partner annual gross (${partnerPerson.name})`,
        value: `${partnerAnnualGrossEur.toLocaleString("de-DE")} € / year`,
        source: `Active job at ${knownGross.employer}`,
        isFact: true,
      });
    }
  }

  warnings.push("Transfer updates only selected shared Unified Life Profile fields; existing saved Parental Leave Planner scenarios and monthly leave selections remain untouched.");

  const proposedProfilePatch: Partial<UnifiedLifeProfile> = {
    ...(dependentChildrenCount > 0 ? { dependentChildrenCount } : {}),
    ...(partnerPerson ? { hasPartner: true } : {}),
    ...(primaryAnnualGrossEur !== undefined ? { primaryAnnualGrossEur: toGrossSalary(primaryAnnualGrossEur) } : {}),
    ...(partnerAnnualGrossEur !== undefined ? { partnerAnnualGrossEur: toGrossSalary(partnerAnnualGrossEur) } : {}),
  };

  return Object.freeze({
    targetPath: "/elterngeld/",
    ...(birthDate ? { birthDate } : {}),
    birthDateIsActual,
    multipleCount,
    dependentChildrenCount,
    ...(primaryAnnualGrossEur !== undefined ? { primaryAnnualGrossEur } : {}),
    ...(partnerAnnualGrossEur !== undefined ? { partnerAnnualGrossEur } : {}),
    fields: Object.freeze(fields),
    warnings: Object.freeze(warnings),
    proposedProfilePatch: Object.freeze(proposedProfilePatch),
  });
}
