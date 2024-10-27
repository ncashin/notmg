import { updateEntity, type Entity } from "./entity";
import type { ClientMessage, ClientSocketMessage } from "./socketEvent";

export type PlayerEntity = {
  x: number;
  y: number;
  health: number;
  invulnerabilityTime: number;
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

export const updatePlayerEntityInGameState = (
  accumulator: GameState,
  key: string,
  playerEntity: Entity
) => ({
  ...accumulator,
  playerEntities: {
    ...accumulator.playerEntities,
    [key]: {
      ...accumulator.playerEntities[key],
      ...playerEntity,
    },
  },
});
export const updateEntityInGameState = (
  accumulator: GameState,
  key: string,
  targetedEntity: Entity
) => ({
  ...accumulator,
  entities: {
    ...accumulator.entities,
    [key]: {
      ...targetedEntity,
      health: targetedEntity.health - 1,
    },
  },
});
export const removePlayerEntityFromGameStateByKey = (
  accumulator: GameState,
  keyToRemove: string
) => ({
  ...accumulator,
  playerEntities: Object.fromEntries(
    Object.entries(accumulator.playerEntities).filter(
      ([key, value]) => key !== keyToRemove
    )
  ),
});
export const integrateReceivedMessages = (
  gameState: GameState,
  receivedMessages: ClientMessage[],
  socketStateMessages: ClientSocketMessage[]
) => {
  const integratedGameState = receivedMessages.reduce(
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
            ...targetedEntity,
            health: targetedEntity.health - 1,
          });
        default:
          return accumulator;
      }
    },
    gameState
  );
  const finalGameState = socketStateMessages.reduce((accumulator, message) => {
    switch (message.type) {
      case "open":
        return updatePlayerEntityInGameState(accumulator, message.websocketID, {
          x: 0,
          y: 0,
          health: 5,
        });
      case "close":
        return removePlayerEntityFromGameStateByKey(
          accumulator,
          message.websocketID
        );
      default:
        return accumulator;
    }
  }, integratedGameState);
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

  const projectileEntries = Object.entries(projectiles);
  const overflowCount = projectileEntries.length - MAX_PROJECTILE_COUNT;
  const splicedEntries =
    overflowCount > 0
      ? projectileEntries.splice(0, overflowCount)
      : projectileEntries;
  const finalProjectiles = Object.fromEntries(splicedEntries);

  const playerEntities = Object.fromEntries(
    Object.entries(gameState.playerEntities).map(([key, value]) => [
      key,
      updatePlayerEntity(value, Object.values(finalProjectiles)),
    ])
  );
  return {
    playerEntities,
    entities,

    projectileIDCounter: gameState.projectileIDCounter + newProjectiles.length,
    projectiles: finalProjectiles,
  };
};

const updatePlayerEntity = (
  playerEntity: PlayerEntity,
  projectile: Projectile[]
) => {
  const collidingProjectile = projectile.find((projectile) => {
    const dx = playerEntity.x - projectile.x;
    const dy = playerEntity.y - projectile.y;
    const projectileDistance = Math.sqrt(dx * dx + dy * dy);
    return projectileDistance < projectile.collisionRadius;
  });
  const updatedPlayerEntity = {
    ...playerEntity,
    health:
      collidingProjectile === undefined
        ? playerEntity.health
        : playerEntity.health - 1,
  };
  return updatedPlayerEntity;
};
export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};
