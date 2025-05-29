import { sendUpdatePacket } from ".";
import { POSITION_COMPONENT_DEF, collisionTree } from "../core/collision";
import { type Component, provideECSInstanceFunctions } from "../core/ecs";
import type { Packet } from "../core/network";
import { mergeDeep } from "../core/objectMerge";

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent,
  removeComponent,

  getComponent,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions({
  addComponentCallback: (entity, component) => {
    if (component.type === POSITION_COMPONENT_DEF.type) {
      collisionTree.add(component as typeof POSITION_COMPONENT_DEF);
    }
    if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = component;
  },
  removeComponentCallback: (entity, component) => {
    if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = null;
  },

  destroyEntityCallback: (entity) => {
    updatePacket[entity] = null;
  },

  componentProxyHandler: {
    set: (entity, component, property, newValue) => {
      if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
        updatePacket[entity] = {};
      }
      if (
        updatePacket[entity][component.type] === undefined ||
        updatePacket[entity][component.type] === null
      ) {
        updatePacket[entity][component.type] = {} as Component;
      }

      (updatePacket[entity][component.type] as Component)[property] = newValue;
      component[property] = newValue;
      return true;
    },
  },
});

const catchupPacket: Packet = {};
let updatePacket: Packet = {};

export const getECSUpdatePacket = () => {
  try {
    return updatePacket;
  } finally {
    mergeDeep(catchupPacket, updatePacket);
    updatePacket = {};
  }
};
export const getECSCatchupPacket = () => {
  return catchupPacket;
};

const updateCallbacks: (() => void)[] = [];
export const addUpdateCallback = (lambda: () => void) => {
  updateCallbacks.push(lambda);
};
const update = () => {
  for (const callback of updateCallbacks) {
    callback();
  }

  sendUpdatePacket();
};

setInterval(update, 1000 / 60);
