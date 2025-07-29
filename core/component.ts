export const BASE_ENTITY_COMPONENT_DEF: {
  type: "baseEntity";
  networked: true;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
} = {
  type: "baseEntity",
  networked: true,
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  angle: 0,
};

export const PLAYER_COMPONENT_DEF: {
  type: "player";
  networked: true;
} = {
  type: "player",
  networked: true,
};
