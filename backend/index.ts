import { ServerWebSocket } from "bun";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import { Component, Entity, provideECSInstanceFunctions } from "../core/ecs";
import { mergeDeep } from "../core/objectMerge";

console.log("Hello via Bun!");

export const {
  ecsInstance,

  createEntity,
  destroyEntity,

  addComponent: addComponentRaw,
  removeComponent,

  getComponent: getComponentRaw,
  queryComponents,

  runQuery,
} = provideECSInstanceFunctions();

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
export const getComponent = <T extends Component>(
  entity: Entity,
  component: T
) => {
  return new Proxy(getComponentRaw(entity, component), {
    set: (
      target: any,
      property: string | symbol,
      newValue: any,
      _receiver: any
    ) => {
      if (updatePacket[entity] === undefined) updatePacket[entity] = {};
      if (updatePacket[entity][component.type] === undefined)
        updatePacket[entity][component.type] = {};
      updatePacket[entity][component.type][property] = newValue;
      target[property] = newValue;
      return true;
    },
  });
};
export const addComponent = (entity: Entity, component: Component) => {
  if (updatePacket[entity] === undefined) updatePacket[entity] = {};
  if (updatePacket[entity][component.type])
    updatePacket[entity][component.type] = {};
  updatePacket[entity][component.type] = component;
  addComponentRaw(entity, component);
};

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
    close(_websocket) {},
  },
});

setInterval(() => {
  sendUpdatePacket();
}, 1000);

console.log(`WebSocket server listening on port ${server.port}`);
