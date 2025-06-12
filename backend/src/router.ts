import type { Server } from "bun";
import { authRoutes } from "./auth";
import { createEntity } from "./ecsProvider";

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

export function fetchHandler(req: Request, server: Server) {
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
}
