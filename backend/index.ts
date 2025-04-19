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
  entityID: number;
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];
const sendUpdatedComponent = (entity: Entity, component: Component) => {
  connectedSockets.forEach((socket) => {
    socket.send(entity.toString() + "*" + JSON.stringify(component));
  });
};
export const addNetworkedComponent = (entity: Entity, component: Component) => {
  addComponent(entity, component);
  sendUpdatedComponent(entity, component);
};

const server = Bun.serve<WebSocketData, {}>({
  port: 3000,
  fetch(req, server) {
    if (
      server.upgrade(req, {
        data: {
          entityID: createEntity(),
        },
      })
    ) {
      return;
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(websocket) {
      console.log("Client connected");

      connectedSockets.push(websocket);
      addNetworkedComponent(websocket.data.entityID, POSITION_COMPONENT_DEF);
      addNetworkedComponent(websocket.data.entityID, VELOCITY_COMPONENT_DEF);
      addNetworkedComponent(
        websocket.data.entityID,
        AABB_COLLIDER_COMPONENT_DEF
      );
    },
    message(websocket, message) {
      if (typeof message !== "string") return;
      const [x, y] = message.split(" ").map(Number.parseFloat);
      let position = getComponent(
        websocket.data.entityID,
        POSITION_COMPONENT_DEF
      );
      position.x = x;
      position.y = y;
      sendUpdatedComponent(websocket.data.entityID, position);
    },
    close(_websocket) {},
  },
});

console.log(`WebSocket server listening on port ${server.port}`);
