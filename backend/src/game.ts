export type Entity = {
  id: number;
  x: number;
  y: number;
  maxHealth: number;
  health: number;
  collisionRadius: number;
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
  entities: Entity[];

  projectiles: Projectile[];
};

export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: [],

    projectiles: [],
  } satisfies GameState;
};

export const update = (gameState: GameState) => ({
  playerEntities: Object.values(gameState.playerEntities).map(
    (player) => player
  ),
  entities: gameState.entities.map((entity) => entity),
  projectiles: gameState.projectiles.map((projectile) => projectile),
});

export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};
