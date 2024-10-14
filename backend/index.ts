import type { ServerWebSocket } from "bun";
import { update, type GameState } from "./src/game";
import { Hono } from "hono";
import { createBunWebSocket } from "hono/bun";
const { upgradeWebSocket, websocket } =
  createBunWebSocket<ServerWebSocket<WebSocketData>>();

let gameState = {
  playerEntities: [],
  entities: [],

  projectiles: [],
} as GameState;
const tick = () => {
  gameState = update(gameState);
  Object.values(openSockets).forEach((websocket) => {
    websocket.send(JSON.stringify(gameState));
  });
};
const TICK_RATE = 1000 / 60;
setInterval(tick, TICK_RATE);

const PUBLIC_DIRECTORY = "public";

const MAX_OPEN_SOCKET_COUNT = 4;
type WebSocketData = {
  playerIndex: number;
};
const openSockets: ServerWebSocket<WebSocketData>[] = [];

const app = new Hono();
app.get("/", (c) => {
  const file = Bun.file(PUBLIC_DIRECTORY + "/index.html");
  return new Response(file);
});
app.get("/assets/:filename", (c) => {
  const { filename } = c.req.param();
  const file = Bun.file(PUBLIC_DIRECTORY + "/assets/" + filename);
  return new Response(file);
});
app.get(
  "/websocket",
  upgradeWebSocket((c) => ({
    onMessage(event, websocket) {
      if (typeof event.data !== "string" || websocket.raw === undefined) return;

      const messageJSON = JSON.parse(event.data);
      gameState.playerEntities[websocket.raw.data.playerIndex] = {
        ...gameState.playerEntities[websocket.raw.data.playerIndex],
        ...messageJSON,
      };
    },

    onOpen(_, websocket) {
      if (websocket.raw === undefined) return;

      gameState.playerEntities.push({
        x: 0,
        y: 0,
      });
      openSockets.push(websocket.raw);
    },

    onClose(_, websocket) {
      if (websocket.raw === undefined) return;

      const deletedIndex = websocket.raw.data.playerIndex;
      gameState.playerEntities.splice(deletedIndex, 1);
      openSockets.splice(deletedIndex, 1);
      openSockets
        .filter((openSocket) => openSocket.data.playerIndex > deletedIndex)
        .forEach((openSocket) => {
          openSocket.data.playerIndex--;
        });
    },
  }))
);

Bun.serve({
  port: 3000,
  fetch: app.fetch,
});
