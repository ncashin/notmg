import { Vector2 } from "./vector2";

export const BASE_ENTITY_COMPONENT_DEF: {
  type: "baseEntity";
  networked: true;
  position: Vector2;
  velocity: Vector2;
  angle: number;
} = {
  type: "baseEntity",
  networked: true,
  position: Vector2.zero(),
  velocity: Vector2.zero(),
  angle: 0,
};

export const PLAYER_COMPONENT_DEF: {
  type: "player";
  networked: true;
} = {
  type: "player",
  networked: true,
};

export const ASTEROID_COMPONENT_DEF: {
  type: "asteroid";
  networked: true;
  points: Vector2[]
} = {
  type: "asteroid",
  networked: true,
  points: [
    new Vector2(20, 0),
    new Vector2(10, 18),
    new Vector2(-10, 18),
    new Vector2(-20, 0),
    new Vector2(-10, -18),
    new Vector2(10, -18),
  ],
};
