import {
  type Entity,
} from "./ecs";

export const POSITION_COMPONENT_DEF: {
  networked: true;
  type: "position";
  x: number;
  y: number;
  entity?: Entity;
} = {
  networked: true,
  type: "position",
  x: 0,
  y: 0,
};
export const VELOCITY_COMPONENT_DEF: {
  networked: true;

  type: "velocity";
  x: number;
  y: number;
} = {
  networked: true,

  type: "velocity",
  x: 0,
  y: 0,
};

export const CIRCLE_COLLIDER_COMPONENT_DEF: {
  networked: true;
  type: "circleCollider";
  radius: number;
} = {
  networked: true,
  type: "circleCollider",
  radius: 32,
};
