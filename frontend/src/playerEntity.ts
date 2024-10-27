import { entitySprites } from "./entity";

export type PlayerEntity = {
  x: number;
  y: number;
  health: number;
  invulnerabilityTime: number;
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

export const drawPlayerEntity = (
  context: CanvasRenderingContext2D,
  playerEntity: PlayerEntity
) => {
  context.fillText("ID: ", playerEntity.x, playerEntity.y - 5);
  context.drawImage(entitySprites.littleGuy, playerEntity.x, playerEntity.y);
};
