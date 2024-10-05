export type Entity = {
  id: number;
  x: number;
  y: number;
};
export type GameState = {
  playerEntities: Record<string, Entity>;
  entities: Entity[];
};

export const createInitialGameState = () => {
  return {
    playerEntities: {},
    entities: [],
  } satisfies GameState;
};

export const update = (gameState: GameState) => ({
  playerEntities: Object.values(gameState.playerEntities).map(
    (player) => player
  ),
  entities: gameState.entities.map((entity) => entity),
});
