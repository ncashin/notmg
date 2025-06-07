import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      "/register": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
      "/websocket": {
        target: "ws://localhost:3000",
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
});
