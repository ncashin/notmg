import type { ServerWebSocket } from "bun";
import { createInitialGameState, update, type GameState } from "./src/game";

const PUBLIC_DIR = "public";

type WebSocketData = {
  id: number;
};
const MAX_OPEN_SOCKET_COUNT = 4;
let openSocketCount = 0;
let socketIDCounter = 0;
const openSockets: Record<string, ServerWebSocket<WebSocketData>> = {};

let gameState = {
  playerEntities: {},
  entities: [],

  projectiles: [],
} as GameState;
let previousGameState;
const tick = () => {
  previousGameState = structuredClone(gameState);
  const updatedGameState = update(gameState);
  Object.values(openSockets).forEach((websocket) => {
    websocket.send(JSON.stringify(updatedGameState));
  });
};
const TICK_RATE = 1000 / 60;
setInterval(tick, TICK_RATE);

Bun.serve({
  port: 3000,
  async fetch(request: Request, server) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/websocket") {
      if (openSocketCount === MAX_OPEN_SOCKET_COUNT)
        new Response("Upgrade failed", { status: 500 });

      const upgradeSuccessful = server.upgrade<WebSocketData>(request, {
        data: { id: socketIDCounter++ },
      });
      if (upgradeSuccessful) return;
      return new Response("Upgrade failed", { status: 500 });
    }

    if (pathname === "/") {
      const file = Bun.file(PUBLIC_DIR + "/index.html");
      return new Response(file);
    }
    const filePath = PUBLIC_DIR + pathname;
    const file = Bun.file(filePath);
    return new Response(file);
  },
  websocket: {
    message(websocket: ServerWebSocket<WebSocketData>, message) {
      if (typeof message !== "string") return;

      const messageJSON = JSON.parse(message);
      gameState.playerEntities[websocket.data.id] = {
        ...gameState.playerEntities[websocket.data.id],
        ...messageJSON,
      };
    },
    open(websocket: ServerWebSocket<WebSocketData>) {
      openSocketCount++;
      openSockets[websocket.data.id] = websocket;
      gameState.playerEntities[websocket.data.id] = {
        id: websocket.data.id,
        x: 0,
        y: 0,
      };
    },
    close(websocket: ServerWebSocket<WebSocketData>, code, message) {
      delete gameState.playerEntities[websocket.data.id];
      delete openSockets[websocket.data.id];
      openSocketCount--;
    }, // a socket is closed
    drain(websocket: ServerWebSocket<WebSocketData>) {}, // the socket is ready to receive more data
  },
});
