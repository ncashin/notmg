import ghoulURL from "./assets/ghoul.png";
import leviathanURL from "./assets/leviathan.png";
import littleGuyURL from "./assets/notmglittleguy.png";

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

type EntityTypes = keyof typeof entitySprites;
export type Entity = {
  type: EntityTypes;
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
