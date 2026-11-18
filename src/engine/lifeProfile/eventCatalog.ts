import {
  createLifeEventRegistry,
  noteEventModule,
} from "#engine/lifeProfile/eventModules";

/** The composition root registers event modules available to this app version. */
export const lifeEventCatalog = createLifeEventRegistry([noteEventModule]);
