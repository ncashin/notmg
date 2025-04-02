import { ecsInstance } from "../frontend/src/main";
import { addComponent, createEntity, ECSInstance, runSystem } from "./ecs";

export const POSITION_COMPONENT_DEF: {
  type: "position";
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

export const createKinematicEntity = (ecsInstance: ECSInstance) => {
  const newEntity = createEntity(ecsInstance);
  addComponent(ecsInstance, newEntity, POSITION_COMPONENT_DEF);
  addComponent(ecsInstance, newEntity, VELOCITY_COMPONENT_DEF);
  addComponent(ecsInstance, newEntity, AABB_COLLIDER_COMPONENT_DEF);
  return newEntity;
};

export const updateCollisionSystem = (ecsInstance: ECSInstance) => {
  runSystem(
    ecsInstance,
    [
      POSITION_COMPONENT_DEF,
      VELOCITY_COMPONENT_DEF,
      AABB_COLLIDER_COMPONENT_DEF,
    ],
    (movingEntity, [movingPosition, movingVelocity, movingCollider]) => {
      runSystem(
        ecsInstance,
        [POSITION_COMPONENT_DEF, AABB_COLLIDER_COMPONENT_DEF],
        (entity, [colliderPosition, collider]) => {
          if (entity === movingEntity) return;

          const newPositionX = movingPosition.x + movingVelocity.x;
          const distanceX = Math.abs(newPositionX - colliderPosition.x);
          const horizontalOverlap =
            distanceX < (collider.width + movingCollider.width) / 2;

          const newPositionY = movingPosition.y + movingVelocity.y;
          const distanceY = Math.abs(newPositionY - colliderPosition.y);
          const verticalOverlap =
            distanceY < (collider.height + movingCollider.height) / 2;

          if (!horizontalOverlap || !verticalOverlap) return;

          const oldDistanceX = Math.abs(movingPosition.x - colliderPosition.x);
          let priorHorizontalOverlap =
            oldDistanceX < (collider.width + movingCollider.width) / 2;

          const oldDistanceY = Math.abs(movingPosition.y - colliderPosition.y);
          let priorVerticalOverlap =
            oldDistanceY < (collider.height + movingCollider.height) / 2;

          if (!priorHorizontalOverlap && !priorVerticalOverlap) {
            priorVerticalOverlap =
              oldDistanceX >= oldDistanceY * (collider.width / collider.height);
          }
          if (priorVerticalOverlap) {
            if (movingPosition.x <= colliderPosition.x) {
              movingVelocity.x = 0;
              const remainingVelocity =
                colliderPosition.x -
                collider.width / 2 -
                (movingPosition.x + movingCollider.width / 2);
              movingPosition.x += remainingVelocity;
            } else {
              movingVelocity.x = 0;
              const remainingVelocity =
                colliderPosition.x +
                collider.width / 2 -
                (movingPosition.x - movingCollider.width / 2);
              movingPosition.x += remainingVelocity;
            }
            return;
          }

          if (movingPosition.y <= colliderPosition.y) {
            movingVelocity.y = 0;
            const remainingVelocity =
              colliderPosition.y -
              collider.height / 2 -
              (movingPosition.y + movingCollider.height / 2);
            movingPosition.y += remainingVelocity;
          } else {
            movingVelocity.y = 0;
            const remainingVelocity =
              colliderPosition.y +
              collider.height / 2 -
              (movingPosition.y - movingCollider.height / 2);
            movingPosition.y += remainingVelocity;
          }
        },
      );

      movingPosition.x += movingVelocity.x;
      movingPosition.y += movingVelocity.y;
    },
  );
};
