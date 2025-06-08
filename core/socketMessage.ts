export interface BaseClientMessage {
  type: string;
}
export type MoveMessage = BaseClientMessage & {
  type: "move";
  x: number;
  y: number;
};
export type ShootMessage = BaseClientMessage & {
  type: "shoot";
  targetX: number;
  targetY: number;
};

export type InteractMessage = BaseClientMessage & {
  type: "interact";
  x: number;
  y: number;
};
export type AuthMessage = BaseClientMessage & {
  type: "auth";
  token: string;
};

export type ClientMessage =
  | MoveMessage
  | ShootMessage
  | InteractMessage
  | AuthMessage;
