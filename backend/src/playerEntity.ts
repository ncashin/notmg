import type { GameState } from "./gameState";
import type { Projectile } from "./projectile";

export type PlayerEntity = {
  x: number;
  y: number;
  health: number;
  invulnerabilityTime: number;
};

export const updatePlayerEntity = (
  playerEntity: PlayerEntity,
  projectiles: Record<string, Projectile>
) => {
  const collidingProjectile = Object.values(projectiles).find((projectile) => {
    const dx = playerEntity.x - projectile.x;
    const dy = playerEntity.y - projectile.y;
    const projectileDistance = Math.sqrt(dx * dx + dy * dy);
    return projectileDistance < projectile.collisionRadius;
  });
  const updatedPlayerEntity = {
    ...playerEntity,
    health:
      collidingProjectile === undefined
        ? playerEntity.health
        : playerEntity.health - 1,

    invulnerabilityTime: playerEntity.invulnerabilityTime - 1,
  };
  return updatedPlayerEntity;
};

export const updatePlayerEntityInGameState = (
  accumulator: GameState,
  key: string,
  playerEntityUpdate: Partial<PlayerEntity>
) => ({
  ...accumulator,
  playerEntities: {
    ...accumulator.playerEntities,
    [key]: {
      ...accumulator.playerEntities[key],
      ...playerEntityUpdate,
    },
  },
});
export const removePlayerEntityFromGameStateByKey = (
  accumulator: GameState,
  keyToRemove: string
) => ({
  ...accumulator,
  playerEntities: Object.fromEntries(
    Object.entries(accumulator.playerEntities).filter(
      ([key, value]) => key !== keyToRemove
    )
  ),
});
