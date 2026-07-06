import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// The backend runs on PORT (default 3001). In dev, Vite proxies the OAuth
// routes and the API to it so the browser only ever talks to one origin.
const BACKEND = process.env.BACKEND_ORIGIN ?? "http://localhost:3001";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: BACKEND, changeOrigin: true },
      "/api": { target: BACKEND, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
  },
});
