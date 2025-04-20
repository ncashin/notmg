import { ServerWebSocket } from "bun";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  updateCollisionSystem,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import { Component, Entity, provideECSInstanceFunctions } from "../core/ecs";
import { mergeDeep } from "../core/objectMerge";

type WebSocketData = {
  entity: number;
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

let catchupPacket: any = {};
let updatePacket: any = {};
const sendUpdatePacket = () => {
  connectedSockets.forEach((socket) => {
    socket.send(
      JSON.stringify({
        type: "update",
        packet: updatePacket,
      })
    );
  });
  mergeDeep(catchupPacket, updatePacket);
  updatePacket = {};
};

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
    if (updatePacket[entity] === undefined) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = component;
  },
  removeComponentCallback: (entity, component) => {
    if (updatePacket[entity] === undefined) {
      updatePacket[entity] = {};
    }
    updatePacket[entity][component.type] = null;
  },


  destroyEntityCallback: (entity) => {
    updatePacket[entity] = null;
  },

  componentProxyHandler: {
    set: (
      entity: Entity,
      component: any & Component,
      property: string | symbol,
      newValue: any
    ) => {
      if (updatePacket[entity] === undefined) {
        updatePacket[entity] = {};
      }
      if (updatePacket[entity][component.type] === undefined) {
        updatePacket[entity][component.type] = {};
      }
      updatePacket[entity][component.type][property] = newValue;
      component[property] = newValue;
      return true;
    },
  },
});
const server = Bun.serve<WebSocketData, {}>({
  port: 3000,
  fetch(req, server) {
    if (
      server.upgrade(req, {
        data: {
          entity: createEntity(),
        },
      })
    ) {
      return;
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(websocket) {
      websocket.send(
        JSON.stringify({
          type: "initialization",
          playerEntity: websocket.data.entity,
          catchupPacket: catchupPacket,
        })
      );
      connectedSockets.push(websocket);
      addComponent(websocket.data.entity, POSITION_COMPONENT_DEF);
      addComponent(websocket.data.entity, VELOCITY_COMPONENT_DEF);
      addComponent(websocket.data.entity, AABB_COLLIDER_COMPONENT_DEF);
    },
    message(websocket, message) {
      if (typeof message !== "string") return;
      const [x, y] = message.split(" ").map(Number.parseFloat);
      let position = getComponent(
        websocket.data.entity,
        POSITION_COMPONENT_DEF
      );
      position.x = x;
      position.y = y;
    },
    close(websocket) {
      destroyEntity(websocket.data.entity);
    },
  },
});

setInterval(() => {
  sendUpdatePacket();
}, 16);

console.log(`WebSocket server listening on port ${server.port}`);
