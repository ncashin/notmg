import type { ServerWebSocket, WebSocketHandler } from "bun";
import invariant from "tiny-invariant";
import { POSITION_COMPONENT_DEF } from "../../core/collision";
import type { ClientMessage } from "../../core/socketMessage";
import { authenticate } from "./auth";
import {
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
} from "./ecsProvider";
import {
  handleAuthenticatedPlayerSetup,
  handleSocketClosePlayerCleanup,
  handleSocketOpenPlayerSetup,
  playerShoot,
} from "./entities/player";
import { createItem } from "./item";
import { addUpdateCallback } from "./update";

export const sendUpdatePacket = () => {
  for (const socket of connectedSockets) {
    socket.send(
      JSON.stringify({
        type: "update",
        packet: getECSUpdatePacket(),
      }),
    );
  }
};

export type WebSocketData = {
  entity: number;
  userID?: string; // Change to string since we use UUID
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

type MessageHandler = (
  websocket: ServerWebSocket<WebSocketData>,
  message: ClientMessage,
) => void | Promise<void>;
const websocketMessageHandlers: Record<string, MessageHandler> = {
  move: (websocket, message) => {
    invariant(message.type === "move");
    const position = getComponent(
      websocket.data.entity,
      POSITION_COMPONENT_DEF,
    );
    if (!position) return;
    position.x = message.x;
    position.y = message.y;
  },
  shoot: (websocket, message) => {
    invariant(message.type === "shoot");
    playerShoot(websocket.data.entity, message.targetX, message.targetY);
  },
  createItem: async (websocket, message) => {
    invariant(message.type === "createItem");
    if (!websocket.data.userID) {
      websocket.send("Must be authenticated to create items");
      return;
    }
    await createItem(websocket.data.userID, message.offsetX, message.offsetY);
  },
  auth: async (websocket, message) => {
    invariant(message.type === "auth");
    const user = await authenticate(message.token);

    if (!user) {
      websocket.send(
        JSON.stringify({
          type: "authfail",
        }),
      );
      return;
    }

    handleAuthenticatedPlayerSetup(websocket, message, user);

    websocket.send("Authentication succeeded");
  },
};

export const websocketHandler: WebSocketHandler<WebSocketData> = {
  open(websocket) {
    handleSocketOpenPlayerSetup(websocket);
    websocket.send(
      JSON.stringify({
        type: "initialization",
        playerEntity: websocket.data.entity,
        catchupPacket: getECSCatchupPacket(),
      }),
    );
    connectedSockets.push(websocket);
  },
  message(websocket, message) {
    if (typeof message !== "string") return;

    const parsedMessage = JSON.parse(message);
    if (parsedMessage && parsedMessage.type in websocketMessageHandlers) {
      const handler =
        websocketMessageHandlers[
          parsedMessage.type as keyof typeof websocketMessageHandlers
        ];
      handler(websocket, parsedMessage);
      return;
    }

    console.error("Unknown or invalid message:", parsedMessage);
  },
  close(websocket) {
    connectedSockets = connectedSockets.filter(
      (socket) => socket !== websocket,
    );
    handleSocketClosePlayerCleanup(websocket);
  },
};

addUpdateCallback(sendUpdatePacket);
