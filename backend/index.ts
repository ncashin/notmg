import { ServerWebSocket } from "bun";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import { Component, Entity, provideECSInstanceFunctions } from "../core/ecs";

console.log("Hello via Bun!");

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

type WebSocketData = {
  entity: number;
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}
export function mergeDeep(target, ...sources) {
  if (!sources.length) return target;
  const source = sources.shift();

  if (isObject(target) && isObject(source)) {
    for (const key in source) {
      if (isObject(source[key])) {
        if (!target[key]) Object.assign(target, { [key]: {} });
        mergeDeep(target[key], source[key]);
      } else {
        Object.assign(target, { [key]: source[key] });
      }
    }
  }

  return mergeDeep(target, ...sources);
}

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
export const getNetworkedComponent = <T extends Component>(
  entity: Entity,
  component: T
) => {
  return new Proxy(getComponent(entity, component), {
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
export const addNetworkedComponent = (entity: Entity, component: Component) => {
  if (updatePacket[entity] === undefined) updatePacket[entity] = {};
  if (updatePacket[entity][component.type])
    updatePacket[entity][component.type] = {};
  updatePacket[entity][component.type] = component;
  addComponent(entity, component);
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
      addNetworkedComponent(websocket.data.entity, POSITION_COMPONENT_DEF);
      addNetworkedComponent(websocket.data.entity, VELOCITY_COMPONENT_DEF);
      addNetworkedComponent(websocket.data.entity, AABB_COLLIDER_COMPONENT_DEF);
    },
    message(websocket, message) {
      if (typeof message !== "string") return;
      const [x, y] = message.split(" ").map(Number.parseFloat);
      let position = getNetworkedComponent(
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
