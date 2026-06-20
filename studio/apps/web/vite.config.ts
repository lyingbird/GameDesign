import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const SERVER = "http://localhost:8787";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5273,
    proxy: {
      "/api/v2/ws": { target: SERVER.replace("http", "ws"), ws: true },
      "/api": { target: SERVER, changeOrigin: true },
    },
  },
});
