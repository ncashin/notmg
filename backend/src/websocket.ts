import type { ServerWebSocket, WebSocketHandler } from "bun";
import { BASE_ENTITY_COMPONENT_DEF, type ClientMessage } from "core";
import invariant from "tiny-invariant";
import {
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
} from "./ecsProvider";
import { handleCleanupPlayer, handleSetupPlayer } from "./player";
import { addUpdateCallback } from "./update";

export type WebSocketData = {
  entity: number;
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];
export const sendUpdatePacket = () => {
  const updatePacket = getECSUpdatePacket();
  for (const socket of connectedSockets) {
    socket.send(
      JSON.stringify({
        type: "update",
        packet: updatePacket,
      }),
    );
  }
};

type MessageHandler = (
  websocket: ServerWebSocket<WebSocketData>,
  message: ClientMessage,
) => void | Promise<void>;
const websocketMessageHandlers: Record<string, MessageHandler> = {
  move: (websocket, message) => {
    invariant(message.type === "move");
    const baseEntity = getComponent(
      websocket.data.entity,
      BASE_ENTITY_COMPONENT_DEF,
    );
    if (!baseEntity) return;
    baseEntity.x = message.x;
    baseEntity.y = message.y;
  },
  shoot: (_websocket, message) => {
    invariant(message.type === "shoot");
  },
};
export const websocketHandler: WebSocketHandler<WebSocketData> = {
  open(websocket) {
    handleSetupPlayer(websocket);
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
    handleCleanupPlayer(websocket);
  },
};

addUpdateCallback(sendUpdatePacket);
