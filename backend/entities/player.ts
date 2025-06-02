import type { Entity } from "../../core/ecs";
import {
  AABB_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
  VELOCITY_COMPONENT_DEF,
} from "../../core/collision";
import { SPRITE_COMPONENT_DEF } from "../../core/game";
import { addComponent, createEntity, getComponent } from "../ecsProvider";
import { createProjectile } from "./projectile";

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
