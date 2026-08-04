import { defineConfig } from 'vite-plus';

export default defineConfig({
  pack: {
    entry: ['src/index.ts', 'src/cli.ts', 'src/rules/index.ts', 'src/presets/conventional.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  check: {
    oxlint: true,
    oxfmt: true,
  },
});
