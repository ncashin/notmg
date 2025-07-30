import type { ServerWebSocket } from "bun";
import { BASE_ENTITY_COMPONENT_DEF, PLAYER_COMPONENT_DEF, Vector2 } from "core";
import {
  addComponent,
  createEntity,
  destroyEntity,
  runQuery,
} from "./ecsProvider";
import { addUpdateCallback } from "./update";
import type { WebSocketData } from "./websocket";

export const handleSetupPlayer = (
  websocket: ServerWebSocket<WebSocketData>,
) => {
  const playerEntity = createEntity();
  websocket.data.entity = playerEntity;

  addComponent(playerEntity, BASE_ENTITY_COMPONENT_DEF);
  addComponent(playerEntity, PLAYER_COMPONENT_DEF);
};

export const handleCleanupPlayer = (
  websocket: ServerWebSocket<WebSocketData>,
) => {
  destroyEntity(websocket.data.entity);
};

addUpdateCallback(() => {
  const deltaTime = 1 / 60; // 60 FPS on server
  runQuery([BASE_ENTITY_COMPONENT_DEF], (_entity, [baseEntity]) => {
    // Update position based on velocity with deltaTime
    const movement = baseEntity.velocity.multiply(deltaTime);
    baseEntity.position.addMut(movement);
    
    // Apply very light damping to velocity for realistic space physics
    const damping = 0.998; // Even lighter damping to preserve momentum better
    baseEntity.velocity.multiplyMut(damping);
  });
});
