import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
  build: {
    target: "es2022",
    // React, MSAL et Motion représentent l'essentiel du bundle (~270 Ko gzip) : taille assumée.
    chunkSizeWarningLimit: 1000,
    rolldownOptions: {
      input: {
        main: resolve(import.meta.dirname, "index.html"),
        // Page « pont » MSAL v5 : reçoit la réponse d'authentification Entra ID.
        redirect: resolve(import.meta.dirname, "redirect.html"),
      },
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
  },
});
