import type { ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../core/collision";
import type { Entity } from "../core/ecs";
import { SPRITE_COMPONENT_DEF } from "../core/game";
import type { ClientMessage } from "../core/socketMessage";
import {
  addComponent,
  createEntity,
  destroyEntity,
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
} from "./ecsProvider";
import { createBossEntity } from "./entities/boss";
import { createProjectile } from "./entities/projectile";

type WebSocketData = {
  entity: number;
};
const connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

export const sendUpdatePacket = () => {
  for (const socket of connectedSockets) {
    socket.send(
      JSON.stringify({
        type: "update",
        packet: getECSUpdatePacket(),
      }),
    );
  }
};
const clientMessageHandlers = {
  move: (websocket: ServerWebSocket<WebSocketData>, message: ClientMessage) => {
    invariant(message.type === "move");
    const position = getComponent(
      websocket.data.entity,
      POSITION_COMPONENT_DEF,
    );
    if (!position) return;
    position.x = message.x;
    position.y = message.y;
  },
  shoot: (
    websocket: ServerWebSocket<WebSocketData>,
    message: ClientMessage,
  ) => {
    invariant(message.type === "shoot");
    playerShoot(websocket.data.entity, message.targetX, message.targetY);
  },
};

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

// Add a function to handle player shooting
export const playerShoot = (
  playerEntity: Entity,
  targetX: number,
  targetY: number,
) => {
  const position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
  if (!position) return;

  // Calculate direction vector from player to target
  const dirX = targetX - position.x;
  const dirY = targetY - position.y;

  // Normalize the direction vector
  const length = Math.sqrt(dirX * dirX + dirY * dirY);
  const normalizedDirX = dirX / length;
  const normalizedDirY = dirY / length;

  // Set projectile speed
  const projectileSpeed = 10;
  const velocityX = normalizedDirX * projectileSpeed;
  const velocityY = normalizedDirY * projectileSpeed;

  // Create projectile entity
  const projectileEntity = createEntity();

  // Position the projectile slightly away from the player in the shooting direction
  const spawnDistance = 40; // Distance from player center
  const spawnX = position.x + normalizedDirX * spawnDistance;
  const spawnY = position.y + normalizedDirY * spawnDistance;

  createProjectile(
    projectileEntity,
    spawnX,
    spawnY,
    velocityX,
    velocityY,
    "player",
  );

  addComponent(projectileEntity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/projectile.svg",
    size: 20,
  });
};

Bun.serve<WebSocketData, undefined>({
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
          catchupPacket: getECSCatchupPacket(),
        }),
      );
      connectedSockets.push(websocket);
      createPlayerEntity(websocket.data.entity);
    },
    message(websocket, message) {
      if (typeof message !== "string") return;

      const parsedMessage = JSON.parse(message);
      const clientMessage = parsedMessage;
      if (clientMessage && clientMessage.type in clientMessageHandlers) {
        const handler =
          clientMessageHandlers[
            clientMessage.type as keyof typeof clientMessageHandlers
          ];
        handler(websocket, clientMessage);
        return;
      }

      console.error("Unknown or invalid message:", parsedMessage);
    },
    close(websocket) {
      destroyEntity(websocket.data.entity);
    },
  },
});

createBossEntity(createEntity());
