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
  cashEventModule,
]);
