import { type ServerWebSocket } from "bun";
import { update, type GameState } from "./src/game";

let gameState = {
  playerEntities: [],
  entities: [],

  projectiles: [],
} as GameState;

type WebSocketData = {
  playerIndex: number;
};
let openSockets: ServerWebSocket<WebSocketData>[] = [];

const tick = () => {
  gameState = update(gameState);
  Object.values(openSockets).forEach((websocket) => {
    websocket.send(JSON.stringify(gameState));
  });
};
const TICK_RATE = 1000 / 60;
setInterval(tick, TICK_RATE);

const MAX_OPEN_SOCKET_COUNT = 4;

const PUBLIC_DIRECTORY = "public";
Bun.serve({
  port: 3000,
  async fetch(request: Request, server) {
    const pathname = new URL(request.url).pathname;
    switch (pathname) {
      case "/":
        const html = Bun.file(PUBLIC_DIRECTORY + "/index.html");
        return new Response(html);
      case "/ws":
        console.log("HIT");
        if (openSockets.length >= MAX_OPEN_SOCKET_COUNT) {
          new Response("Upgrade failed", { status: 500 });
        }
        const upgradeSuccessful = server.upgrade<WebSocketData>(request, {
          data: { playerIndex: gameState.playerEntities.length },
        });
        if (upgradeSuccessful) return;
        return new Response("Upgrade failed", { status: 500 });

      default:
        const filePath = PUBLIC_DIRECTORY + pathname;
        const file = Bun.file(filePath);
        return new Response(file);
    }
  },
  websocket: {
    message(ws: ServerWebSocket<WebSocketData>, message) {
      if (typeof message !== "string") return;

      const messageJSON = JSON.parse(message);
      gameState.playerEntities[ws.data.playerIndex] = {
        ...gameState.playerEntities[ws.data.playerIndex],
        ...messageJSON,
      };
    },
    open(ws: ServerWebSocket<WebSocketData>) {
      gameState.playerEntities.push({
        x: 0,
        y: 0,
      });
      openSockets.push(ws);
    },
    close(websocket: ServerWebSocket<WebSocketData>, code, message) {
      const deletedIndex = websocket.data.playerIndex;
      gameState.playerEntities.splice(deletedIndex, 1);
      openSockets.splice(deletedIndex, 1);
      openSockets
        .filter((ws) => ws.data.playerIndex > deletedIndex)
        .forEach((ws) => ws.data.playerIndex--);
    },
    drain(websocket: ServerWebSocket<WebSocketData>) {},
  },
});

import { drizzle } from "drizzle-orm/bun-sqlite";
import { Database } from "bun:sqlite";

const sqlite = new Database("/app/data/db.sqlite", { create: true });
export const db = drizzle(sqlite);
