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
import { PLAYER_COMPONENT_DEF } from "../../../core/player";
import {
  addComponent,
  addUpdateCallback,
  createEntity,
  destroyEntity,
  getComponent,
  runQuery,
} from "../ecsProvider";
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

// Add collision handling for projectiles
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
      // Skip collision checks if player is dead
      if (player.isDead) {
        // Handle respawn timer
        if (player.respawnTime > 0) {
          player.respawnTime--;
          if (player.respawnTime <= 0) {
            // Respawn the player
            player.isDead = false;
            playerHealth.currentHealth = playerHealth.maxHealth;
            // Reset position and velocity
            playerPos.x = 0;
            playerPos.y = 0;
            velocity.x = 0;
            velocity.y = 0;
          }
        }
        return;
      }

      // Get all projectiles that could be colliding with the player
      runQuery(
        [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
        (projectileEntity, [projectilePos, projectile]) => {
          // Skip projectiles created by the player
          if (projectile.source === "player") return;

          // Check for collision using circle collision
          const dx = playerPos.x - projectilePos.x;
          const dy = playerPos.y - projectilePos.y;
          const distanceSquared = dx * dx + dy * dy;
          const combinedRadius = playerCollider.radius + projectile.radius;

          if (distanceSquared <= combinedRadius * combinedRadius) {
            // Player takes damage
            playerHealth.currentHealth = Math.max(
              0,
              playerHealth.currentHealth - projectile.damage,
            );

            // Destroy the projectile
            destroyEntity(projectileEntity);

            // If player health reaches 0, start respawn process
            if (playerHealth.currentHealth <= 0) {
              player.isDead = true;
              player.respawnTime = player.respawnDuration;
              // Reset velocity immediately when dying
              velocity.x = 0;
              velocity.y = 0;
            }
          }
        },
      );
    },
  );
});
