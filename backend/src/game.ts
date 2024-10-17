export type Entity = {
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
  playerEntities: Record<string, Entity>;
  entities: Record<string, Entity>;

  projectiles: Projectile[];
};

export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: {},

    projectiles: [],
  } satisfies GameState;
};

export const update = (gameState: GameState) => ({
  playerEntities: Object.fromEntries(
    Object.entries(gameState.playerEntities).map((entry) => entry)
  ),
  entities: Object.fromEntries(
    Object.entries(gameState.entities).map((entry) => entry)
  ),
  projectiles: gameState.projectiles.map((projectile) => projectile),
});

export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};
