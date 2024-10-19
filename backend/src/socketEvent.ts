import type { GameState } from "./game";

export type IntializeEvent = {
  type: "initialize";
  data: {
    gameState: GameState;
    clientEntityID: string;
  };
};
export type UpdateEvent = {
  type: "update";
  data: {
    gameState: GameState;
  };
};
