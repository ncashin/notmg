console.log("Hello via Bun!");

const server = Bun.serve({
  port: 3000,
  fetch(req, server) {
    if (server.upgrade(req)) {
      return;
    }
    return new Response("Upgrade failed", { status: 500 });
  },
  websocket: {
    open(ws) {
      console.log("Client connected");
    },
    message(ws, message) {
      console.log("Received:", message);
      ws.send(message);
    },
    close(ws) {
      console.log("Client disconnected");
    },
  },
});

console.log(`WebSocket server listening on port ${server.port}`);
