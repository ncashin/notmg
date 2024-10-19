export type PlayerEntity = {
  x: number;
  y: number;
};
export type Entity = {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
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
    Object.entries(gameState.entities).map(([key, value]) => [
      key,
      { ...value },
    ])
  ),
  projectiles: gameState.projectiles.map((projectile) =>
    updateProjectile(projectile)
  ),
});

export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};
