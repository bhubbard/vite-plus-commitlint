import { describe, it, expect } from "vitest";
import { lintCommit } from "./rust.js";

describe("Rust-Backed Commit Linter", () => {
  it("passes valid conventional commit messages", () => {
    const validMessages = [
      "feat: add new button component",
      "fix(ui): resolve alignment issue on mobile",
      "docs: update README with installation steps",
      "refactor(core): simplify event handler logic",
      "test: add unit test for commit linter",
      "chore: release v1.0.0",
    ];

    for (const msg of validMessages) {
      const outcome = lintCommit(msg);
      expect(outcome.valid, `Expected "${msg}" to be valid`).toBe(true);
      expect(outcome.errors).toHaveLength(0);
    }
  });

  it("fails invalid conventional commit messages", () => {
    const invalidMessages = [
      { msg: "ADD NEW FEATURE", expectedRule: "type-empty" },
      { msg: "feat: Add New Feature", expectedRule: "subject-case" },
      { msg: "feat: add new feature.", expectedRule: "subject-full-stop" },
      { msg: "INVALID_TYPE: add feature", expectedRule: "type-enum" },
      { msg: "FEAT: add feature", expectedRule: "type-case" },
    ];

    for (const { msg, expectedRule } of invalidMessages) {
      const outcome = lintCommit(msg);
      expect(outcome.valid, `Expected "${msg}" to fail`).toBe(false);
      const hasError = outcome.errors.some((err) => err.name === expectedRule);
      expect(hasError, `Expected rule ${expectedRule} to fail for "${msg}"`).toBe(true);
    }
  });
});
