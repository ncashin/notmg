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

export type ClientMessage =
  | MoveMessage
  | ShootMessage;
