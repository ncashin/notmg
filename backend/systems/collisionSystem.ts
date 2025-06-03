import { CIRCLE_COLLIDER_COMPONENT_DEF, POSITION_COMPONENT_DEF } from "../../core/collision";
import type { Entity } from "../../core/ecs";
import { addUpdateCallback, getComponent, queryComponents } from "../ecsProvider";
import { quadtree } from "d3-quadtree";

type CircleData = {
  entity: Entity;
  x: number;
  y: number;
  radius: number;
};

// Create a quadtree for efficient spatial partitioning
const collisionQuadtree = quadtree<CircleData>()
  .x(d => d.x)
  .y(d => d.y);

// Helper function to check if two circles are colliding
const checkCircleCollision = (circle1: CircleData, circle2: CircleData): boolean => {
  const dx = circle1.x - circle2.x;
  const dy = circle1.y - circle2.y;
  const distanceSquared = dx * dx + dy * dy;
  const combinedRadius = circle1.radius + circle2.radius;
  return distanceSquared <= combinedRadius * combinedRadius;
};

// Function to find collisions for a specific circle
const findCollisions = (circle: CircleData): Entity[] => {
  const collisions: Entity[] = [];
  const radius = circle.radius;

  // Search the quadtree for potential collisions
  collisionQuadtree.visit((node, x1, y1, x2, y2) => {
    if (!node.length) {
      // Leaf node
      if (node.data && node.data.entity !== circle.entity) {
        if (checkCircleCollision(circle, node.data)) {
          collisions.push(node.data.entity);
        }
      }
      return false;
    }
    
    // Check if this quadtree cell is too far to contain any possible collisions
    const dx = circle.x - (x1 + (x2 - x1) / 2);
    const dy = circle.y - (y1 + (y2 - y1) / 2);
    const dist = Math.sqrt(dx * dx + dy * dy);
    
    // If the circle is too far from this cell's center (plus radius), skip this branch
    return dist > radius + (x2 - x1) / 2;
  });

  return collisions;
};

// Update the quadtree with current entity positions
const updateCollisionQuadtree = () => {
  // Clear the quadtree by removing all points
  const points = collisionQuadtree.data();
  collisionQuadtree.removeAll(points);

  // Get all entities with circle colliders and positions
  const circles = queryComponents([POSITION_COMPONENT_DEF, CIRCLE_COLLIDER_COMPONENT_DEF] as const);
  
  // Add each circle to the quadtree
  for (const [entity, [position, collider]] of Object.entries(circles)) {
    const entityNum = Number(entity);
    collisionQuadtree.add({
      entity: entityNum,
      x: position.x as number,
      y: position.y as number,
      radius: collider.radius as number,
    });
  }
};

// Function to get colliding entities for a specific entity
export const getCollidingEntities = (entity: Entity): Entity[] => {
  const position = getComponent(entity, POSITION_COMPONENT_DEF);
  const collider = getComponent(entity, CIRCLE_COLLIDER_COMPONENT_DEF);
  
  if (!position || !collider) {
    return [];
  }

  const circle: CircleData = {
    entity,
    x: position.x,
    y: position.y,
    radius: collider.radius,
  };

  return findCollisions(circle);
};

// Register the collision system update
addUpdateCallback(updateCollisionQuadtree); 