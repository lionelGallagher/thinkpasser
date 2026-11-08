import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
export default defineConfig({
  root,
  plugins: [vue()],
  server: { host: "127.0.0.1", port: 5180, strictPort: true },
  build: {
    outDir: ".preview/dist",
    emptyOutDir: true,
    rolldownOptions: {
      input: {
        web: root + "/web/index.html",
        admin: root + "/admin/index.html",
        supplier: root + "/supplier/index.html",
        client: root + "/client/preview/index.html",
      },
    },
  },
});
