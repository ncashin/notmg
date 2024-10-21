import { type ServerWebSocket } from "bun";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { update, type GameState } from "./src/game";
import type { IntializeEvent, UpdateEvent } from "./src/socketEvent";

let _gameState = {
  playerEntities: {},
  entities: {
    0: {
      x: 400,
      y: 400,
      health: 4,
      maxHealth: 5,
    },
  },

  projectiles: [],
} satisfies GameState;
const useGameState = () => structuredClone(_gameState);
const setGameState = (newGameState: GameState) => {
  _gameState = structuredClone(newGameState);
};

type WebSocketData = {
  id: string;
};
let _openSockets: Record<string, ServerWebSocket<WebSocketData>> = {};

const tick = () => {
  const gameState = useGameState();
  const newGameState = update(gameState);
  setGameState(newGameState);

  Object.values(_openSockets).forEach((ws) => {
    ws.send(
      JSON.stringify({
        type: "update",
        data: { gameState: newGameState },
      } satisfies UpdateEvent)
    );
  });
};
const TICK_RATE = 1000 / 60;
setInterval(tick, TICK_RATE);

let playerIdCounter = 0;
const MAX_OPEN_SOCKET_COUNT = 1000;

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
        if (Object.values(_openSockets).length >= MAX_OPEN_SOCKET_COUNT) {
          return new Response("Upgrade failed", { status: 500 });
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
      const gameState = useGameState();
      const messageJSON = JSON.parse(message);

      switch (messageJSON.type) {
        case "ability":
          const messageEntity = gameState.entities[messageJSON.data.entityID];
          setGameState({
            ...gameState,
            entities: {
              ...gameState.entities,
              [messageJSON.data.entityID]: {
                ...messageEntity,
                health: messageEntity.health - 1,
              },
            },
          });
          break;
        case "update":
          setGameState({
            ...gameState,
            playerEntities: {
              ...gameState.playerEntities,
              [ws.data.id]: {
                ...gameState.playerEntities[ws.data.id],
                ...messageJSON.data.clientUpdate,
              },
            },
          });
          break;
      }
    },
    open(ws: ServerWebSocket<WebSocketData>) {
      const gameState = useGameState();
      setGameState({
        ...gameState,
        playerEntities: {
          ...gameState.playerEntities,
          [ws.data.id]: {
            x: 0,
            y: 0,
          },
        },
      });

      _openSockets[ws.data.id] = ws;

      ws.send(
        JSON.stringify({
          type: "initialize",
          data: { gameState: gameState, clientEntityID: ws.data.id },
        } satisfies IntializeEvent)
      );
    },
    close(ws: ServerWebSocket<WebSocketData>, code, message) {
      delete _openSockets[ws.data.id];

      const gameState = useGameState();
      setGameState({
        ...gameState,
        playerEntities: Object.fromEntries(
          Object.entries(gameState.playerEntities).filter(
            ([key, value]) => key !== ws.data.id
          )
        ),
      });
    },
    drain(ws: ServerWebSocket<WebSocketData>) {},
  },
});

const sqlite = new Database("/app/data/db.sqlite", { create: true });
export const db = drizzle(sqlite);
