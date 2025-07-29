import { defineConfig } from "vite";
export default defineConfig({
  server: {
    proxy: {
      "/websocket": {
        target: "ws://localhost:3000",
        changeOrigin: true,
        ws: true,
        rewriteWsOrigin: true,
      },
    },
  },
});
