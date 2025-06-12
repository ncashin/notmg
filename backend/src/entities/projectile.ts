import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
} from "../../../core/collision";
import type { Entity } from "../../../core/ecs";
import { PROJECTILE_COMPONENT_DEF } from "../../../core/game";
import { addComponent, destroyEntity, runQuery } from "../ecsProvider";
import { addUpdateCallback } from "../update";

export const createProjectile = (
  entity: Entity,
  x: number,
  y: number,
  velocityX: number,
  velocityY: number,
  source: "player" | "boss" = "player", // Default to player for backward compatibility
  damage = 10, // Default damage value
) => {
  addComponent(entity, { ...POSITION_COMPONENT_DEF, x, y });
  addComponent(entity, {
    ...PROJECTILE_COMPONENT_DEF,
    velocityX,
    velocityY,
    source,
    damage,
  });
  addComponent(entity, { ...CIRCLE_COLLIDER_COMPONENT_DEF, radius: 10 });
};

addUpdateCallback(() => {
  runQuery(
    [POSITION_COMPONENT_DEF, PROJECTILE_COMPONENT_DEF],
    (entity, [position, projectile]) => {
      position.x += projectile.velocityX;
      position.y += projectile.velocityY;

      projectile.currentLifetime++;

      if (projectile.currentLifetime >= projectile.lifetime) {
        destroyEntity(entity);
      }
    },
  );
});
