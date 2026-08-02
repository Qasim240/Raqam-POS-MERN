import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), viteSingleFile()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    host: true,
    // Distinct fixed port so this project never collides with another dev server.
    // strictPort makes Vite fail loudly if the port is taken instead of silently
    // moving to the next free port (which is what made it "show the other project").
    port: 5180,
    strictPort: true,
    // Allow tunnelled hosts (ngrok, cloudflared, etc.) to reach the dev server.
    allowedHosts: [
      "localhost",
      ".ngrok-free.app",
      ".ngrok.io",
      ".ngrok.app",
      ".trycloudflare.com",
      ".loca.lt",
    ],
    // Proxy API calls to the local backend so the whole app is reachable through
    // a SINGLE tunnel (the frontend one). No separate backend tunnel needed,
    // and no CORS since the browser only ever talks to the frontend origin.
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 5180,
    strictPort: true,
  },
});
