---
name: committing-with-vite-plus-commitlint
description: Use when writing a git commit message in a repository that uses vite-plus-commitlint — read the enforced convention, write a compliant message, and self-correct from hook rejections
---

# Committing in a repository using Vite Plus Commitlint (`vite-plus-commitlint`)

`vite-plus-commitlint` validates commit messages against the repository's configured convention (defaulting to Conventional Commits) using the Vite Plus unified toolchain (`vite-plus`, `vite.config.ts`, `vp config`).

## 1. Detect whether the repository uses `vite-plus-commitlint`

Any of these indicates `vite-plus-commitlint` is active:

- A `commitlint()` plugin or `commitlint` block inside `vite.config.ts`
- `vite-plus-commitlint` in `package.json` dependencies
- `.vite-hooks/commit-msg` containing `vp exec vite-plus-commitlint` or `vp staged`

## 2. Read the enforced rules

```bash
vp exec vite-plus-commitlint --print-config json
```

Look at the `rules` object. Each rule is `[severity, applicability, value]`:

- **severity** — `0` = disabled, `1` = warning, `2` = error (only errors block commits)
- **applicability** — `"always"` = must hold, `"never"` = must not hold
- **value** — the rule's parameter

Key rules:

- `type-enum`: Allowed commit types (e.g. `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `ci`)
- `scope-enum`: Allowed scopes
- `subject-case`: Case restriction for subject
- `subject-full-stop`: Ensures no trailing period on header
- `header-max-length`: Max header length (default 100)

## 3. Write compliant commit message

Format: `type(scope): subject`

Example:

```
feat(parser): add support for inline issue references

Explain what changed and why in the body if needed.

Closes #123
```

## 4. Validate before committing

```bash
printf '%s' "feat(parser): add support for inline issue references" | vp exec vite-plus-commitlint
```

## 5. Self-correct when the commit hook rejects

- Read rule names in brackets from stdout/stderr.
- Fix ONLY the named violations.
- Never bypass the hook using `git commit --no-verify`.
