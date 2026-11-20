import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";
import {
  actualBirthModule,
  expectedBirthModule,
  pregnancyStartedModule,
} from "#engine/lifeProfile/familyEvent";
import {
  childcarePlanModule,
} from "#engine/lifeProfile/childcareEvent";
import {
  travelTripModule,
} from "#engine/lifeProfile/travelEvent";
import {
  formatIntegerEuroCents,
} from "#utils/currencyFormat";

export interface DomainEventSummary {
  readonly label: string;
  readonly detail: string;
}

/** Formats extended domain timeline events into a concise label and detail line. */
export function describeExtendedLifeEvent(event: LifeEvent<unknown>): DomainEventSummary | undefined {
  if (event.kind === residencePermitModule.kind) {
    const permit = residencePermitModule.parsePayload(event.payload);
    const parts = [
      `Permit: ${permit.permitKind}`,
      ...(permit.countryCode ? [permit.countryCode] : []),
      ...(permit.issueDate ? [`Issued ${permit.issueDate}`] : []),
      ...(permit.expiryDate ? [`Expires ${permit.expiryDate}`] : []),
    ];
    return {
      label: permit.label ?? `Residence permit (${permit.permitKind})`,
      detail: parts.join(" · "),
    };
  }
  if (event.kind === residenceInterruptionModule.kind) {
    const absence = residenceInterruptionModule.parsePayload(event.payload);
    return {
      label: `Residence absence (${absence.days} days)`,
      detail: `${absence.reason}${absence.returnDate ? ` · Returned ${absence.returnDate}` : ""}`,
    };
  }
  if (event.kind === residenceMilestoneModule.kind) {
    const milestone = residenceMilestoneModule.parsePayload(event.payload);
    return {
      label: milestone.title,
      detail: `Milestone: ${milestone.target} · ${milestone.stage}`,
    };
  }
  if (event.kind === pregnancyStartedModule.kind) {
    const preg = pregnancyStartedModule.parsePayload(event.payload);
    return {
      label: preg.label ?? "Pregnancy milestone",
      detail: [
        ...(preg.expectedDueDate ? [`Due ${preg.expectedDueDate}`] : []),
        ...(preg.multipleCount && preg.multipleCount > 1 ? [`Multiples (${preg.multipleCount})`] : []),
      ].join(" · ") || "Pregnancy recorded",
    };
  }
  if (event.kind === expectedBirthModule.kind) {
    const expected = expectedBirthModule.parsePayload(event.payload);
    return {
      label: "Expected birth milestone",
      detail: expected.multipleCount && expected.multipleCount > 1
        ? `Linked pregnancy · ${expected.multipleCount} children`
        : "Linked to pregnancy",
    };
  }
  if (event.kind === actualBirthModule.kind) {
    const birth = actualBirthModule.parsePayload(event.payload);
    return {
      label: birth.childName ? `Birth of ${birth.childName}` : "Actual birth milestone",
      detail: birth.multipleCount && birth.multipleCount > 1
        ? `Linked pregnancy · ${birth.multipleCount} children`
        : "Linked to pregnancy",
    };
  }
  if (event.kind === childcarePlanModule.kind) {
    const plan = childcarePlanModule.parsePayload(event.payload);
    const monthly = (plan.monthlyFeeCents ?? 0) + (plan.monthlyMealCents ?? 0);
    return {
      label: `${plan.providerName} (${plan.facilityKind})`,
      detail: [
        `Status: ${plan.applicationStatus}`,
        ...(plan.municipality ? [plan.municipality] : []),
        ...(plan.applicationDeadline ? [`Apply by ${plan.applicationDeadline}`] : []),
        ...(monthly > 0 ? [`${formatIntegerEuroCents(monthly)}/mo`] : []),
      ].join(" · "),
    };
  }
  if (event.kind === travelTripModule.kind) {
    const trip = travelTripModule.parsePayload(event.payload);
    return {
      label: `Trip to ${trip.destination}`,
      detail: [
        `Region: ${trip.region}`,
        ...(trip.endDate ? [`Until ${trip.endDate}`] : []),
        ...(trip.budgetCents !== undefined ? [`Budget ${formatIntegerEuroCents(trip.budgetCents)}`] : []),
      ].join(" · "),
    };
  }
  return undefined;
}
