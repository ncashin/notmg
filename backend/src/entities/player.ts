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

export const createPlayerEntity = (entity: Entity, name = "") => {
  addComponent(entity, POSITION_COMPONENT_DEF);
  addComponent(entity, VELOCITY_COMPONENT_DEF);
  addComponent(entity, { ...CIRCLE_COLLIDER_COMPONENT_DEF, radius: 40 }); // Circle collider with radius matching sprite size
  addComponent(entity, { ...PLAYER_COMPONENT_DEF, name });
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

  // Position the projectile slightly away from the player in the shooting direction
  const spawnDistance = 40; // Distance from player center
  const spawnX = position.x + normalizedDirX * spawnDistance;
  const spawnY = position.y + normalizedDirY * spawnDistance;

  // Create projectile entity
  const projectileEntity = createEntity();

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
      _playerEntity,
      [playerPos, playerCollider, playerHealth, player, velocity],
    ) => {
      if (player.isDead) {
        if (player.respawnTime > 0) {
          player.respawnTime--;
          if (player.respawnTime <= 0) {
            player.isDead = false;
            playerHealth.currentHealth = playerHealth.maxHealth;
            playerPos.x = 0;
            playerPos.y = 0;
            velocity.x = 0;
            velocity.y = 0;
          }
        }
        return;
      }

      runQuery(
        [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
        (projectileEntity, [projectilePos, projectile]) => {
          if (projectile.source === "player") return;

          const dx = playerPos.x - projectilePos.x;
          const dy = playerPos.y - projectilePos.y;
          const distanceSquared = dx * dx + dy * dy;
          const combinedRadius = playerCollider.radius + projectile.radius;

          if (distanceSquared <= combinedRadius * combinedRadius) {
            playerHealth.currentHealth = Math.max(
              0,
              playerHealth.currentHealth - projectile.damage,
            );

            destroyEntity(projectileEntity);

            if (playerHealth.currentHealth <= 0) {
              player.isDead = true;
              player.respawnTime = player.respawnDuration;
              velocity.x = 0;
              velocity.y = 0;
            }
          }
        },
      );
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
