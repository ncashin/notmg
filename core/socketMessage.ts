export type MoveMessage = {
  type: "move";
  x: number;
  y: number;
};

export type ShootMessage = {
  type: "shoot";
  targetX: number;
  targetY: number;
};

export type InteractMessage = {
  type: "interact";
  x: number;
  y: number;
};

export type AuthMessage = {
  type: "auth";
  token: string;
};

export type CreateItemMessage = {
  type: "createItem";
  offsetX: number;
  offsetY: number;
};

export type ClientMessage =
  | MoveMessage
  | ShootMessage
  | InteractMessage
  | AuthMessage
  | CreateItemMessage;
