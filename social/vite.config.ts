import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  publicDir: ".generated",
  // Default base ("/") is required (not web's "./"): posts live under nested
  // paths (instagram/post-01-temporal/index.html) and still need /data/* to
  // resolve to the site root, not a path relative to the current page.
  build: {
    rollupOptions: {
      input: {
        "post-01-temporal": fileURLToPath(
          new URL("instagram/post-01-temporal/index.html", import.meta.url),
        ),
        "post-02-actors": fileURLToPath(
          new URL("instagram/post-02-actors/index.html", import.meta.url),
        ),
        "x-post-01-before-after": fileURLToPath(
          new URL("x/post-01-before-after/index.html", import.meta.url),
        ),
        "x-post-02-geography": fileURLToPath(
          new URL("x/post-02-geography/index.html", import.meta.url),
        ),
      },
    },
  },
});
