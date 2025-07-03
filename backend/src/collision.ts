import { quadtree } from "d3-quadtree";

import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  type Entity,
  POSITION_COMPONENT_DEF,
} from "core";
import { runQuery } from "./ecsProvider";
import { addUpdateCallback } from "./update";

export type CollisionTreeType = [
  Entity,
  typeof POSITION_COMPONENT_DEF,
  typeof CIRCLE_COLLIDER_COMPONENT_DEF,
];
export const createQuadtree = () => {
  return quadtree<CollisionTreeType>()
    .x((d) => d[1].x)
    .y((d) => d[1].y);
};

export let collisionTree = createQuadtree();
export const updateCollisionTree = () => {
  collisionTree = createQuadtree();
  runQuery(
    [POSITION_COMPONENT_DEF, CIRCLE_COLLIDER_COMPONENT_DEF],
    (entity, [position, circleCollider]) => {
      collisionTree.add([entity, position, circleCollider]);
    },
  );
};

let frameCount = 0;
addUpdateCallback(() => {
  frameCount++;
  if (frameCount >= 120) {
    updateCollisionTree();
    frameCount = 0;
  }
});
