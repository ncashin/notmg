import { updateEntity, updateEntityInGameState, type Entity } from "./entity";
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
  entities: Record<string, Entity>;

  projectileIDCounter: number;
  projectiles: Record<string, Projectile>;
};

export const MAX_PROJECTILE_COUNT = 60;
export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: {},

    projectileIDCounter: 0,
    projectiles: {},
  } satisfies GameState;
};

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
          const targetedEntity = accumulator.entities[message.data.entityID];
          return updateEntityInGameState(accumulator, message.data.entityID, {
            health: targetedEntity.health - 1,
          });
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
  return {
    playerEntities,
    entities,

    projectileIDCounter: gameState.projectileIDCounter + newProjectiles.length,
    projectiles: finalProjectiles,
  };
};
