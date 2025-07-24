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

// Serve static files from frontend build
const serveStaticFile = async (path: string): Promise<Response | null> => {
  try {
    const filePath = `./public${path}`;
    const file = Bun.file(filePath);
    const exists = await file.exists();

    if (!exists) {
      return null;
    }

    return new Response(file);
  } catch (error) {
    return null;
  }
};

export async function fetchHandler(req: Request, server: Server) {
  const url = new URL(req.url);
  const path = url.pathname;


  if (path === "/") {
    const file = Bun.file("./public/index.html");
    return new Response(file);
  }

  const route = router[path];
  if (route) {
    const handler = route[req.method];
    if (handler) {
      return handler(req, server);
    }
    return new Response("Method not allowed", { status: 405 });
  }

  const staticResponse = await serveStaticFile(path);
  if (staticResponse) {
    return staticResponse;
  }

  return new Response("Not found", { status: 404 });
}
