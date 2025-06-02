export type BaseClientMessage = {
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
export type ClientMessage = MoveMessage | ShootMessage;
