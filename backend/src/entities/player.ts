import type { ServerWebSocket } from "bun";
import { eq } from "drizzle-orm";
import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../../core/collision";
import type { Entity } from "../../../core/ecs";
import {
  HEALTH_COMPONENT_DEF,
  PROJECTILE_COMPONENT_DEF,
  SPRITE_COMPONENT_DEF,
} from "../../../core/game";
import {
  INVENTORY_COMPONENT_DEF,
  PLAYER_COMPONENT_DEF,
} from "../../../core/player";
import type { ClientMessage } from "../../../core/socketMessage";
import { items, type users } from "../../schema";
import { collisionTree } from "../collision";
import { database } from "../database";
import {
  addComponent,
  createEntity,
  destroyEntity,
  getComponent,
  runQuery,
} from "../ecsProvider";
import { addUpdateCallback } from "../update";
import type { WebSocketData } from "../websocket";
import { createProjectile } from "./projectile";

export const createPlayerEntity = (entity: Entity, username = "") => {
  addComponent(entity, POSITION_COMPONENT_DEF);
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, { ...CIRCLE_COLLIDER_COMPONENT_DEF, radius: 20 });
  addComponent(entity, { ...PLAYER_COMPONENT_DEF, username });
  addComponent(entity, {
    ...SPRITE_COMPONENT_DEF,
    imageSrc: "/female.svg",
    size: 80,
  });
  addComponent(entity, {
    ...HEALTH_COMPONENT_DEF,
    maxHealth: 100,
    currentHealth: 100,
  });
  addComponent(entity, INVENTORY_COMPONENT_DEF);
};

export const playerShoot = (
  playerEntity: Entity,
  targetX: number,
  targetY: number,
) => {
  const position = getComponent(playerEntity, POSITION_COMPONENT_DEF);
  if (!position) return;

  const dirX = targetX - position.x;
  const dirY = targetY - position.y;

  const length = Math.sqrt(dirX * dirX + dirY * dirY);
  const normalizedDirX = dirX / length;
  const normalizedDirY = dirY / length;

  const projectileSpeed = 10;
  const velocityX = normalizedDirX * projectileSpeed;
  const velocityY = normalizedDirY * projectileSpeed;

  const spawnDistance = 40;
  const spawnX = position.x + normalizedDirX * spawnDistance;
  const spawnY = position.y + normalizedDirY * spawnDistance;

  const projectileEntity = createEntity();
  createProjectile(
    projectileEntity,
    spawnX,
    spawnY,
    velocityX,
    velocityY,
    "player",
  );
};

addUpdateCallback(() => {
  runQuery(
    [
      POSITION_COMPONENT_DEF,
      CIRCLE_COLLIDER_COMPONENT_DEF,
      HEALTH_COMPONENT_DEF,
      PLAYER_COMPONENT_DEF,
      VELOCITY_COMPONENT_DEF,
    ],
    (
      playerEntity,
      [playerPos, playerCollider, playerHealth, player, velocity],
    ) => {
      const searchRadius = playerCollider.radius + 50;

      collisionTree.visit((node, x1, y1, x2, y2) => {
        const searchX1 = playerPos.x - searchRadius;
        const searchY1 = playerPos.y - searchRadius;
        const searchX2 = playerPos.x + searchRadius;
        const searchY2 = playerPos.y + searchRadius;

        if (x1 > searchX2 || x2 < searchX1 || y1 > searchY2 || y2 < searchY1) {
          return false;
        }

        if (
          node.length === undefined &&
          node.data.entity &&
          node.data.entity !== playerEntity
        ) {
          const entityComponents = getComponent(
            node.data.entity,
            PROJECTILE_COMPONENT_DEF,
          );
          if (entityComponents && entityComponents.source !== "player") {
            const entityPosition = getComponent(
              node.data.entity,
              POSITION_COMPONENT_DEF,
            );
            if (entityPosition) {
              const dx = playerPos.x - entityPosition.x;
              const dy = playerPos.y - entityPosition.y;
              const distanceSquared = dx * dx + dy * dy;
              const combinedRadius =
                playerCollider.radius + entityComponents.radius;

              if (distanceSquared <= combinedRadius * combinedRadius) {
                playerHealth.currentHealth = Math.max(
                  0,
                  playerHealth.currentHealth - entityComponents.damage,
                );

                destroyEntity(node.data.entity);

                if (playerHealth.currentHealth <= 0) {
                  player.isDead = true;
                  player.respawnTime = player.respawnDuration;
                  velocity.x = 0;
                  velocity.y = 0;
                }
              }
            }
          }
        }

        return true;
      });
    },
  );
});

export const handleSocketOpenPlayerSetup = async (
  websocket: ServerWebSocket<WebSocketData>,
) => {
  createPlayerEntity(websocket.data.entity);
};
export const handleAuthenticatedPlayerSetup = async (
  websocket: ServerWebSocket<WebSocketData>,
  _message: ClientMessage,
  user: typeof users.$inferSelect,
) => {
  const player = getComponent(websocket.data.entity, PLAYER_COMPONENT_DEF);
  if (player) {
    player.username = user.username;
  }
  websocket.data.userID = user.id;

  const inventory = getComponent(
    websocket.data.entity,
    INVENTORY_COMPONENT_DEF,
  );
  if (inventory) {
    inventory.items = await database
      .select()
      .from(items)
      .where(eq(items.userID, user.id));
  }
};

export const handleSocketClosePlayerCleanup = async (
  websocket: ServerWebSocket<WebSocketData>,
) => {
  destroyEntity(websocket.data.entity);
};
