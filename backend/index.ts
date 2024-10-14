import type { ServerWebSocket } from "bun";
import { createInitialGameState, update, type GameState } from "./src/game";

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

Bun.serve({
  port: 3000,
  async fetch(request: Request, server) {
    const pathname = new URL(request.url).pathname;
    if (pathname === "/websocket") {
      if (openSockets.length >= MAX_OPEN_SOCKET_COUNT) {
        new Response("Upgrade failed", { status: 500 });
      }
      const wasUpgradeSuccessful = server.upgrade<WebSocketData>(request, {
        data: { playerIndex: gameState.playerEntities.length },
      });
      if (wasUpgradeSuccessful) return;
      return new Response("Upgrade failed", { status: 500 });
    }

    if (pathname === "/") {
      const file = Bun.file(PUBLIC_DIRECTORY + "/index.html");
      return new Response(file);
    }
    const filePath = PUBLIC_DIRECTORY + pathname;
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
