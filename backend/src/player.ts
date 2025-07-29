import type { ServerWebSocket } from "bun";
import { BASE_ENTITY_COMPONENT_DEF, PLAYER_COMPONENT_DEF } from "core";
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
  runQuery([BASE_ENTITY_COMPONENT_DEF], (_entity, [baseEntity]) => {
    baseEntity.x += baseEntity.vx;
    baseEntity.y += baseEntity.vy;
  });
});
