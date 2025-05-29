import { quadtree } from "d3-quadtree";
import { type ECSInstance, Entity, addComponent, createEntity, runQuery } from "./ecs";

export const POSITION_COMPONENT_DEF: {
  type: "position";
  entity?: Entity; 
  x: number;
  y: number;
} = {
  type: "position",
  x: 0,
  y: 0,
};
export const VELOCITY_COMPONENT_DEF: {
  type: "velocity";
  x: number;
  y: number;
} = {
  type: "velocity",
  x: 0,
  y: 0,
};

export const AABB_COLLIDER_COMPONENT_DEF: {
  type: "aabbCollider";
  width: number;
  height: number;
} = {
  type: "aabbCollider",
  width: 64,
  height: 64,
};

export const CIRCLE_COLLIDER_COMPONENT_DEF: {
  type: "circleCollider";
  radius: number;
} = {
  type: "circleCollider",
  radius: 32,
};

export const collisionTree = quadtree<typeof POSITION_COMPONENT_DEF>().x((d) => d.x).y((d) => d.y)
export const createKinematicEntity = (ecsInstance: ECSInstance) => {
  const newEntity = createEntity(ecsInstance);
  addComponent(ecsInstance, newEntity, {...POSITION_COMPONENT_DEF, newEntity});
  addComponent(ecsInstance, newEntity, VELOCITY_COMPONENT_DEF);
  addComponent(ecsInstance, newEntity, AABB_COLLIDER_COMPONENT_DEF);
  return newEntity;
};

