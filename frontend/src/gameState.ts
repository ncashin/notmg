import { drawClientPlayerEntity, type ClientState } from "./clientState";
import { drawEntity, interpolateEntity, type Entity } from "./entity";
import {
  drawPlayerEntity,
  interpolatePlayer,
  type PlayerEntity,
} from "./playerEntity";
import { interpolateProjectile, type Projectile } from "./projectile";

export type GameState = {
  playerEntities: Record<string, PlayerEntity>;
  entities: Record<string, Entity>;

  projectiles: Record<string, Projectile>;
};
export const createInitialGameState = () => ({
  playerEntities: {},
  entities: {},

  projectiles: {},
});

export type ServerState = {
  timeStateReceived: number;
  gameState: GameState;
};
let _serverState = {
  timeStateReceived: Date.now(),
  gameState: createInitialGameState(),
};
export const useServerState = () => structuredClone(_serverState);
export const setServerState = (newServerState: ServerState) => {
  _serverState = structuredClone(newServerState);
};

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
      [key]: interpolatePlayer(
        gameState.playerEntities[key],
        value,
        interpolationTime
      ),
    };
  }, {});

  const entities = Object.entries(serverState.gameState.entities).reduce(
    (accumulator, [key, value]) => {
      if (gameState.entities[key] === undefined) {
        return {
          ...accumulator,
          [key]: value,
        };
      }

      return {
        ...accumulator,
        [key]: interpolateEntity(
          gameState.entities[key],
          value,
          interpolationTime
        ),
      };
    },
    {}
  );

  const projectiles = Object.entries(serverState.gameState.projectiles).reduce(
    (accumulator, [key, value]) => {
      if (gameState.projectiles[key] === undefined) {
        return {
          ...accumulator,
          [key]: value,
        };
      }

      return {
        ...accumulator,
        [key]: interpolateProjectile(
          gameState.projectiles[key],
          value,
          interpolationTime
        ),
      };
    },
    {}
  );

  return {
    playerEntities,
    entities,

    projectiles,
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
  Object.entries(gameState.playerEntities).forEach(([id, player]) => {
    if (id === clientState.clientEntityID) return;
    drawPlayerEntity(context, player);
  });
  Object.entries(gameState.entities).forEach(([key, entity]) => {
    if (key === clientState.targetedEntity) {
      context.fillStyle = "red";
      context.fillRect(entity.x, entity.y, 48, 48);
    }
    drawEntity(context, entity);
  });
  Object.entries(gameState.projectiles).forEach(([key, projectile]) => {
    context.fillStyle = "yellow";
    context.fillRect(projectile.x, projectile.y, 32, 32);
  });

  drawClientPlayerEntity(context, clientState);
};
