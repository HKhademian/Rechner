import {
  createLifeEventRegistry,
  noteEventModule,
} from "#engine/lifeProfile/eventModules";
import {
  jobChangedModule,
  jobStartedModule,
} from "#engine/lifeProfile/employmentEvent";

/** The composition root registers event modules available to this app version. */
export const lifeEventCatalog = createLifeEventRegistry([noteEventModule, jobStartedModule, jobChangedModule]);
