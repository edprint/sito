import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  server: { open: true },
  build: {
    target: "es2020",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        stampa: resolve(__dirname, "stampa.html"),
      },
    },
  },
});
