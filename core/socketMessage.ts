import { Vector2 } from "./vector2";

export type MoveMessage = {
  type: "move";
  position: Vector2;
  velocity: Vector2;
  angle: number;
};

export type ShootMessage = {
  type: "shoot";
  targetPosition: Vector2;
};

export type ClientMessage =
  | MoveMessage
  | ShootMessage;
