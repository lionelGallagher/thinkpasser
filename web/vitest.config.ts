import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
export default defineConfig({
  plugins: [vue()],
  test: {
    environment: "happy-dom",
    include: ["web/test/**/*.test.ts"],
    clearMocks: true,
    restoreMocks: true,
  },
});
