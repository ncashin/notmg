import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
} from "../../core/collision";
import { type Component, provideECSInstanceFunctions } from "../../core/ecs";
import type { Packet } from "../../core/network";
import { mergeDeep } from "../../core/objectMerge";
import { collisionTree } from "./collision";
import { sendUpdatePacket } from "./websocket";

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
      const circleCollider = getComponent(
        entity,
        CIRCLE_COLLIDER_COMPONENT_DEF,
      );
      if (circleCollider) {
        collisionTree.add([
          entity,
          component as typeof POSITION_COMPONENT_DEF,
          circleCollider,
        ]);
      }
    }
    if (component.type === CIRCLE_COLLIDER_COMPONENT_DEF.type) {
      const positionComponent = getComponent(entity, POSITION_COMPONENT_DEF);
      if (positionComponent) {
        collisionTree.add([
          entity,
          positionComponent,
          component as typeof CIRCLE_COLLIDER_COMPONENT_DEF,
        ]);
      }
    }

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
