import { ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import { playerShoot } from "../backend";
import { POSITION_COMPONENT_DEF } from "./collision";
import { getComponent } from "./ecs";

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
export type ClientMessage = MoveMessage | ShootMessage;
