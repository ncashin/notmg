export type Entity = {
  id: number;
  x: number;
  y: number;
};
export type ControlledEntity = {
  x: number;
  y: number;
};
export type GameState = {
  playerEntities: Record<string, Entity>;
  entities: Entity[];
};
export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: [],
  };
};

import littleGuyURL from "../public/notmglittleguy.png";
const loadSprite = (url: string) => {
  let imageElement = new Image(32, 32);
  imageElement.src = url;
  return imageElement;
};

export const sprites = {
  littleGuy: loadSprite(littleGuyURL),
};

export const TICK_RATE = 1000 / 60;
export const interpolateGameState = (
  gameState: GameState,
  serverGameState: GameState,
  deltaTime: number
) => {
  const interpTime = Math.min(deltaTime / TICK_RATE, 1);
  return {
    ...serverGameState,
    playerEntities: Object.values(gameState.playerEntities).reduce(
      (accumulator, entity) => ({
        ...accumulator,
        [entity.id]: {
          ...serverGameState.playerEntities[entity.id],
          x:
            entity.x +
            (serverGameState.playerEntities[entity.id].x - entity.x) *
              interpTime,
          y:
            entity.y +
            (serverGameState.playerEntities[entity.id].y - entity.y) *
              interpTime,
        },
      }),
      structuredClone(serverGameState.playerEntities)
    ),
    entities: gameState.entities.map((entity, index) => ({
      ...serverGameState.entities[index],
      x: entity.x + (serverGameState.entities[index].x - entity.x) * interpTime,
      y: entity.y + (serverGameState.entities[index].y - entity.y) * interpTime,
    })),
  } satisfies GameState;
};
export const renderGameState = (
  gameState: GameState,
  context: CanvasRenderingContext2D
) => {
  context.fillStyle = "black";
  context.clearRect(0, 0, 900, 600);
  context.fillStyle = "red";
  Object.values(gameState.playerEntities).forEach((player) => {
    context.fillText("ID: " + player.id.toString(), player.x, player.y - 5);
    context.drawImage(sprites.littleGuy, player.x, player.y);
  });
  gameState.entities.forEach((entity) => {
    context.drawImage(sprites.littleGuy, entity.x, entity.y);
  });
};
