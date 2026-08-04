import { defineConfig } from "vite-plus";

export default defineConfig({
  fmt: {
    ignorePatterns: ["dist/**", "target/**", "node_modules/**"],
  },
  lint: {
    ignorePatterns: ["dist/**", "target/**", "node_modules/**"],
  },
  pack: {
    entry: ["src/index.ts", "src/cli.ts"],
    format: ["esm"],
    dts: true,
    clean: true,
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  check: {
    oxlint: true,
    oxfmt: true,
  },
});
