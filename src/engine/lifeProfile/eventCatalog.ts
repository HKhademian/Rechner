import {
  createLifeEventRegistry,
  noteEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  jobChangedModule,
  jobEndedModule,
  jobLeaveModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";
import {
  residenceMoveModule,
} from "#engine/lifeProfile/residenceEvent";
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
  cashEventModule,
} from "#engine/lifeProfile/cashEvent";

/** The composition root registers event modules available to this app version. */
export const lifeEventCatalog = createLifeEventRegistry([
  noteEventModule,
  jobStartedModule,
  jobChangedModule,
  jobEndedModule,
  jobLeaveModule,
  residenceMoveModule,
  residencePermitModule,
  residenceInterruptionModule,
  residenceMilestoneModule,
  pregnancyStartedModule,
  expectedBirthModule,
  actualBirthModule,
  childcarePlanModule,
  travelTripModule,
  cashEventModule,
]);
