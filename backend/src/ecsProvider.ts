import {
  type Component,
  type Packet,
  mergeDeep,
  provideECSInstanceFunctions,
} from "core";

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

    if (!component.networked) {
      return;
    }
    if (updatePacket[entity] === undefined || updatePacket[entity] === null) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = component;
  },
  removeComponentCallback: (entity, component) => {
    if (!component.networked) {
      return;
    }
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
      if (!component.networked) {
        component[property] = newValue;
        return true;
      }

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
