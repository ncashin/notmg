import { createEntity } from "./src/ecsProvider";
import { createBossEntity } from "./src/entities/boss";
import { fetchHandler } from "./src/router";
import { type WebSocketData, websocketHandler } from "./src/websocket";

Bun.serve<WebSocketData, undefined>({
  port: 3000,
  fetch: fetchHandler,
  websocket: websocketHandler,
});

const bossEntity = createEntity();
createBossEntity(bossEntity);
