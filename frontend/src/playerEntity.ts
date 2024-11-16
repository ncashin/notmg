import { entitySprites } from "./entity";

export type PlayerEntity = {
  x: number;
  y: number;
  maxHealth: number;
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
  playerEntity: PlayerEntity,
  offsetX: number,
  offsetY: number
) => {
  context.fillText(
    "ID: ",
    playerEntity.x + offsetX,
    playerEntity.y - 5 + offsetY
  );
  context.drawImage(
    entitySprites.littleGuy,
    playerEntity.x + offsetX,
    playerEntity.y + offsetY
  );
};
