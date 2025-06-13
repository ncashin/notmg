import { quadtree } from "d3-quadtree";
import {
  CIRCLE_COLLIDER_COMPONENT_DEF,
  POSITION_COMPONENT_DEF,
} from "../../core/collision";
import { runQuery } from "./ecsProvider";
import { addUpdateCallback } from "./update";

export const createQuadtree = () => {
  return quadtree<typeof POSITION_COMPONENT_DEF>()
    .x((d) => d.x)
    .y((d) => d.y);
};

export let collisionTree = createQuadtree();
export const updateCollisionTree = () => {
  collisionTree = createQuadtree();
  runQuery(
    [POSITION_COMPONENT_DEF, CIRCLE_COLLIDER_COMPONENT_DEF],
    (entity, [position, circleCollider]) => {
      position.entity = entity;
      position.radius = circleCollider.radius;
      collisionTree.add(position);
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
