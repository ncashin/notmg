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

  projectileIDCounter: number;
  projectiles: Record<string, Projectile>;
};

export const MAX_PROJECTILE_COUNT = 10;
export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: {},

    projectileIDCounter: 0,
    projectiles: {},
  } satisfies GameState;
};

export const update = (gameState: GameState, deltaTime: number) => {
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
        {}
      ),
    }
  );

  const projectileEntries = Object.entries(projectiles);
  const overflowCount = projectileEntries.length - MAX_PROJECTILE_COUNT;
  const splicedEntries =
    projectileEntries.length > MAX_PROJECTILE_COUNT
      ? projectileEntries.splice(
          projectileEntries.length - (overflowCount + 1),
          projectileEntries.length
        )
      : projectileEntries;

  return {
    playerEntities: Object.fromEntries(
      Object.entries(gameState.playerEntities).map((entry) => entry)
    ),
    entities,

    projectileIDCounter: gameState.projectileIDCounter + newProjectiles.length,
    projectiles: Object.fromEntries(splicedEntries),
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
