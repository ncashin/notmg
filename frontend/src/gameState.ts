import { interpolateEntity, type Entity } from "./entity";
import { interpolatePlayer, type PlayerEntity } from "./playerEntity";
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
