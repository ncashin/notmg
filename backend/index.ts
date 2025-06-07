import type { ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import { POSITION_COMPONENT_DEF } from "../core/collision";
import { PLAYER_COMPONENT_DEF } from "../core/player";
import type { ClientMessage } from "../core/socketMessage";
import { users } from "./schema";
import { database } from "./src/database";
import {
  createEntity,
  destroyEntity,
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
} from "./src/ecsProvider";
import { createBossEntity } from "./src/entities/boss";
import { createPlayerEntity, playerShoot } from "./src/entities/player";

type WebSocketData = {
  entity: number;
  sessionID: string;
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
    const url = new URL(req.url);
    console.log(url.pathname);
    // Handle registration endpoint
    if (url.pathname === "/register" && req.method === "POST") {
      console.log("WHAT THE HELL");
      return req.json().then(async (body) => {
        const { username, password } = body;
        console.log(username, password);

        if (!username || !password) {
          return new Response("Name and password are required", {
            status: 400,
          });
        }

        try {
          // TODO: Add proper password hashing
          const result = await database
            .insert(users)
            .values({
              username,
              password, // Note: In production, this should be hashed
            })
            .returning();

          // Find existing websocket connection for this session
          const sessionID = req.headers
            .get("cookie")
            ?.split("sessionID=")[1]
            ?.split(";")[0];
          const existingSocket = connectedSockets.find(
            (socket) => socket.data.sessionID === sessionID,
          );
          if (existingSocket) {
            const playerComponent = getComponent(
              existingSocket.data.entity,
              PLAYER_COMPONENT_DEF,
            );
            if (playerComponent) {
              playerComponent.username = username;
            }
          }

          return new Response("Registration successful", {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("Registration error:", error);
          return new Response("Registration failed", { status: 500 });
        }
      });
    }

    // Handle WebSocket upgrade
    const sessionID = crypto.randomUUID();
    const upgradeResult = server.upgrade(req, {
      data: { entity: createEntity(), sessionID },
      headers: {
        "Set-Cookie": `sessionID=${sessionID}; Path=/; HttpOnly; SameSite=Strict`,
      },
    });
    if (!upgradeResult) {
      return new Response("WebSocket upgrade failed", { status: 500 });
    }
    return;
  },
  websocket: {
    open(websocket) {
      websocket.send(
        JSON.stringify({
          type: "initialization",
          playerEntity: websocket.data.entity,
          catchupPacket: getECSCatchupPacket(),
        }),
      );
      connectedSockets.push(websocket);
      createPlayerEntity(
        websocket.data.entity,
        `Guest ${websocket.data.entity}`,
      );
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
