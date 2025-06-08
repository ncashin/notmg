import type { Server, ServerWebSocket } from "bun";
import { eq } from "drizzle-orm";
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
};

// Router type definition
type RouteHandler = (
  req: Request,
  server: Server,
) => Promise<Response> | Response;
type Router = {
  [key: string]: {
    [method: string]: RouteHandler;
  };
};

const beginSession = () => {
  const sessionID = crypto.randomUUID();

  return sessionID;
};
const authenticateSession = () => {};

// Route handlers
const handleRegister: RouteHandler = async (req) => {
  return req.json().then(async (body) => {
    const { username, password } = body;

    if (!username || !password) {
      return new Response("Name and password are required", {
        status: 400,
      });
    }

    try {
      // Hash the password using Bun's built-in password hashing
      const hashedPassword = await Bun.password.hash(password);

      const result = await database
        .insert(users)
        .values({
          username,
          password: hashedPassword,
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
};

const handleLogin: RouteHandler = async (req) => {
  return req.json().then(async (body) => {
    const { username, password } = body;

    if (!username || !password) {
      return new Response("Username and password are required", {
        status: 400,
      });
    }

    try {
      // Find user in database
      const user = await database
        .select()
        .from(users)
        .where(eq(users.username, username))
        .limit(1)
        .then((rows) => rows[0]);

      if (!user) {
        return new Response("Invalid username or password", {
          status: 401,
        });
      }

      // Verify password
      const isValid = await Bun.password.verify(password, user.password);

      if (!isValid) {
        return new Response("Invalid username or password", {
          status: 401,
        });
      }

      return new Response(JSON.stringify({ message: "Login successful" }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Login error:", error);
      return new Response("Login failed", { status: 500 });
    }
  });
};

const handleWebSocket: RouteHandler = (req, server) => {
  const sessionID = beginSession();
  const upgradeResult = server.upgrade(req, {
    data: { entity: createEntity(), sessionID },
    headers: {
      "Set-Cookie": `sessionID=${sessionID}; Path=/; HttpOnly; SameSite=Strict`,
    },
  });
  if (!upgradeResult) {
    return new Response("WebSocket upgrade failed", { status: 500 });
  }
  return new Response();
};

// Router configuration
const router: Router = {
  "/register": {
    POST: handleRegister,
  },
  "/login": {
    POST: handleLogin,
  },
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
      connectedSockets = connectedSockets.filter(
        (socket) => socket !== websocket,
      );
      destroyEntity(websocket.data.entity);
    },
  },
});

// Create initial world entities
createBossEntity(createEntity());
