import type { GameState } from "./gameState";

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
  websocketID: string;
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

export type ClientSocketMessage =
  | ClientSocketOpenMessage
  | ClientSocketCloseMessage;
export type ClientSocketOpenMessage = {
  type: "open";
  websocketID: string;
};
export type ClientSocketCloseMessage = {
  type: "close";
  websocketID: string;
};

let _receivedMessages: ClientMessage[] = [];
export const useReceivedMessages = () => {
  const receivedMessagesClone = structuredClone(_receivedMessages);
  _receivedMessages = [] satisfies ClientMessage[];
  return receivedMessagesClone;
};
export const pushReceivedMessages = (message: ClientMessage) => {
  _receivedMessages.push(message);
};

let _socketStateMessages: ClientSocketMessage[] = [];
export const useSocketStateMessages = () => {
  const socketStateMessagesClone = structuredClone(_socketStateMessages);
  _socketStateMessages = [] satisfies ClientSocketMessage[];
  return socketStateMessagesClone;
};
export const pushSocketStateMessage = (message: ClientSocketMessage) => {
  _socketStateMessages.push(message);
};
