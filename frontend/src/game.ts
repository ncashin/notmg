export type Entity = {
  x: number;
  y: number;
};
export type ClientState = {
  x: number;
  y: number;
  targetedEntity: number | undefined;
  clientEntityID: string | undefined;
};
export type GameState = {
  playerEntities: Record<string, Entity>;
  entities: Record<string, Entity>;
};
export type ServerState = {
  timeStateReceived: number;
  gameState: GameState;
};

import ghoulURL from "../public/ghoul.png";
import leviathanURL from "../public/leviathan.png";
import littleGuyURL from "../public/notmglittleguy.png";

const loadSprite = (x: number, y: number, url: string) => {
  let imageElement = new Image(x, y);
  imageElement.src = url;
  return imageElement;
};

export const sprites = {
  littleGuy: loadSprite(32, 32, littleGuyURL),
  ghoul: loadSprite(32, 32, ghoulURL),
  leviathan: loadSprite(128, 128, leviathanURL),
};

export const interpolatePlayer = (
  key: string,
  entity: Entity,
  serverGameState: GameState,
  interpTime: number
) => ({
  x: entity.x + (serverGameState.playerEntities[key].x - entity.x) * interpTime,
  y: entity.y + (serverGameState.playerEntities[key].y - entity.y) * interpTime,
});

export const interpolateGameState = (
  gameState: GameState,
  serverState: ServerState,
  interpolationTime: number
) => {
  const playerEntities = Object.entries(
    serverState.gameState.playerEntities
  ).reduce((accumulator, [key, value]) => {
    if (gameState.playerEntities[key] === undefined) {
      return {
        ...accumulator,
        [key]: value,
      };
    }

    return {
      ...accumulator,
      [key]: gameState.playerEntities[key],
    };
  }, {});

  const disconnectionDiff = Object.entries(gameState.playerEntities).filter(
    ([key, value]) => serverState.gameState.playerEntities[key] === undefined
  );

  return {
    playerEntities: Object.fromEntries(
      Object.entries(playerEntities).map(([key, value]) => [
        key,
        interpolatePlayer(key, value, serverState.gameState, interpolationTime),
      ])
    ),
    entities: gameState.entities,
  } satisfies GameState;
};

export const renderGameState = (
  clientState: ClientState,
  gameState: GameState,
  context: CanvasRenderingContext2D
) => {
  context.fillStyle = "black";
  context.clearRect(0, 0, 900, 600);
  context.fillStyle = "red";
  Object.entries(gameState.playerEntities).forEach(([id, player], index) => {
    if (id === clientState.clientEntityID) return;
    context.fillText("Index: " + index, player.x, player.y - 5);
    context.drawImage(sprites.littleGuy, player.x, player.y);
  });
  Object.values(gameState.entities).forEach((entity, index) => {
    if (index === clientState.targetedEntity) return;
    context.drawImage(sprites.ghoul, entity.x, entity.y);
  });
  context.drawImage(sprites.leviathan, 0, 0);

  context.fillText("ID: " + "PLAYER", clientState.x, clientState.y - 5);
  context.drawImage(sprites.littleGuy, clientState.x, clientState.y);
};
