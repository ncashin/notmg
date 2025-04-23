import { ServerWebSocket } from "bun";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  updateCollisionSystem,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import { Component, Entity, provideECSInstanceFunctions } from "../core/ecs";
import { mergeDeep } from "../core/objectMerge";
import { PROJECTILE_COMPONENT_DEF, SPRITE_COMPONENT_DEF } from "../core/game";

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

export const createPlayerEntity = (entity: Entity) => {
  addComponent(entity, POSITION_COMPONENT_DEF);
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
  addComponent(entity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/female.svg",
    size: 80,
  });
};

export const createProjectile = (entity: Entity, x: number, y: number, velocityX: number, velocityY: number) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x, y });
  addComponent(entity, {...PROJECTILE_COMPONENT_DEF, velocityX, velocityY});
  // addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
  addComponent(entity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/vite.svg",
    size: 80,
  });
};

export const createBossEntity = (entity: Entity) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x: 1000, y: 500 });
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, AABB_COLLIDER_COMPONENT_DEF);
  addComponent(entity, { ...SPRITE_COMPONENT_DEF, imageSrc: "/boss.png" });
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
      createPlayerEntity(websocket.data.entity);
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

let count = 0;
setInterval(() => {
  if (count <= 0) {
    createProjectile(100, 500, 500, 5, 0);
    createBossEntity(createEntity());
    count = 10000;
  }
  count--;

  runQuery(
    [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
    (_entity, [position, projectile]) => {
      position.x += projectile.velocityX;
      position.y += projectile.velocityY;
    }
  );
  sendUpdatePacket();
}, 16);

console.log(`WebSocket server listening on port ${server.port}`);
