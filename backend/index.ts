import type { ServerWebSocket } from "bun";
import { createInitialGameState, update, type GameState } from "./src/game";

const PUBLIC_DIR = "public";

type WebSocketData = {
  playerIndex: number;
};
const MAX_OPEN_SOCKET_COUNT = 4;

const openSockets: ServerWebSocket<WebSocketData>[] = [];

let gameState = {
  playerEntities: [],
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
const TICK_RATE = 100;
setInterval(tick, TICK_RATE);

Bun.serve({
  port: 3000,
  async fetch(request: Request, server) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/websocket") {
      if (openSockets.length >= MAX_OPEN_SOCKET_COUNT)
        new Response("Upgrade failed", { status: 500 });

      const upgradeSuccessful = server.upgrade<WebSocketData>(request, {
        data: { playerIndex: gameState.playerEntities.length },
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
      gameState.playerEntities[websocket.data.playerIndex] = {
        ...gameState.playerEntities[websocket.data.playerIndex],
        ...messageJSON,
      };
    },
    open(websocket: ServerWebSocket<WebSocketData>) {
      gameState.playerEntities.push({
        x: 0,
        y: 0,
      });
      openSockets.push(websocket);
    },
    close(websocket: ServerWebSocket<WebSocketData>, code, message) {
      const deletedIndex = websocket.data.playerIndex;
      gameState.playerEntities.splice(deletedIndex, 1);
      openSockets.splice(deletedIndex, 1);
      for (var openSocket of openSockets) {
        if (openSocket.data.playerIndex > deletedIndex) {
          openSocket.data.playerIndex--;
        }
      }
    }, // a socket is closed
    drain(websocket: ServerWebSocket<WebSocketData>) {}, // the socket is ready to receive more data
  },
});
