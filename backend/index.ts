import { fetchHandler } from "./src/router";
import { type WebSocketData, websocketHandler } from "./src/websocket";
import "./src/asteroid"; // Import asteroid spawning to initialize asteroids on server start

Bun.serve<WebSocketData, undefined>({
  hostname: "0.0.0.0",
  port: 3000,
  fetch: fetchHandler,
  websocket: websocketHandler,
});
