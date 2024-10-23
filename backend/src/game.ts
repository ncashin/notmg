import { updateEntity, type Entity } from "./entity";
import type { ClientMessage } from "./socketEvent";

export type PlayerEntity = {
  x: number;
  y: number;
};

export type Projectile = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  collisionRadius: number;
};
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
  receivedMessages: ClientMessage[]
) => {
  const integratedGameState = receivedMessages.reduce(
    (accumulator, message) => {
      switch (message.type) {
        case "update":
          return {
            ...accumulator,
            playerEntities: {
              ...accumulator.playerEntities,
              [message.websocketID]: {
                ...gameState.playerEntities[message.websocketID],
                ...message.data,
              },
            },
          };
        case "ability":
          const targetedEntity = gameState.entities[message.data.entityID];
          return {
            ...accumulator,
            entities: {
              ...accumulator.entities,
              [message.data.entityID]: {
                ...targetedEntity,
                health: targetedEntity.health - 1,
              },
            },
          };
      }
    },
    gameState
  );
  return integratedGameState;
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

  const projectileEntries = Object.entries(projectiles);
  const overflowCount = projectileEntries.length - MAX_PROJECTILE_COUNT;
  const splicedEntries =
    overflowCount > 0
      ? projectileEntries.splice(0, overflowCount)
      : projectileEntries;
  const finalProjectiles = Object.fromEntries(splicedEntries);

  return {
    playerEntities: Object.fromEntries(
      Object.entries(gameState.playerEntities).map((entry) => entry)
    ),
    entities,

    projectileIDCounter: gameState.projectileIDCounter + newProjectiles.length,
    projectiles: finalProjectiles,
  };
};

export const updateEntitiesAndProjectiles = (gameState: GameState) => {};

export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};
