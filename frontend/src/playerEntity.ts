export type PlayerEntity = {
  x: number;
  y: number;
  maxHealth: number;
  health: number;
  invulnerabilityTime: number;
  collisionRadius: number;
};

export const interpolatePlayer = (
  entity: PlayerEntity,
  serverEntity: PlayerEntity,
  interpolationTime: number
) => ({
  ...serverEntity,
  x: entity.x + (serverEntity.x - entity.x) * interpolationTime,
  y: entity.y + (serverEntity.y - entity.y) * interpolationTime,
});
