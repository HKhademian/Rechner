import {
  type LifeEvent,
} from "#engine/lifeProfile/timeline";
import {
  residenceInterruptionModule,
  residenceMilestoneModule,
  residencePermitModule,
} from "#engine/lifeProfile/residencePermitEvent";

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
  return undefined;
}
