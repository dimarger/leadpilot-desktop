import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      crypto: fileURLToPath(new URL("./node_modules/telegram/crypto/crypto.js", import.meta.url)),
      util: fileURLToPath(new URL("./node_modules/util/util.js", import.meta.url)),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
