export type Position = {
  x: number;
  y: number;
};

export type Entity = {
  position: Position;
};
export type GameState = {
  entities: Entity[];
};

export const createInitialGameState = () => {
  return {
    entities: [
      {
        position: {
          x: 0,
          y: 0,
        },
      },
    ],
  };
};

export const update = (gameState: GameState, inputMap: any) => ({
  entities: gameState.entities.map((entity) => ({
    position: {
      x: inputMap["d"] ? entity.position.x + 5 : entity.position.x,
      y: entity.position.y,
    },
  })),
});

export const renderGameState = (
  gameState: GameState,
  context: CanvasRenderingContext2D
) => {
  context.fillStyle = "black";
  context.clearRect(0, 0, 900, 600);
  context.fillStyle = "red";
  gameState.entities.forEach((entity) => {
    context.fillRect(entity.position.x, entity.position.y, 32, 32);
  });
};
