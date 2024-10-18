import { type ServerWebSocket } from "bun";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { update, type GameState } from "./src/game";
import type {
  ConnectEvent,
  DisconnectEvent,
  IntializeEvent,
  UpdateEvent,
} from "./src/socketEvent";

let gameState = {
  playerEntities: {},
  entities: {},

  projectiles: [],
} as GameState;

type WebSocketData = {
  id: string;
};
let openSockets: Record<string, ServerWebSocket<WebSocketData>> = {};

const tick = () => {
  gameState = update(gameState);
  Object.values(openSockets).forEach((websocket) => {
    websocket.send(
      JSON.stringify({
        type: "update",
        data: { gameState: gameState },
      } satisfies UpdateEvent)
    );
  });
};
const TICK_RATE = 1000 / 60;
setInterval(tick, TICK_RATE);

let playerIdCounter = 0;
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
        if (Object.values(openSockets).length >= MAX_OPEN_SOCKET_COUNT) {
          new Response("Upgrade failed", { status: 500 });
        }
        const upgradeSuccessful = server.upgrade<WebSocketData>(request, {
          data: { id: (playerIdCounter++).toString() },
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
      gameState.playerEntities[ws.data.id] = {
        ...gameState.playerEntities[ws.data.id],
        ...messageJSON,
      };
    },
    open(ws: ServerWebSocket<WebSocketData>) {
      Object.values(openSockets).forEach((websocket) => {
        websocket.send(
          JSON.stringify({
            type: "connect",
            data: { id: ws.data.id },
          } satisfies ConnectEvent)
        );
      });

      gameState.playerEntities[ws.data.id] = {
        x: 0,
        y: 0,
      };
      openSockets[ws.data.id] = ws;
      ws.send(
        JSON.stringify({
          type: "initialize",
          data: { gameState: gameState },
        } satisfies IntializeEvent)
      );
    },
    close(ws: ServerWebSocket<WebSocketData>, code, message) {
      Object.values(openSockets).forEach((websocket) => {
        websocket.send(
          JSON.stringify({
            type: "disconnect",
            data: { id: ws.data.id },
          } satisfies DisconnectEvent)
        );
      });
      delete openSockets[ws.data.id];
      delete gameState.playerEntities[ws.data.id];
    },
    drain(ws: ServerWebSocket<WebSocketData>) {},
  },
});

const sqlite = new Database("/app/data/db.sqlite", { create: true });
export const db = drizzle(sqlite);
