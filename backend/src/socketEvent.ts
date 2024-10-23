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

export type ClientMessage = ClientUpdateMessage | ClientAbilityMessage;
export type ClientUpdateMessage = {
  websocketID: number;
  type: "update";
  data: {
    x: number;
    y: number;
  };
};
export type ClientAbilityMessage = {
  websocketID: number;
  type: "ability";
  data: {
    entityID: string;
  };
};
