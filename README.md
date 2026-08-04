# vite-plus-commitlint ⚡

> Unified Commitlint plugin and CLI for [Vite+](https://viteplus.dev) toolchain. Zero configuration, built-in Conventional Commits ruleset, native Git hooks, and dev server middleware.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Vite+](https://img.shields.io/badge/Toolchain-Vite%2B-7474FB)](https://viteplus.dev)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D22.12.0-brightgreen)](https://nodejs.org)

---

## Features

- 🚀 **Zero-Config Conventional Commits**: Comes pre-configured with conventional commit rules (`feat`, `fix`, `docs`, `refactor`, `chore`, etc.).
- 🛠 **Unified Package**: Replaces legacy 30+ `@commitlint/*` packages with a single, high-performance ESM library.
- ⚡ **Vite+ Native Integration**: Works directly in `vite.config.ts` via `defineConfig` from `vite-plus`.
- 🪝 **Git Hook Dispatcher**: Integrates seamlessly with Vite+ native hooks (`.vite-hooks/commit-msg`) and `vp staged`.
- 💻 **CLI Parity**: Full feature parity with standard commitlint flags (`--edit`, `--from`, `--to`, `--last`, `--strict`, `--print-config`).
- 🌐 **Dev Server Endpoint**: Exposes real-time commit message validation middleware (`POST /__commitlint/validate`) for IDE extensions and UIs.

---

## Installation

Install using Vite+:

```bash
vp add -D vite-plus-commitlint
```

---

## Quick Start

### 1. Register Plugin in `vite.config.ts`

```ts
import { defineConfig } from 'vite-plus';
import { commitlint } from 'vite-plus-commitlint';

export default defineConfig({
  plugins: [
    commitlint({
      // Zero-config defaults to conventional commits rules!
      // Optional overrides:
      rules: {
        'header-max-length': [2, 'always', 100],
      },
    }),
  ],
  staged: {
    'COMMIT_EDITMSG': 'vp exec vite-plus-commitlint --edit',
  },
});
```

### 2. Configure Git Commit Hook

Set up Vite+ Git hook dispatcher:

```bash
vp config
```

In `.vite-hooks/commit-msg`:

```sh
#!/bin/sh
vp exec vite-plus-commitlint --edit "$1"
```

---

## CLI Usage

Run via `vp exec` or `vpx`:

```bash
# Lint last commit message file
vp exec vite-plus-commitlint --edit

# Print resolved configuration as JSON
vp exec vite-plus-commitlint --print-config json

# Lint commit range from git history
vp exec vite-plus-commitlint --from HEAD~3 --to HEAD

# Run in strict mode (exit code 2 for warnings, 3 for errors)
vp exec vite-plus-commitlint --edit --strict
```

---

## Programmatic API

```ts
import { lintCommit, parseCommit, conventionalPreset, rules } from 'vite-plus-commitlint';

// Parse a commit message
const parsed = parseCommit('feat(ui): add new button component');
console.log(parsed.type); // 'feat'
console.log(parsed.scope); // 'ui'

// Lint a commit message against rules
const report = await lintCommit('fix: resolve alignment', conventionalPreset.rules);
console.log(report.valid); // true
```

---

## License

[MIT](LICENSE) © Brandon Hubbard
