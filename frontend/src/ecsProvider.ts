import { provideECSInstanceFunctions } from "core";

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions();
