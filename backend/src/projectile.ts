import type { GameState } from "./gameState";

export type Projectile = {
  x: number;
  y: number;
  dx: number;
  dy: number;
  collisionRadius: number;
};

export const updateProjectile = (projectile: Projectile) => {
  return {
    ...projectile,
    x: projectile.x + projectile.dx,
    y: projectile.y + projectile.dy,
  };
};

export let _gameState: GameState = {
  playerEntities: {},
  entities: {
    0: {
      type: "leviathan",
      x: 700,
      y: 150,
      health: 4,
      maxHealth: 5,
      tickCounter: 0,
    },
  },

  projectileIDCounter: 0,
  projectiles: {},
};
export const useGameState = () => structuredClone(_gameState);
export const setGameState = (newGameState: GameState) => {
  _gameState = structuredClone(newGameState);
};
