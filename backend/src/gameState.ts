import { updateEntity, type Entity } from "./entity";
import {
  removePlayerEntityFromGameStateByKey,
  updatePlayerEntity,
  updatePlayerEntityInGameState,
  type PlayerEntity,
} from "./playerEntity";
import { updateProjectile, type Projectile } from "./projectile";
import type { ClientMessage, ClientSocketMessage } from "./socketEvent";

export type GameState = {
  playerEntities: Record<string, PlayerEntity>;
  playerProjectileIDCounter: number;
  playerProjectiles: Record<string, Projectile>;

  entities: Record<string, Entity>;
  projectileIDCounter: number;
  projectiles: Record<string, Projectile>;
};

export const MAX_PROJECTILE_COUNT = 60;
export const MAX_PLAYER_PROJECTILE_COUNT = 60;

export const createInitialGameState = () => {
  return {
    playerEntities: {},
    playerProjectileIDCounter: 0,
    playerProjectiles: {},

    entities: {},
    projectileIDCounter: 0,
    projectiles: {},
  } satisfies GameState;
};

const playerProjectileSpeed = 3;
export const integrateReceivedMessages = (
  gameState: GameState,
  receivedMessages: ClientMessage[],
  socketStateMessages: ClientSocketMessage[]
) => {
  const integratedGameState = receivedMessages.reduce<GameState>(
    (accumulator, message) => {
      switch (message.type) {
        case "update":
          return updatePlayerEntityInGameState(
            accumulator,
            message.websocketID,
            message.data
          );
        case "ability":
          const targetedEntity = message.data.radians;
          return {
            ...gameState,
            playerProjectiles: {
              ...gameState.playerProjectiles,
              [(gameState.playerProjectileIDCounter + 1) %
              MAX_PLAYER_PROJECTILE_COUNT]: {
                x: message.data.x,
                y: message.data.y,
                dx: Math.cos(message.data.radians) * playerProjectileSpeed,
                dy: Math.sin(message.data.radians) * playerProjectileSpeed,
                collisionRadius: 32,
              },
            },
            playerProjectileIDCounter: gameState.playerProjectileIDCounter + 1,
          };
        default:
          return accumulator;
      }
    },
    gameState
  );
  const finalGameState = socketStateMessages.reduce<GameState>(
    (accumulator, message) => {
      switch (message.type) {
        case "open":
          return updatePlayerEntityInGameState(
            accumulator,
            message.websocketID,
            {
              x: 0,
              y: 0,
              health: 5,
              maxHealth: 5,
              invulnerabilityTime: 5,
              collisionRadius: 4,
            }
          );
        case "close":
          return removePlayerEntityFromGameStateByKey(
            accumulator,
            message.websocketID
          );
        default:
          return accumulator;
      }
    },
    integratedGameState
  );
  return finalGameState;
};
export const update = (gameState: GameState) => {
  const { newProjectiles, entities } = Object.entries(
    gameState.entities
  ).reduce<{ newProjectiles: Projectile[]; entities: Record<number, Entity> }>(
    (accumulator, [key, value]) => {
      const [entity, newProjectiles] = updateEntity(value);
      return {
        newProjectiles: accumulator.newProjectiles.concat(newProjectiles),
        entities: { ...accumulator.entities, [key]: entity },
      };
    },
    { newProjectiles: [], entities: [] }
  );
  const projectiles = Object.entries(gameState.projectiles).reduce(
    (accumulator, [key, value]) => ({
      ...accumulator,
      [key]: updateProjectile(value),
    }),
    {
      ...newProjectiles.reduce(
        (accumulator, projectile, index) => ({
          ...accumulator,
          [gameState.projectileIDCounter + index]: projectile,
        }),
        {} satisfies Record<string, Projectile>
      ),
    }
  );
  const projectileEntries = Object.entries<Projectile>(projectiles);
  const overflowCount = projectileEntries.length - MAX_PROJECTILE_COUNT;
  const splicedEntries =
    overflowCount > 0
      ? projectileEntries.splice(
          projectileEntries.length - (overflowCount + 1),
          overflowCount
        )
      : projectileEntries;
  const finalProjectiles = Object.fromEntries(splicedEntries);

  const playerEntities = Object.fromEntries(
    Object.entries(gameState.playerEntities).map(([key, value]) => [
      key,
      updatePlayerEntity(value, finalProjectiles),
    ])
  );
  const playerProjectiles = Object.fromEntries(
    Object.entries(gameState.playerProjectiles).map(([key, value]) => [
      key,
      updateProjectile(value),
    ])
  );

  return {
    playerEntities,
    playerProjectileIDCounter: gameState.playerProjectileIDCounter,
    playerProjectiles: playerProjectiles,

    entities,
    projectileIDCounter: gameState.projectileIDCounter + newProjectiles.length,
    projectiles: finalProjectiles,
  };
};
