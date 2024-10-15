export type Entity = {
  x: number;
  y: number;
};
export type ControlledEntity = {
  x: number;
  y: number;
};
export type GameState = {
  playerEntities: Entity[];
  entities: Entity[];
};
export const createInitialGameState = () => {
  return {
    playerEntities: [],
    entities: [{ x: 0, y: 0 }],
  };
};

import ghoulURL from "../public/ghoul.png";
import littleGuyURL from "../public/notmglittleguy.png";

const loadSprite = (url: string) => {
  let imageElement = new Image(32, 32);
  imageElement.src = url;
  return imageElement;
};

export const sprites = {
  littleGuy: loadSprite(littleGuyURL),
  ghoul: loadSprite(ghoulURL),
};

export const interpolateGameState = (
  currentGameState: GameState,
  nextGameState: GameState,
  interpTime: number
) => {
  if (
    nextGameState.playerEntities.length !=
    currentGameState.playerEntities.length
  ) {
    currentGameState.playerEntities = structuredClone(
      nextGameState.playerEntities
    );
  }
  return {
    playerEntities: currentGameState.playerEntities.map((entity, index) => ({
      x:
        entity.x +
        (nextGameState.playerEntities[index].x - entity.x) * interpTime,
      y:
        entity.y +
        (nextGameState.playerEntities[index].y - entity.y) * interpTime,
    })),

    entities: currentGameState.entities,
    /*entities: currentGameState.entities.map((entity, index) => ({
      x: entity.x + (nextGameState.entities[index].x - entity.x) * interpTime,
      y: entity.y + (nextGameState.entities[index].y - entity.y) * interpTime,
    })),*/
  } satisfies GameState;
};
export const renderGameState = (
  gameState: GameState,
  context: CanvasRenderingContext2D
) => {
  context.fillStyle = "black";
  context.clearRect(0, 0, 900, 600);
  context.fillStyle = "red";
  gameState.playerEntities.forEach((player, index) => {
    context.fillText("Index: " + index, player.x, player.y - 5);
    context.drawImage(sprites.littleGuy, player.x, player.y);
  });
  gameState.entities.forEach((entity) => {
    context.drawImage(sprites.ghoul, entity.x, entity.y);
  });
};
