const { stat } = require("fs").promises;

console.log("Hello via Bun!");

const PUBLIC_DIR = "public";

Bun.serve({
  port: 3000,
  async fetch(req: Request) {
    if (new URL(req.url).pathname == "/") {
      const file = Bun.file(PUBLIC_DIR + "/index.html");
      return new Response(file);
    }
    const filePath = PUBLIC_DIR + new URL(req.url).pathname;
    const file = Bun.file(filePath);
    return new Response(file);
  },
});
