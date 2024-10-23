import { updateEntity, type Entity } from "./entity";

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

  projectiles: Record<string, Projectile>;
};

export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: {},

    projectiles: {},
  } satisfies GameState;
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
  const maxKey = Object.keys(gameState.projectiles).reduce(
    (max, key) => (max > key ? max : key),
    0
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
          [maxKey + index]: projectile,
        }),
        {}
      ),
    }
  );

  return {
    playerEntities: Object.fromEntries(
      Object.entries(gameState.playerEntities).map((entry) => entry)
    ),
    entities,
    projectiles,
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
