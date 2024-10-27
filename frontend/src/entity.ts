import ghoulURL from "../public/ghoul.png";
import leviathanURL from "../public/leviathan.png";
import littleGuyURL from "../public/notmglittleguy.png";

const loadSprite = (x: number, y: number, url: string) => {
  let imageElement = new Image(x, y);
  imageElement.src = url;
  return imageElement;
};

export const entitySprites = {
  littleGuy: loadSprite(32, 32, littleGuyURL),
  ghoul: loadSprite(32, 32, ghoulURL),
  leviathan: loadSprite(128, 128, leviathanURL),
};

export type Entity = {
  type: string;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
};
export const interpolateEntity = (
  entity: Entity,
  serverEntity: Entity,
  interpolationTime: number
) => ({
  ...serverEntity,
  x: entity.x + (serverEntity.x - entity.x) * interpolationTime,
  y: entity.y + (serverEntity.y - entity.y) * interpolationTime,
});

export const drawEntity = (
  context: CanvasRenderingContext2D,
  entity: Entity
) => {
  context.drawImage(entitySprites[entity.type], entity.x, entity.y);
};
