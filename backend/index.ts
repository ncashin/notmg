import { type ServerWebSocket } from "bun";
import { integrateReceivedMessages, update } from "./src/gameState";
import { setGameState, useGameState } from "./src/projectile";
import {
  pushReceivedMessages,
  pushSocketStateMessage,
  useReceivedMessages,
  useSocketStateMessages,
  type UpdateEvent,
} from "./src/socketEvent";

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
      const messageJSON = JSON.parse(message);
      pushReceivedMessages({ ...messageJSON, websocketID: ws.data.id });
    },
    open(ws: ServerWebSocket<WebSocketData>) {
      _openSockets[ws.data.id] = ws;
      pushSocketStateMessage({ type: "open", websocketID: ws.data.id });
    },
    close(ws: ServerWebSocket<WebSocketData>, code, message) {
      delete _openSockets[ws.data.id];
      pushSocketStateMessage({ type: "close", websocketID: ws.data.id });
    },
    drain(ws: ServerWebSocket<WebSocketData>) {},
  },
});
