import type { GameState } from "./game";

export type IntializeEvent = {
  type: "initialize";
  data: {
    gameState: GameState;
  };
};
export type ConnectEvent = {
  type: "connect";
  data: {
    id: string;
  };
};
export type DisconnectEvent = {
  type: "disconnect";
  data: {
    id: string;
  };
};
export type UpdateEvent = {
  type: "update";
  data: {
    gameState: GameState;
  };
};
