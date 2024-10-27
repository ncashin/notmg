import { type ServerWebSocket } from "bun";
import { Database } from "bun:sqlite";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { integrateReceivedMessages, update, type GameState } from "./src/game";
import type {
  ClientMessage,
  IntializeEvent,
  UpdateEvent,
} from "./src/socketEvent";

let _gameState = {
  playerEntities: {},
  entities: {
    0: {
      type: "leviathan",
      x: 400,
      y: 400,
      health: 4,
      maxHealth: 5,
      tickCounter: 0,
    },
  },

  projectileIDCounter: 0,
  projectiles: {},
} satisfies GameState;
const useGameState = () => structuredClone(_gameState);
const setGameState = (newGameState: GameState) => {
  _gameState = structuredClone(newGameState);
};

let _receivedMessages: ClientMessage[] = [];
const useReceivedMessages = () => {
  const receivedMessagesClone = structuredClone(_receivedMessages);
  _receivedMessages = [] satisfies ClientMessage[];
  return receivedMessagesClone;
};
let _socketStateMessages: ClientSocketMessage[] = [];
const useSocketStateMessages = () => {
  const socketStateMessagesClone = structuredClone(_socketStateMessages);
  _socketStateMessages = [] satisfies ClientMessage[];
  return socketStateMessagesClone;
};
type WebSocketData = {
  id: string;
};
let _openSockets: Record<string, ServerWebSocket<WebSocketData>> = {};

const tick = () => {
  const gameState = useGameState();
  const receivedMessages = useReceivedMessages();
  const socketStateMessages = useSocketStateMessages();
  const messageGameState = integrateReceivedMessages(
    gameState,
    receivedMessages,
    socketStateMessages
  );
  const newGameState = update(messageGameState);
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

let _playerIDCounter = 0;
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
          data: { id: (_playerIDCounter++).toString() },
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
      _receivedMessages.push({ ...messageJSON, websocketID: ws.data.id });
    },
    open(ws: ServerWebSocket<WebSocketData>) {
      const gameState = useGameState();

      _openSockets[ws.data.id] = ws;

      ws.send(
        JSON.stringify({
          type: "initialize",
          data: { gameState: gameState, clientEntityID: ws.data.id },
        } satisfies IntializeEvent)
      );
      _socketStateMessages.push({ type: "open", websocketID: ws.data.id });
    },
    close(ws: ServerWebSocket<WebSocketData>, code, message) {
      delete _openSockets[ws.data.id];
      _socketStateMessages.push({ type: "close", websocketID: ws.data.id });
    },
    drain(ws: ServerWebSocket<WebSocketData>) {},
  },
});

const sqlite = new Database("/app/data/db.sqlite", { create: true });
export const db = drizzle(sqlite);
