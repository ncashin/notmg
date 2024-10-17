import type { GameState } from "./game";

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
  data: GameState;
};
