import type { Server, ServerWebSocket } from "bun";
import invariant from "tiny-invariant";
import { POSITION_COMPONENT_DEF } from "../core/collision";
import { PLAYER_COMPONENT_DEF } from "../core/player";
import type { ClientMessage } from "../core/socketMessage";
import { authRoutes, authenticate } from "./src/auth";
import {
  createEntity,
  destroyEntity,
  getComponent,
  getECSCatchupPacket,
  getECSUpdatePacket,
  queryComponents,
} from "./src/ecsProvider";
import { BOSS_COMPONENT_DEF, createBossEntity } from "./src/entities/boss";
import { createPlayerEntity, playerShoot } from "./src/entities/player";

type WebSocketData = {
  entity: number;
  userID?: string; // Change to string since we use UUID
};
let connectedSockets: Array<ServerWebSocket<WebSocketData>> = [];
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

const websocketMessageHandlers = {
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
  auth: async (
    websocket: ServerWebSocket<WebSocketData>,
    message: ClientMessage,
  ) => {
    invariant(message.type === "auth");
    const user = await authenticate(message.token);

    if (!user) {
      return;
    }

    const player = getComponent(websocket.data.entity, PLAYER_COMPONENT_DEF);
    if (player) {
      player.username = user.username;
    }
    websocket.data.userID = user.id;

    websocket.send("Authentication succeeded");
  },
};

// Router type definition
export type RouteHandler = (
  req: Request,
  server: Server,
) => Promise<Response> | Response;
type Router = {
  [key: string]: {
    [method: string]: RouteHandler;
  };
};

const handleWebSocket: RouteHandler = async (req, server) => {
  const upgradeResult = server.upgrade(req, {
    data: {
      entity: createEntity(),
    },
  });

  if (!upgradeResult) {
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
  return new Response();
};

const router: Router = {
  ...authRoutes,
  "/websocket": {
    GET: handleWebSocket,
  },
};
Bun.serve<WebSocketData, undefined>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);
    const route = router[url.pathname];

    if (!route) {
      return new Response("Not found", { status: 404 });
    }

    const handler = route[req.method];
    if (!handler) {
      return new Response("Method not allowed", { status: 405 });
    }

    return handler(req, server);
  },
  websocket: {
    open(websocket) {
      createPlayerEntity(websocket.data.entity);
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
      const clientMessage = parsedMessage;
      if (clientMessage && clientMessage.type in websocketMessageHandlers) {
        const handler =
          websocketMessageHandlers[
            clientMessage.type as keyof typeof websocketMessageHandlers
          ];
        handler(websocket, clientMessage);
        return;
      }

      console.error("Unknown or invalid message:", parsedMessage);
    },
    close(websocket) {
      connectedSockets = connectedSockets.filter(
        (socket) => socket !== websocket,
      );
      destroyEntity(websocket.data.entity);
    },
  },
});

// Create initial world entities and periodically check for boss
const checkBossInterval = setInterval(() => {
  const bossEntities = queryComponents([BOSS_COMPONENT_DEF]);
  if (Object.keys(bossEntities).length === 0) {
    createBossEntity(createEntity());
  }
}, 30000); // Check every 30 seconds

// Initial check
const initialBossEntities = queryComponents([BOSS_COMPONENT_DEF]);
if (Object.keys(initialBossEntities).length === 0) {
  createBossEntity(createEntity());
}
