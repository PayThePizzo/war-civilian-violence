import { defineConfig } from "vite";

export default defineConfig({
  publicDir: ".generated",
  base: "./",
  optimizeDeps: {
    // maplibre-gl ships a web worker bundle Vite's esbuild-based optimizer can't rewrite correctly.
    exclude: ["maplibre-gl"],
  },
});
