import type { ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import { POSITION_COMPONENT_DEF } from "../core/collision";
import type { ClientMessage } from "../core/socketMessage";
import {
  createEntity,
  destroyEntity,
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
} from "./ecsProvider";
import { createBossEntity } from "./entities/boss";
import { createPlayerEntity, playerShoot } from "./entities/player";

type WebSocketData = {
  entity: number;
};
const connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];

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

const clientMessageHandlers = {
  move: (websocket: ServerWebSocket<WebSocketData>, message: ClientMessage) => {
    invariant(message.type === "move");
    const position = getComponent(
      websocket.data.entity,
      POSITION_COMPONENT_DEF,
    );
    if (!position) return;
    position.x = message.x;
    position.y = message.y;
  },
  shoot: (
    websocket: ServerWebSocket<WebSocketData>,
    message: ClientMessage,
  ) => {
    invariant(message.type === "shoot");
    playerShoot(websocket.data.entity, message.targetX, message.targetY);
  },
  /* interact: (
    websocket: ServerWebSocket<WebSocketData>,
    message: ClientMessage,
  ) => {
    invariant(message.type === "interact");
    handleInteraction(websocket.data.entity, message.x, message.y);
  }, */
};

Bun.serve<WebSocketData, undefined>({
  port: 3000,
  fetch(req, server) {
    if (
      server.upgrade(req, {
        data: {
          entity: createEntity(),
        },
      })
    ) {
      return;
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(websocket) {
      console.log(getECSCatchupPacket());
      websocket.send(
        JSON.stringify({
          type: "initialization",
          playerEntity: websocket.data.entity,
          catchupPacket: getECSCatchupPacket(),
        }),
      );
      connectedSockets.push(websocket);
      createPlayerEntity(websocket.data.entity);
    },
    message(websocket, message) {
      if (typeof message !== "string") return;

      const parsedMessage = JSON.parse(message);
      const clientMessage = parsedMessage;
      if (clientMessage && clientMessage.type in clientMessageHandlers) {
        const handler =
          clientMessageHandlers[
            clientMessage.type as keyof typeof clientMessageHandlers
          ];
        handler(websocket, clientMessage);
        return;
      }

      console.error("Unknown or invalid message:", parsedMessage);
    },
    close(websocket) {
      const index = connectedSockets.indexOf(websocket);
      if (index > -1) {
        connectedSockets.splice(index, 1);
      }
      destroyEntity(websocket.data.entity);
    },
  },
});

// Create initial world entities
createBossEntity(createEntity());
